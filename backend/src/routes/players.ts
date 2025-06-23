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

export { router as playerRoutes };