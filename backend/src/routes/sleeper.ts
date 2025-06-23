import express from 'express';
import { PrismaClient } from '@prisma/client';
import { cleanupDemoData } from '../scripts/cleanup-demo-data';

const router = express.Router();
const prisma = new PrismaClient();

// Sync user's Sleeper data
router.post('/sync', async (req, res) => {
  try {
    const { userId, sleeperUsername } = req.body;

    // Find the user by email or ID
    const user = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: userId },
          { id: userId }
        ]
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    if (!userId || !sleeperUsername) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'User ID and Sleeper username are required',
        },
      });
    }

    // Call Sleeper MCP to get user data
    const mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:3001';
    const mcpResponse = await fetch(`${mcpServerUrl}/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'sleeper.getUserByUsername',
        params: {
          username: sleeperUsername,
        },
        id: 1,
      }),
    });

    if (!mcpResponse.ok) {
      console.error('MCP connection failed:', {
        url: `${mcpServerUrl}/mcp`,
        status: mcpResponse.status,
        statusText: mcpResponse.statusText,
      });
      return res.status(500).json({
        success: false,
        error: {
          code: 'MCP_ERROR',
          message: `Failed to connect to Sleeper MCP server at ${mcpServerUrl}. Status: ${mcpResponse.status}`,
        },
      });
    }

    const mcpResult = await mcpResponse.json() as any;
    
    if (!mcpResult.result) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Sleeper user not found',
        },
      });
    }

    const sleeperUser = mcpResult.result;
    const sleeperUserId = sleeperUser.user_id;

    // Get user's leagues directly from Sleeper API (fallback since MCP has issues)
    // Try both 2024 and 2025 seasons
    let leagues = [];
    
    for (const season of ['2024', '2025']) {
      const leaguesResponse = await fetch(`https://api.sleeper.app/v1/user/${sleeperUserId}/leagues/nfl/${season}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (leaguesResponse.ok) {
        const seasonLeagues = await leaguesResponse.json() as any[];
        if (seasonLeagues && Array.isArray(seasonLeagues) && seasonLeagues.length > 0) {
          leagues.push(...seasonLeagues);
        }
      } else {
        console.log(`No leagues found for ${season} season for user ${sleeperUserId}`);
      }
    }

    // Update user with Sleeper data
    let updatedUser;
    try {
      updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          sleeperUserId: sleeperUserId,
        },
      });
    } catch (dbError) {
      console.log('Fallback: updating user without sleeperUsername field');
      // Fallback update without sleeperUsername (for database compatibility)
      updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          sleeperUserId: sleeperUserId,
        },
      });
    }

    // Store leagues in database
    for (const league of leagues) {
      try {
        await prisma.league.upsert({
          where: { 
            sleeperLeagueId: league.league_id 
          },
          update: {
            name: league.name,
            season: parseInt(league.season) || 2024,
            totalRosters: league.total_rosters,
            scoringFormat: league.scoring_settings?.rec ? 'ppr' : 'standard',
            settings: league.settings || {},
          },
          create: {
            sleeperLeagueId: league.league_id,
            name: league.name,
            season: parseInt(league.season) || 2024,
            totalRosters: league.total_rosters,
            scoringFormat: league.scoring_settings?.rec ? 'ppr' : 'standard',
            settings: league.settings || {},
          },
        });
      } catch (leagueError) {
        console.error(`Error upserting league ${league.league_id}:`, leagueError);
        // Try without status field as fallback for database schema issues
        try {
          await prisma.league.upsert({
            where: { 
              sleeperLeagueId: league.league_id 
            },
            update: {
              name: league.name,
              season: parseInt(league.season) || 2024,
              totalRosters: league.total_rosters,
            scoringFormat: league.scoring_settings?.rec ? 'ppr' : 'standard',
            settings: league.settings || {},
            },
            create: {
              sleeperLeagueId: league.league_id,
              name: league.name,
              season: parseInt(league.season) || 2024,
              totalRosters: league.total_rosters,
            scoringFormat: league.scoring_settings?.rec ? 'ppr' : 'standard',
            settings: league.settings || {},
            },
          });
          console.log(`League ${league.league_id} saved without status field (fallback)`);
        } catch (fallbackError) {
          console.error(`Second fallback error for league ${league.league_id}:`, fallbackError);
          // Third fallback: try without scoring_format field (for older database schemas)
          try {
            await prisma.league.upsert({
              where: { 
                sleeperLeagueId: league.league_id 
              },
              update: {
                name: league.name,
                season: parseInt(league.season) || 2024,
                totalRosters: league.total_rosters,
                scoringFormat: 'standard', // Default fallback value
                settings: league.settings || {},
              },
              create: {
                sleeperLeagueId: league.league_id,
                name: league.name,
                season: parseInt(league.season) || 2024,
                totalRosters: league.total_rosters,
                scoringFormat: 'standard', // Default fallback value
                settings: league.settings || {},
              },
            });
            console.log(`League ${league.league_id} saved without scoring_format field (final fallback)`);
          } catch (finalError) {
            console.error(`Failed to save league ${league.league_id} with all fallbacks:`, finalError);
            continue; // Skip this league and continue with others
          }
        }
      }

      // Find the created league by sleeperLeagueId
      const createdLeague = await prisma.league.findUnique({
        where: { sleeperLeagueId: league.league_id },
      });

      if (createdLeague) {
        // Create user-league relationship
        try {
          await prisma.userLeague.upsert({
            where: {
              userId_leagueId: {
                userId: user.id,
                leagueId: createdLeague.id,
              },
            },
            update: {
              role: 'member',
              sleeperRosterId: league.roster_id || '',
            },
            create: {
              userId: user.id,
              leagueId: createdLeague.id,
              role: 'member',
              sleeperRosterId: league.roster_id || '',
            },
          });
        } catch (userLeagueError) {
          console.error(`Error creating user-league relationship for league ${league.league_id}:`, userLeagueError);
          // Continue with other leagues even if this relationship fails
        }
      }
    }

    // Count successful league saves
    const savedLeagues = [];
    for (const league of leagues) {
      try {
        const existingLeague = await prisma.league.findUnique({
          where: { sleeperLeagueId: league.league_id }
        });
        if (existingLeague) {
          savedLeagues.push(existingLeague);
        }
      } catch (error) {
        console.log(`Could not verify league ${league.league_id}:`, error);
      }
    }

    res.json({
      success: true,
      data: {
        user: updatedUser,
        leagues: leagues,
        leaguesSyncStatus: {
          attempted: leagues.length,
          savedToDatabase: savedLeagues.length,
          savedLeagues: savedLeagues
        }
      },
    });

  } catch (error) {
    console.error('Error syncing Sleeper data:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to sync Sleeper data',
      },
    });
  }
});

// Get user's leagues
router.get('/user/:sleeperUserId/leagues', async (req, res) => {
  try {
    const { sleeperUserId } = req.params;

    // Get leagues directly from Sleeper API for both seasons
    let leagues = [];
    
    for (const season of ['2024', '2025']) {
      const leaguesResponse = await fetch(`https://api.sleeper.app/v1/user/${sleeperUserId}/leagues/nfl/${season}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (leaguesResponse.ok) {
        const seasonLeagues = await leaguesResponse.json() as any[];
        if (seasonLeagues && Array.isArray(seasonLeagues) && seasonLeagues.length > 0) {
          leagues.push(...seasonLeagues);
        }
      } else {
        console.log(`No leagues found for ${season} season for user ${sleeperUserId}`);
      }
    }

    res.json({
      success: true,
      data: leagues,
    });

  } catch (error) {
    console.error('Error fetching user leagues:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch user leagues',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// Cleanup demo data endpoint
router.post('/cleanup-demo-data', async (req, res) => {
  try {
    console.log('🧹 Cleanup demo data requested');
    await cleanupDemoData();
    
    res.json({
      success: true,
      message: 'Demo data cleaned up successfully',
    });
  } catch (error) {
    console.error('Error cleaning up demo data:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CLEANUP_ERROR',
        message: 'Failed to cleanup demo data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

export { router as sleeperRoutes };