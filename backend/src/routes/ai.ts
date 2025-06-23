import express from 'express';
import { 
  aiService, 
  AIProvider,
  TradeAnalysisRequest,
  WaiverWireRequest,
  LineupOptimizerRequest
} from '../services/ai-service';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const StartSitRequestSchema = z.object({
  leagueId: z.string().min(1, 'League ID is required'),
  week: z.number().int().min(1).max(18, 'Week must be between 1 and 18'),
  playerIds: z.array(z.string()).min(1, 'At least one player ID is required'),
  rosterSlots: z.array(z.string()).min(1, 'At least one roster slot is required'),
  userPreferences: z.object({
    riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
    prioritizeUpside: z.boolean().optional(),
    avoidInjuredPlayers: z.boolean().optional(),
  }).optional(),
});

const ChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string().min(1, 'Message content is required'),
  })).min(1, 'At least one message is required'),
  maxTokens: z.number().int().min(1).max(8000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  provider: z.nativeEnum(AIProvider).optional(),
});

const TradeAnalysisRequestSchema = z.object({
  leagueId: z.string().min(1, 'League ID is required'),
  week: z.number().int().min(1).max(18, 'Week must be between 1 and 18'),
  team1Players: z.object({
    give: z.array(z.string()).min(1, 'Team 1 must give at least one player'),
    receive: z.array(z.string()).min(1, 'Team 1 must receive at least one player'),
  }),
  team2Players: z.object({
    give: z.array(z.string()).min(1, 'Team 2 must give at least one player'),
    receive: z.array(z.string()).min(1, 'Team 2 must receive at least one player'),
  }),
  userPreferences: z.object({
    riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
    favorLongTerm: z.boolean().optional(),
    prioritizePosition: z.string().optional(),
  }).optional(),
});

const WaiverWireRequestSchema = z.object({
  leagueId: z.string().min(1, 'League ID is required'),
  week: z.number().int().min(1).max(18, 'Week must be between 1 and 18'),
  budget: z.number().min(0).optional(),
  priorityPosition: z.number().min(1).optional(),
  targetPositions: z.array(z.string()).optional(),
  userPreferences: z.object({
    riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
    streamingStrategy: z.boolean().optional(),
    dynastyMode: z.boolean().optional(),
  }).optional(),
});

const LineupOptimizerRequestSchema = z.object({
  leagueId: z.string().min(1, 'League ID is required'),
  week: z.number().int().min(1).max(18, 'Week must be between 1 and 18'),
  constraints: z.object({
    mustStart: z.array(z.string()).optional(),
    mustSit: z.array(z.string()).optional(),
    stackPreferences: z.object({
      qbWr: z.boolean().optional(),
      qbTe: z.boolean().optional(),
    }).optional(),
    avoidOpponents: z.array(z.string()).optional(),
  }).optional(),
  optimization: z.enum(['ceiling', 'floor', 'balanced']).optional(),
  userPreferences: z.object({
    riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
    favorProjections: z.boolean().optional(),
    favorMatchups: z.boolean().optional(),
  }).optional(),
});

// Helper function to validate request body
function validateSchema<T>(schema: z.ZodSchema<T>, data: any): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Validation error: ${message}`);
    }
    throw error;
  }
}

// POST /api/ai/start-sit
// Start/Sit analysis with authentication
router.post('/start-sit', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`Start/Sit analysis request from user ${req.userId}`);
    
    // Validate request body
    const validatedData = validateSchema(StartSitRequestSchema, req.body);
    
    // Add authenticated user ID to request
    const startSitRequest = {
      ...validatedData,
      userId: req.userId!,
    };

    // Perform start/sit analysis using direct AI service
    const analysis = await aiService.analyzeStartSit(startSitRequest);

    res.json({
      success: true,
      data: analysis,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        analysisType: 'start_sit',
        week: validatedData.week,
        playerCount: validatedData.playerIds.length,
      },
    });
  } catch (error) {
    console.error('Start/Sit analysis error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'START_SIT_ANALYSIS_FAILED',
        message: 'Failed to perform start/sit analysis',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

// POST /api/ai/chat
// General AI chat endpoint with authentication
router.post('/chat', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`AI chat request from user ${req.userId}`);
    
    // Validate request body
    const validatedData = validateSchema(ChatRequestSchema, req.body);

    // Perform AI chat
    const response = await aiService.chat(validatedData);

    res.json({
      success: true,
      data: response,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        provider: response.provider,
        tokens: response.usage?.totalTokens,
      },
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AI_CHAT_FAILED',
        message: 'Failed to process AI chat request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

// GET /api/ai/health
// Health check for AI service and providers
router.get('/health', async (req, res) => {
  try {
    console.log('AI service health check requested');
    
    const health = await aiService.healthCheck();
    
    const overallHealthy = Object.values(health.directProviders).some(status => status) || 
                          health.mcpService || 
                          health.sleeperAPI;

    res.status(overallHealthy ? 200 : 503).json({
      success: true,
      data: {
        status: overallHealthy ? 'healthy' : 'degraded',
        services: health,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('AI health check error:', error);
    res.status(503).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Failed to perform health check',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// POST /api/ai/trade-analysis
// Trade analysis endpoint with authentication
router.post('/trade-analysis', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`Trade analysis request from user ${req.userId}`);
    
    // Validate request body
    const validatedData = validateSchema(TradeAnalysisRequestSchema, req.body);
    
    // Add authenticated user ID to request
    const tradeAnalysisRequest: TradeAnalysisRequest = {
      ...validatedData,
      userId: req.userId!,
    };

    // Perform trade analysis using direct AI service
    const analysis = await aiService.analyzeTradeProposal(tradeAnalysisRequest);

    res.json({
      success: true,
      data: analysis,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        analysisType: 'trade_analysis',
        week: validatedData.week,
        recommendation: analysis.recommendation,
        grade: analysis.overallGrade,
      },
    });
  } catch (error) {
    console.error('Trade analysis error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TRADE_ANALYSIS_FAILED',
        message: 'Failed to perform trade analysis',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

// POST /api/ai/waiver-wire
// Waiver wire analysis endpoint with authentication
router.post('/waiver-wire', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`Waiver wire analysis request from user ${req.userId}`);
    
    // Validate request body
    const validatedData = validateSchema(WaiverWireRequestSchema, req.body);
    
    // Add authenticated user ID to request
    const waiverWireRequest: WaiverWireRequest = {
      ...validatedData,
      userId: req.userId!,
    };

    // Perform waiver wire analysis using direct AI service
    const analysis = await aiService.analyzeWaiverWire(waiverWireRequest);

    res.json({
      success: true,
      data: analysis,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        analysisType: 'waiver_wire',
        week: validatedData.week,
        recommendationCount: analysis.recommendations.length,
        budget: validatedData.budget,
      },
    });
  } catch (error) {
    console.error('Waiver wire analysis error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WAIVER_WIRE_ANALYSIS_FAILED',
        message: 'Failed to perform waiver wire analysis',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

// POST /api/ai/lineup-optimizer
// Lineup optimizer endpoint with authentication
router.post('/lineup-optimizer', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`Lineup optimizer request from user ${req.userId}`);
    
    // Validate request body
    const validatedData = validateSchema(LineupOptimizerRequestSchema, req.body);
    
    // Add authenticated user ID to request
    const lineupOptimizerRequest: LineupOptimizerRequest = {
      ...validatedData,
      userId: req.userId!,
    };

    // Perform lineup optimization using direct AI service
    const analysis = await aiService.optimizeLineup(lineupOptimizerRequest);

    res.json({
      success: true,
      data: analysis,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        analysisType: 'lineup_optimizer',
        week: validatedData.week,
        optimization: validatedData.optimization || 'balanced',
        lineupCount: analysis.alternativeLineups.length + 1,
      },
    });
  } catch (error) {
    console.error('Lineup optimizer error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LINEUP_OPTIMIZER_FAILED',
        message: 'Failed to perform lineup optimization',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

// GET /api/ai/analysis/:analysisId
// Get historical analysis by ID
router.get('/analysis/:analysisId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { analysisId } = req.params;
    
    // Query database for analysis (placeholder - would need Prisma query)
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Historical analysis retrieval not yet implemented',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_ANALYSIS_FAILED',
        message: 'Failed to retrieve analysis',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

// GET /api/ai/history
// Get user's analysis history
router.get('/history', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { limit = '10', analysisType, leagueId } = req.query;
    
    // Query database for user's analysis history (placeholder - would need Prisma query)
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Analysis history retrieval not yet implemented',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  } catch (error) {
    console.error('Get analysis history error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_HISTORY_FAILED',
        message: 'Failed to retrieve analysis history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

export { router as aiRoutes };