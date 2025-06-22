import express from 'express';
import { PrismaClient } from '@prisma/client';

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
    const mcpResponse = await fetch(`${mcpServerUrl}/tools/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'sleeper.getUserByUsername',
        arguments: {
          username: sleeperUsername,
        },
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
    
    if (!mcpResult.content) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Sleeper user not found',
        },
      });
    }

    const sleeperUser = JSON.parse(mcpResult.content[0].text);
    const sleeperUserId = sleeperUser.user_id;

    // Get user's leagues from Sleeper
    const leaguesResponse = await fetch(`${mcpServerUrl}/tools/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'sleeper.getLeaguesForUser',
        arguments: {
          user_id: sleeperUserId,
          season: '2024',
        },
      }),
    });

    let leagues = [];
    if (leaguesResponse.ok) {
      const leaguesResult = await leaguesResponse.json() as any;
      if (leaguesResult.content) {
        leagues = JSON.parse(leaguesResult.content[0].text);
      }
    }

    // Update user with Sleeper data (temporarily without sleeperUsername until migration works)
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        sleeperUserId: sleeperUserId,
      },
    });

    // Store leagues in database
    for (const league of leagues) {
      await prisma.league.upsert({
        where: { 
          sleeperLeagueId: league.league_id 
        },
        update: {
          name: league.name,
          season: league.season,
          totalRosters: league.total_rosters,
          status: league.status,
          settings: league.settings || {},
        },
        create: {
          sleeperLeagueId: league.league_id,
          name: league.name,
          season: league.season,
          totalRosters: league.total_rosters,
          status: league.status,
          settings: league.settings || {},
        },
      });

      // Find the created league by sleeperLeagueId
      const createdLeague = await prisma.league.findUnique({
        where: { sleeperLeagueId: league.league_id },
      });

      if (createdLeague) {
        // Create user-league relationship
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
      }
    }

    res.json({
      success: true,
      data: {
        user: updatedUser,
        leagues: leagues,
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

    // Get leagues from Sleeper MCP
    const mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:3001';
    const leaguesResponse = await fetch(`${mcpServerUrl}/tools/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'sleeper.getLeaguesForUser',
        arguments: {
          user_id: sleeperUserId,
          season: '2024',
        },
      }),
    });

    if (!leaguesResponse.ok) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'MCP_ERROR',
          message: 'Failed to fetch leagues from Sleeper',
        },
      });
    }

    const leaguesResult = await leaguesResponse.json() as any;
    let leagues = [];
    
    if (leaguesResult.content) {
      leagues = JSON.parse(leaguesResult.content[0].text);
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
      },
    });
  }
});

export { router as sleeperRoutes };