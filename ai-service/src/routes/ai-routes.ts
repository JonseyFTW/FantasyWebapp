import { Router } from 'express';
import { AIManager } from '../services/ai-manager';
import { StartSitAnalyzer } from '../agents/start-sit-analyzer';
import { TradeAnalyzer } from '../agents/trade-analyzer';
import { WaiverWireAnalyzer } from '../agents/waiver-wire-analyzer';
import { LineupOptimizer } from '../agents/lineup-optimizer';
import { validateSchema } from '@fantasy-app/shared/utils/validation';
import { z } from 'zod';
import { AIProvider } from '../types/ai-providers';

const router = Router();

// Validation schemas
const StartSitRequestSchema = z.object({
  userId: z.string().min(1),
  leagueId: z.string().min(1),
  week: z.number().int().min(1).max(18),
  playerIds: z.array(z.string()).min(1),
  rosterSlots: z.array(z.string()).min(1),
  userPreferences: z.object({
    riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
    prioritizeUpside: z.boolean().optional(),
    avoidInjuredPlayers: z.boolean().optional(),
  }).optional(),
  preferredProvider: z.nativeEnum(AIProvider).optional(),
});

const TradeRequestSchema = z.object({
  leagueId: z.string().min(1),
  team1UserId: z.string().min(1),
  team2UserId: z.string().min(1),
  team1Players: z.array(z.string()).min(1),
  team2Players: z.array(z.string()).min(1),
  requestingUserId: z.string().min(1),
  tradeContext: z.object({
    deadline: z.string().optional(),
    keepers: z.boolean().optional(),
    dynastyLeague: z.boolean().optional(),
    needAnalysis: z.string().optional(),
  }).optional(),
  preferredProvider: z.nativeEnum(AIProvider).optional(),
});

const WaiverWireRequestSchema = z.object({
  userId: z.string().min(1),
  leagueId: z.string().min(1),
  week: z.number().int().min(1).max(18),
  budget: z.number().min(0).optional(),
  currentRoster: z.array(z.string()),
  rosterNeeds: z.array(z.string()).optional(),
  userPreferences: z.object({
    riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
    focusOnUpside: z.boolean().optional(),
    prioritizeImmediateHelp: z.boolean().optional(),
    maxBidPercentage: z.number().min(0).max(100).optional(),
  }).optional(),
  preferredProvider: z.nativeEnum(AIProvider).optional(),
});

const LineupOptimizerRequestSchema = z.object({
  userId: z.string().min(1),
  leagueId: z.string().min(1),
  week: z.number().int().min(1).max(18),
  availablePlayers: z.array(z.string()).min(1),
  rosterSlots: z.array(z.string()).min(1),
  userPreferences: z.object({
    riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
    prioritizeFloor: z.boolean().optional(),
    stackPreference: z.enum(['qb_wr', 'qb_te', 'none']).optional(),
    avoidOpponents: z.boolean().optional(),
    weatherConcerns: z.boolean().optional(),
  }).optional(),
  constraints: z.object({
    mustStart: z.array(z.string()).optional(),
    cannotStart: z.array(z.string()).optional(),
    maxPlayersPerTeam: z.number().int().min(1).optional(),
    minProjectedPoints: z.number().min(0).optional(),
  }).optional(),
  preferredProvider: z.nativeEnum(AIProvider).optional(),
});

const QuickAnalysisSchema = z.object({
  playerId: z.string().min(1),
  leagueId: z.string().min(1),
  week: z.number().int().min(1).max(18),
  analysisType: z.enum(['start_sit', 'waiver_pickup', 'trade_value']),
  preferredProvider: z.nativeEnum(AIProvider).optional(),
});

export function createAIRoutes(aiManager: AIManager): Router {
  const startSitAnalyzer = new StartSitAnalyzer(aiManager);
  const tradeAnalyzer = new TradeAnalyzer(aiManager);
  const waiverWireAnalyzer = new WaiverWireAnalyzer(aiManager);
  const lineupOptimizer = new LineupOptimizer(aiManager);

  /**
   * POST /ai/start-sit
   * Analyze start/sit decisions for a user's roster
   */
  router.post('/start-sit', async (req, res) => {
    try {
      const request = validateSchema(StartSitRequestSchema, req.body);
      
      console.log(`Start/Sit analysis requested for user ${request.userId}`);
      
      const analysis = await startSitAnalyzer.analyzeStartSit(request, request.preferredProvider);
      
      res.json({
        success: true,
        data: analysis,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          version: '1.0.0',
          processingTime: Date.now() - parseInt(req.headers['x-start-time'] as string || '0'),
        },
      });
    } catch (error) {
      console.error('Start/Sit analysis error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'AI_SERVICE_ERROR',
          message: error instanceof Error ? error.message : 'Start/Sit analysis failed',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          version: '1.0.0',
        },
      });
    }
  });

  /**
   * POST /ai/trade-analysis
   * Analyze a proposed trade between two teams
   */
  router.post('/trade-analysis', async (req, res) => {
    try {
      const request = validateSchema(TradeRequestSchema, req.body);
      
      console.log(`Trade analysis requested between ${request.team1UserId} and ${request.team2UserId}`);
      
      // Convert deadline string to Date if provided
      const processedRequest = {
        ...request,
        tradeContext: request.tradeContext ? {
          ...request.tradeContext,
          deadline: request.tradeContext.deadline ? new Date(request.tradeContext.deadline) : undefined,
        } : undefined,
      };
      
      const analysis = await tradeAnalyzer.analyzeTrade(processedRequest, request.preferredProvider);
      
      res.json({
        success: true,
        data: analysis,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          version: '1.0.0',
          processingTime: Date.now() - parseInt(req.headers['x-start-time'] as string || '0'),
        },
      });
    } catch (error) {
      console.error('Trade analysis error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'AI_SERVICE_ERROR',
          message: error instanceof Error ? error.message : 'Trade analysis failed',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          version: '1.0.0',
        },
      });
    }
  });

  /**
   * POST /ai/waiver-wire
   * Analyze waiver wire opportunities for a user
   */
  router.post('/waiver-wire', async (req, res) => {
    try {
      const request = validateSchema(WaiverWireRequestSchema, req.body);
      
      console.log(`Waiver wire analysis requested for user ${request.userId}`);
      
      const analysis = await waiverWireAnalyzer.analyzeWaiverWire(request, request.preferredProvider);
      
      res.json({
        success: true,
        data: analysis,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          version: '1.0.0',
          processingTime: Date.now() - parseInt(req.headers['x-start-time'] as string || '0'),
        },
      });
    } catch (error) {
      console.error('Waiver wire analysis error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'AI_SERVICE_ERROR',
          message: error instanceof Error ? error.message : 'Waiver wire analysis failed',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          version: '1.0.0',
        },
      });
    }
  });

  /**
   * POST /ai/lineup-optimizer
   * Optimize lineup for maximum expected points
   */
  router.post('/lineup-optimizer', async (req, res) => {
    try {
      const request = validateSchema(LineupOptimizerRequestSchema, req.body);
      
      console.log(`Lineup optimization requested for user ${request.userId}`);
      
      const optimization = await lineupOptimizer.optimizeLineup(request, request.preferredProvider);
      
      res.json({
        success: true,
        data: optimization,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          version: '1.0.0',
          processingTime: Date.now() - parseInt(req.headers['x-start-time'] as string || '0'),
        },
      });
    } catch (error) {
      console.error('Lineup optimization error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'AI_SERVICE_ERROR',
          message: error instanceof Error ? error.message : 'Lineup optimization failed',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          version: '1.0.0',
        },
      });
    }
  });

  /**
   * POST /ai/quick-analysis
   * Get a quick analysis for a single player
   */
  router.post('/quick-analysis', async (req, res) => {
    try {
      const request = validateSchema(QuickAnalysisSchema, req.body);
      
      console.log(`Quick ${request.analysisType} analysis for player ${request.playerId}`);
      
      let result;
      switch (request.analysisType) {
        case 'start_sit':
          result = await startSitAnalyzer.getQuickRecommendation(
            request.playerId,
            request.leagueId,
            request.week,
            request.preferredProvider
          );
          break;
        case 'waiver_pickup':
          result = await waiverWireAnalyzer.getQuickPickupRecommendation(
            request.playerId,
            request.leagueId,
            request.week,
            request.preferredProvider
          );
          break;
        case 'trade_value':
          result = await tradeAnalyzer.getTradeValueComparison(
            [request.playerId],
            request.leagueId,
            request.preferredProvider
          );
          break;
        default:
          throw new Error(`Unsupported analysis type: ${request.analysisType}`);
      }
      
      res.json({
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          version: '1.0.0',
          processingTime: Date.now() - parseInt(req.headers['x-start-time'] as string || '0'),
        },
      });
    } catch (error) {
      console.error('Quick analysis error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'AI_SERVICE_ERROR',
          message: error instanceof Error ? error.message : 'Quick analysis failed',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          version: '1.0.0',
        },
      });
    }
  });

  /**
   * GET /ai/status
   * Get AI service health and provider status
   */
  router.get('/status', async (req, res) => {
    try {
      const [providerStatus, mcpStatus] = await Promise.all([
        aiManager.getProviderStatus(),
        aiManager.getMCPStatus(),
      ]);
      
      res.json({
        success: true,
        data: {
          providers: providerStatus,
          mcpServer: { healthy: mcpStatus },
          availableProviders: aiManager.getAvailableProviders(),
          availableTools: aiManager.getAvailableTools(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          version: '1.0.0',
        },
      });
    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Unable to check service status',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          version: '1.0.0',
        },
      });
    }
  });

  /**
   * GET /ai/streaming/:position
   * Get streaming recommendations for a specific position
   */
  router.get('/streaming/:position/:leagueId/:week', async (req, res) => {
    try {
      const position = req.params.position.toUpperCase() as 'DEF' | 'K' | 'QB';
      const leagueId = req.params.leagueId;
      const week = parseInt(req.params.week);
      const preferredProvider = req.query.provider as AIProvider | undefined;
      
      if (!['DEF', 'K', 'QB'].includes(position)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Position must be DEF, K, or QB',
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
            version: '1.0.0',
          },
        });
      }
      
      const recommendations = await waiverWireAnalyzer.getStreamingRecommendations(
        position,
        leagueId,
        week,
        preferredProvider
      );
      
      res.json({
        success: true,
        data: {
          position,
          week,
          recommendations,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          version: '1.0.0',
        },
      });
    } catch (error) {
      console.error('Streaming recommendations error:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'AI_SERVICE_ERROR',
          message: error instanceof Error ? error.message : 'Streaming recommendations failed',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          version: '1.0.0',
        },
      });
    }
  });

  return router;
}