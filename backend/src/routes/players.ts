import express from 'express';
import { leagueService } from '../services/league-service';

const router = express.Router();

// GET /api/players/all
// Returns all NFL players data
router.get('/all', async (req, res) => {
  try {
    console.log('Fetching all NFL players');
    
    const players = await leagueService.getAllPlayers();

    res.json({
      success: true,
      data: players,
    });
  } catch (error) {
    console.error('Error getting all players:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get all players',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// POST /api/players/stats
// Returns detailed stats for specific players including weekly performance and projections
router.post('/stats', async (req, res) => {
  try {
    const { playerIds, leagueId, weeks } = req.body;
    
    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'playerIds array is required',
        },
      });
    }

    if (!leagueId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'leagueId is required',
        },
      });
    }

    console.log(`Fetching stats for ${playerIds.length} players in league ${leagueId}`);
    
    // Get player stats from Sleeper service
    const playerStats = await leagueService.getPlayerStats(playerIds, leagueId, weeks);

    res.json({
      success: true,
      data: playerStats,
    });
  } catch (error) {
    console.error('Error getting player stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get player stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

export { router as playerRoutes };