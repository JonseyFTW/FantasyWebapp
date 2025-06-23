import express from 'express';
import { PrismaClient } from '@prisma/client';
import { leagueService } from '../services/league-service';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/leagues/:leagueId/details
// Returns comprehensive league data: info + rosters + users
router.get('/:leagueId/details', async (req, res) => {
  try {
    const { leagueId } = req.params;

    // Find the league in our database to get the Sleeper league ID
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
    });

    if (!league) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LEAGUE_NOT_FOUND',
          message: 'League not found',
        },
      });
    }

    const leagueDetails = await leagueService.getLeagueDetails(league.sleeperLeagueId);

    res.json({
      success: true,
      data: leagueDetails,
    });
  } catch (error) {
    console.error('Error getting league details:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get league details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// GET /api/leagues/:leagueId/matchups/:week
// Returns all matchups for the specified week
router.get('/:leagueId/matchups/:week', async (req, res) => {
  try {
    const { leagueId, week } = req.params;
    const weekNumber = parseInt(week);

    if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 18) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_WEEK',
          message: 'Week must be a number between 1 and 18',
        },
      });
    }

    // Find the league in our database
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
    });

    if (!league) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LEAGUE_NOT_FOUND',
          message: 'League not found',
        },
      });
    }

    const matchups = await leagueService.getLeagueMatchups(league.sleeperLeagueId, weekNumber);

    res.json({
      success: true,
      data: {
        week: weekNumber,
        matchups,
      },
    });
  } catch (error) {
    console.error('Error getting league matchups:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get league matchups',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// GET /api/leagues/:leagueId/standings
// Returns calculated standings with wins/losses/points
router.get('/:leagueId/standings', async (req, res) => {
  try {
    const { leagueId } = req.params;

    // Find the league in our database
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
    });

    if (!league) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LEAGUE_NOT_FOUND',
          message: 'League not found',
        },
      });
    }

    const standings = await leagueService.getLeagueStandings(league.sleeperLeagueId);

    res.json({
      success: true,
      data: standings,
    });
  } catch (error) {
    console.error('Error getting league standings:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get league standings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// GET /api/leagues/:leagueId/roster/:userId
// Returns user's specific roster for the league
router.get('/:leagueId/roster/:userId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { leagueId, userId } = req.params;
    const authenticatedUserId = req.userId;

    // Verify the authenticated user is requesting their own roster
    if (authenticatedUserId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only access your own roster',
        },
      });
    }

    // Find the league in our database
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
    });

    if (!league) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LEAGUE_NOT_FOUND',
          message: 'League not found',
        },
      });
    }

    // Check if user has access to this league (but don't fail hard if UserLeague record doesn't exist)
    const userLeague = await prisma.userLeague.findFirst({
      where: {
        userId: userId,
        leagueId: leagueId,
      },
    });

    // If no UserLeague record exists, we'll still try to get the roster from Sleeper
    // This handles cases where the UserLeague table may not be fully populated
    console.log(`Getting roster for user ${userId} in league ${leagueId}, UserLeague record exists: ${!!userLeague}`);

    const roster = await leagueService.getUserRoster(league.sleeperLeagueId, userId);

    if (!roster) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ROSTER_NOT_FOUND',
          message: 'User roster not found in this league',
        },
      });
    }

    res.json({
      success: true,
      data: roster,
    });
  } catch (error) {
    console.error('Error getting user roster:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get user roster',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// GET /api/leagues/:leagueId/players/:userId
// Returns user's roster players formatted for Start/Sit analyzer
router.get('/:leagueId/players/:userId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { leagueId, userId } = req.params;
    const authenticatedUserId = req.userId;

    // Verify the authenticated user is requesting their own players
    if (authenticatedUserId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only access your own players',
        },
      });
    }

    // Find the league in our database
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
    });

    if (!league) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LEAGUE_NOT_FOUND',
          message: 'League not found',
        },
      });
    }

    // Check if user has access to this league (but don't fail hard if UserLeague record doesn't exist)
    const userLeague = await prisma.userLeague.findFirst({
      where: {
        userId: userId,
        leagueId: leagueId,
      },
    });

    // If no UserLeague record exists, we'll still try to get the players from Sleeper
    // This handles cases where the UserLeague table may not be fully populated
    console.log(`Getting players for user ${userId} in league ${leagueId}, UserLeague record exists: ${!!userLeague}`);

    const players = await leagueService.getUserRosterPlayers(league.sleeperLeagueId, userId);

    res.json({
      success: true,
      data: players,
    });
  } catch (error) {
    console.error('Error getting user roster players:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get user roster players',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

export { router as leagueRoutes };