import request from 'supertest';
import express from 'express';
import { aiRoutes } from '../../routes/ai';
import { aiService, AIProvider } from '../../services/ai-service';
import { createToken } from '../../middleware/auth';

// Mock the AI service
jest.mock('../../services/ai-service', () => ({
  aiService: {
    analyzeStartSit: jest.fn(),
    chat: jest.fn(),
    healthCheck: jest.fn(),
  },
}));

const mockedAIService = aiService as jest.Mocked<typeof aiService>;

// Create test app
const app = express();
app.use(express.json());
app.use('/api/ai', aiRoutes);

// Test data
const testUser = {
  id: 'user123',
  email: 'test@example.com',
};

const validToken = createToken({
  userId: testUser.id,
  email: testUser.email,
});

describe('AI Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-jwt-secret';
  });

  describe('POST /api/ai/start-sit', () => {
    const validStartSitRequest = {
      leagueId: 'league123',
      week: 14,
      playerIds: ['player1', 'player2'],
      rosterSlots: ['QB', 'RB'],
      userPreferences: {
        riskTolerance: 'moderate' as const,
        prioritizeUpside: true,
        avoidInjuredPlayers: false,
      },
    };

    const mockStartSitResponse = {
      recommendations: [
        {
          playerId: 'player1',
          playerName: 'Test Player',
          position: 'QB',
          recommendation: 'start' as const,
          confidence: 0.8,
          reasoning: 'Good matchup',
          projectedPoints: { floor: 15, ceiling: 25, expected: 20 },
          matchupAnalysis: {
            opponent: 'SF',
            difficulty: 'easy' as const,
            keyFactors: ['Weak defense'],
          },
          riskFactors: [],
        },
      ],
      optimalLineup: { QB: 'player1' },
      benchPlayers: ['player2'],
      confidenceScore: 0.8,
      weeklyOutlook: 'Good week for your team',
      keyInsights: ['Start your QB'],
      lastUpdated: new Date(),
    };

    it('should analyze start/sit with valid authentication and data', async () => {
      mockedAIService.analyzeStartSit.mockResolvedValue(mockStartSitResponse);

      const response = await request(app)
        .post('/api/ai/start-sit')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validStartSitRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStartSitResponse);
      expect(response.body.metadata.analysisType).toBe('start_sit');
      expect(response.body.metadata.week).toBe(14);
      expect(response.body.metadata.playerCount).toBe(2);

      expect(mockedAIService.analyzeStartSit).toHaveBeenCalledWith({
        ...validStartSitRequest,
        userId: testUser.id,
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/ai/start-sit')
        .send(validStartSitRequest);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should validate request data', async () => {
      const invalidRequest = {
        leagueId: '', // Invalid: empty string
        week: 25, // Invalid: out of range
        playerIds: [], // Invalid: empty array
        rosterSlots: [], // Invalid: empty array
      };

      const response = await request(app)
        .post('/api/ai/start-sit')
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidRequest);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toContain('Validation error');
    });

    it('should handle service errors gracefully', async () => {
      mockedAIService.analyzeStartSit.mockRejectedValue(new Error('AI service unavailable'));

      const response = await request(app)
        .post('/api/ai/start-sit')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validStartSitRequest);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('START_SIT_ANALYSIS_FAILED');
      expect(response.body.error.details).toBe('AI service unavailable');
    });

    it('should accept optional user preferences', async () => {
      const requestWithoutPreferences = {
        leagueId: 'league123',
        week: 14,
        playerIds: ['player1'],
        rosterSlots: ['QB'],
      };

      mockedAIService.analyzeStartSit.mockResolvedValue(mockStartSitResponse);

      const response = await request(app)
        .post('/api/ai/start-sit')
        .set('Authorization', `Bearer ${validToken}`)
        .send(requestWithoutPreferences);

      expect(response.status).toBe(200);
      expect(mockedAIService.analyzeStartSit).toHaveBeenCalledWith({
        ...requestWithoutPreferences,
        userId: testUser.id,
      });
    });

    it('should validate risk tolerance values', async () => {
      const invalidRiskTolerance = {
        ...validStartSitRequest,
        userPreferences: {
          riskTolerance: 'invalid' as any,
        },
      };

      const response = await request(app)
        .post('/api/ai/start-sit')
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidRiskTolerance);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toContain('Validation error');
    });
  });

  describe('POST /api/ai/chat', () => {
    const validChatRequest = {
      messages: [
        { role: 'user' as const, content: 'Hello AI' },
      ],
      maxTokens: 1000,
      temperature: 0.7,
      provider: AIProvider.CLAUDE,
    };

    const mockChatResponse = {
      content: 'Hello! How can I help you with fantasy football?',
      provider: AIProvider.CLAUDE,
      usage: {
        promptTokens: 10,
        completionTokens: 15,
        totalTokens: 25,
      },
    };

    it('should handle AI chat with valid request', async () => {
      mockedAIService.chat.mockResolvedValue(mockChatResponse);

      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validChatRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockChatResponse);
      expect(response.body.metadata.provider).toBe(AIProvider.CLAUDE);
      expect(response.body.metadata.tokens).toBe(25);

      expect(mockedAIService.chat).toHaveBeenCalledWith(validChatRequest);
    });

    it('should require authentication for chat', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .send(validChatRequest);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should validate chat messages', async () => {
      const invalidChatRequest = {
        messages: [], // Invalid: empty array
      };

      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidChatRequest);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toContain('Validation error');
    });

    it('should handle optional parameters', async () => {
      const minimalChatRequest = {
        messages: [
          { role: 'user' as const, content: 'Test message' },
        ],
      };

      mockedAIService.chat.mockResolvedValue(mockChatResponse);

      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${validToken}`)
        .send(minimalChatRequest);

      expect(response.status).toBe(200);
      expect(mockedAIService.chat).toHaveBeenCalledWith(minimalChatRequest);
    });

    it('should validate token limits', async () => {
      const invalidTokenRequest = {
        messages: [{ role: 'user' as const, content: 'Test' }],
        maxTokens: 10000, // Invalid: exceeds limit
      };

      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidTokenRequest);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toContain('Validation error');
    });
  });

  describe('GET /api/ai/health', () => {
    it('should return healthy status when services are available', async () => {
      const mockHealthResponse = {
        directProviders: {
          claude: true,
          openai: true,
          gemini: false,
        },
        mcpService: true,
        sleeperAPI: true,
      };

      mockedAIService.healthCheck.mockResolvedValue(mockHealthResponse);

      const response = await request(app)
        .get('/api/ai/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.services).toEqual(mockHealthResponse);
    });

    it('should return degraded status when no services are available', async () => {
      const mockHealthResponse = {
        directProviders: {
          claude: false,
          openai: false,
          gemini: false,
        },
        mcpService: false,
        sleeperAPI: false,
      };

      mockedAIService.healthCheck.mockResolvedValue(mockHealthResponse);

      const response = await request(app)
        .get('/api/ai/health');

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('degraded');
    });

    it('should handle health check failures', async () => {
      mockedAIService.healthCheck.mockRejectedValue(new Error('Health check failed'));

      const response = await request(app)
        .get('/api/ai/health');

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('HEALTH_CHECK_FAILED');
      expect(response.body.data.status).toBe('unhealthy');
    });

    it('should not require authentication', async () => {
      const mockHealthResponse = {
        directProviders: { claude: true, openai: true, gemini: true },
        mcpService: true,
        sleeperAPI: true,
      };

      mockedAIService.healthCheck.mockResolvedValue(mockHealthResponse);

      const response = await request(app)
        .get('/api/ai/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Placeholder endpoints', () => {
    it('should return 501 for trade-analysis endpoint', async () => {
      const response = await request(app)
        .post('/api/ai/trade-analysis')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(501);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_IMPLEMENTED');
    });

    it('should return 501 for waiver-wire endpoint', async () => {
      const response = await request(app)
        .post('/api/ai/waiver-wire')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(501);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_IMPLEMENTED');
    });

    it('should return 501 for lineup-optimizer endpoint', async () => {
      const response = await request(app)
        .post('/api/ai/lineup-optimizer')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(501);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_IMPLEMENTED');
    });

    it('should return 501 for analysis history endpoint', async () => {
      const response = await request(app)
        .get('/api/ai/history')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(501);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_IMPLEMENTED');
    });

    it('should return 501 for specific analysis retrieval', async () => {
      const response = await request(app)
        .get('/api/ai/analysis/test123')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(501);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_IMPLEMENTED');
    });
  });
});