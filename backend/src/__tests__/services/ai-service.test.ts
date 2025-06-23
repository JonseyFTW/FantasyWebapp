import { AIService, AIProvider, AIRequest, StartSitRequest } from '../../services/ai-service';
import { SleeperAPIService } from '../../services/sleeper-api-service';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
const mockSleeperAPI = {
  getLeagueDetailsBatch: jest.fn(),
  getAllPlayers: jest.fn(),
  healthCheck: jest.fn(),
} as unknown as SleeperAPIService;

const mockPrisma = {
  aIAnalysis: {
    create: jest.fn(),
  },
} as unknown as PrismaClient;

// Mock environment variables
const originalEnv = process.env;

describe('AIService', () => {
  let aiService: AIService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      ANTHROPIC_API_KEY: 'test-claude-key',
      OPENAI_API_KEY: 'test-openai-key',
      GEMINI_API_KEY: 'test-gemini-key',
    };
    
    // Create service with mocked dependencies
    aiService = new AIService(mockSleeperAPI, mockPrisma);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('chat method', () => {
    beforeEach(() => {
      // Mock successful fetch for direct AI providers
      global.fetch = jest.fn();
    });

    it('should call Claude directly as primary method', async () => {
      const mockClaudeResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          content: [{ text: 'Test response' }],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockClaudeResponse);

      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test message' }],
        provider: AIProvider.CLAUDE,
      };

      const response = await aiService.chat(request);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-claude-key',
          }),
        })
      );
      expect(response.content).toBe('Test response');
      expect(response.provider).toBe(AIProvider.CLAUDE);
    });

    it('should call OpenAI directly when specified', async () => {
      const mockOpenAIResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'OpenAI response' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockOpenAIResponse);

      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test message' }],
        provider: AIProvider.OPENAI,
      };

      const response = await aiService.chat(request);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-openai-key',
          }),
        })
      );
      expect(response.content).toBe('OpenAI response');
      expect(response.provider).toBe(AIProvider.OPENAI);
    });

    it('should fallback to MCP AI service when direct provider fails', async () => {
      // Mock direct provider failure
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Direct provider failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: {
              content: 'MCP fallback response',
              provider: 'claude',
            },
          }),
        });

      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test message' }],
        provider: AIProvider.CLAUDE,
      };

      const response = await aiService.chat(request);

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(response.content).toBe('MCP fallback response');
    });

    it('should throw error when both direct and MCP methods fail', async () => {
      // Mock both direct and MCP failures
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Direct provider failed'))
        .mockRejectedValueOnce(new Error('MCP service failed'));

      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Test message' }],
        provider: AIProvider.CLAUDE,
      };

      await expect(aiService.chat(request)).rejects.toThrow('AI request failed');
    });
  });

  describe('analyzeStartSit method', () => {
    const mockLeagueData = {
      league: { name: 'Test League', season: '2024' },
      rosters: [
        { roster_id: 1, owner_id: 'user123', players: ['player1', 'player2'] }
      ],
      users: [
        { user_id: 'user123', display_name: 'Test User' }
      ],
    };

    const mockPlayersData = {
      player1: { full_name: 'Player One', position: 'QB', team: 'LAR' },
      player2: { full_name: 'Player Two', position: 'RB', team: 'LAR' },
    };

    beforeEach(() => {
      (mockSleeperAPI.getLeagueDetailsBatch as jest.Mock).mockResolvedValue(mockLeagueData);
      (mockSleeperAPI.getAllPlayers as jest.Mock).mockResolvedValue(mockPlayersData);
      (mockPrisma.aIAnalysis.create as jest.Mock).mockResolvedValue({ id: 'analysis123' });
      
      // Mock successful AI response (Claude format)
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          content: [{ text: JSON.stringify({
            recommendations: [
              {
                playerId: 'player1',
                playerName: 'Player One',
                position: 'QB',
                recommendation: 'start',
                confidence: 0.8,
                reasoning: 'Strong matchup',
                projectedPoints: { floor: 15, ceiling: 25, expected: 20 },
                matchupAnalysis: {
                  opponent: 'SF',
                  difficulty: 'easy',
                  keyFactors: ['Weak pass defense']
                },
                riskFactors: []
              }
            ],
            optimalLineup: { QB: 'player1' },
            benchPlayers: ['player2'],
            confidenceScore: 0.8,
            weeklyOutlook: 'Good week',
            keyInsights: ['Start Player One']
          }) }],
          usage: { input_tokens: 100, output_tokens: 200 },
        }),
      });
    });

    it('should use direct Sleeper API for data gathering', async () => {
      const request: StartSitRequest = {
        userId: 'user123',
        leagueId: 'league123',
        week: 14,
        playerIds: ['player1', 'player2'],
        rosterSlots: ['QB', 'RB'],
        userPreferences: {
          riskTolerance: 'moderate',
        },
      };

      await aiService.analyzeStartSit(request);

      expect(mockSleeperAPI.getLeagueDetailsBatch).toHaveBeenCalledWith('league123');
      expect(mockSleeperAPI.getAllPlayers).toHaveBeenCalled();
    });

    it('should call AI provider with proper prompts', async () => {
      const request: StartSitRequest = {
        userId: 'user123',
        leagueId: 'league123',
        week: 14,
        playerIds: ['player1', 'player2'],
        rosterSlots: ['QB', 'RB'],
        userPreferences: {
          riskTolerance: 'aggressive',
        },
      };

      await aiService.analyzeStartSit(request);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          body: expect.stringContaining('start/sit decisions'),
        })
      );
    });

    it('should store analysis results in database', async () => {
      const request: StartSitRequest = {
        userId: 'user123',
        leagueId: 'league123',
        week: 14,
        playerIds: ['player1', 'player2'],
        rosterSlots: ['QB', 'RB'],
      };

      await aiService.analyzeStartSit(request);

      expect(mockPrisma.aIAnalysis.create).toHaveBeenCalledWith({
        data: {
          userId: 'user123',
          leagueId: 'league123',
          analysisType: 'start_sit',
          input: expect.any(String),
          output: expect.any(String),
          metadata: expect.objectContaining({
            provider: AIProvider.CLAUDE,
            week: 14,
            playerCount: 2,
          }),
        },
      });
    });

    it('should return fallback analysis when AI parsing fails', async () => {
      // Mock invalid AI response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          content: [{ text: 'Invalid JSON response' }],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      });

      const request: StartSitRequest = {
        userId: 'user123',
        leagueId: 'league123',
        week: 14,
        playerIds: ['player1'],
        rosterSlots: ['QB'],
      };

      const result = await aiService.analyzeStartSit(request);

      expect(result.confidenceScore).toBe(0.1);
      expect(result.weeklyOutlook).toBe('Analysis failed - please try again');
      expect(result.recommendations[0].recommendation).toBe('sit');
    });

    it('should handle Sleeper API failure with proper error', async () => {
      (mockSleeperAPI.getLeagueDetailsBatch as jest.Mock).mockRejectedValue(
        new Error('Sleeper API failed')
      );

      const request: StartSitRequest = {
        userId: 'user123',
        leagueId: 'league123',
        week: 14,
        playerIds: ['player1'],
        rosterSlots: ['QB'],
      };

      await expect(aiService.analyzeStartSit(request)).rejects.toThrow('Start/Sit analysis failed');
    });
  });

  describe('healthCheck method', () => {
    it('should check all service health statuses', async () => {
      // Mock successful health checks with proper response format
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ 
          ok: true, 
          json: jest.fn().mockResolvedValue({ content: [{ text: 'OK' }] }) 
        }) // Claude
        .mockResolvedValueOnce({ 
          ok: true, 
          json: jest.fn().mockResolvedValue({ choices: [{ message: { content: 'OK' } }] }) 
        }) // OpenAI  
        .mockResolvedValueOnce({ 
          ok: true, 
          json: jest.fn().mockResolvedValue({ candidates: [{ content: { parts: [{ text: 'OK' }] } }] }) 
        }) // Gemini
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ success: true, data: { content: 'OK' } })
        }); // MCP Service

      (mockSleeperAPI.healthCheck as jest.Mock).mockResolvedValue(true);

      const health = await aiService.healthCheck();

      expect(health.directProviders[AIProvider.CLAUDE]).toBe(true);
      expect(health.directProviders[AIProvider.OPENAI]).toBe(true);
      expect(health.directProviders[AIProvider.GEMINI]).toBe(true);
      expect(health.sleeperAPI).toBe(true);
    });

    it('should handle provider failures gracefully', async () => {
      // Mock provider failures
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Claude failed'))
        .mockRejectedValueOnce(new Error('OpenAI failed'))
        .mockRejectedValueOnce(new Error('Gemini failed'))
        .mockRejectedValueOnce(new Error('MCP failed'));

      (mockSleeperAPI.healthCheck as jest.Mock).mockResolvedValue(false);

      const health = await aiService.healthCheck();

      expect(health.directProviders[AIProvider.CLAUDE]).toBe(false);
      expect(health.directProviders[AIProvider.OPENAI]).toBe(false);
      expect(health.directProviders[AIProvider.GEMINI]).toBe(false);
      expect(health.mcpService).toBe(false);
      expect(health.sleeperAPI).toBe(false);
    });
  });
});