import { PrismaClient } from '@prisma/client';
import { sleeperAPIService as defaultSleeperAPI, SleeperAPIService } from './sleeper-api-service';

const prisma = new PrismaClient();

// AI Provider Types
export enum AIProvider {
  CLAUDE = 'claude',
  OPENAI = 'openai',
  GEMINI = 'gemini'
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  provider?: AIProvider;
}

export interface AIResponse {
  content: string;
  provider: AIProvider;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Start/Sit Analysis Types
export interface StartSitRequest {
  userId: string;
  leagueId: string;
  week: number;
  playerIds: string[];
  rosterSlots: string[];
  userPreferences?: {
    riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
    prioritizeUpside?: boolean;
    avoidInjuredPlayers?: boolean;
  };
}

export interface StartSitRecommendation {
  playerId: string;
  playerName: string;
  position: string;
  recommendation: 'start' | 'sit' | 'flex';
  confidence: number;
  reasoning: string;
  projectedPoints: {
    floor: number;
    ceiling: number;
    expected: number;
  };
  matchupAnalysis: {
    opponent: string;
    difficulty: 'easy' | 'medium' | 'hard';
    keyFactors: string[];
  };
  riskFactors: string[];
  alternativeOptions?: string[];
}

export interface StartSitAnalysis {
  recommendations: StartSitRecommendation[];
  optimalLineup: {
    [position: string]: string;
  };
  benchPlayers: string[];
  confidenceScore: number;
  weeklyOutlook: string;
  keyInsights: string[];
  lastUpdated: Date;
}

// Trade Analysis Types
export interface TradeAnalysisRequest {
  userId: string;
  leagueId: string;
  week: number;
  team1Players: {
    give: string[]; // Player IDs being given away
    receive: string[]; // Player IDs being received
  };
  team2Players: {
    give: string[]; // Player IDs being given away  
    receive: string[]; // Player IDs being received
  };
  userPreferences?: {
    riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
    favorLongTerm?: boolean;
    prioritizePosition?: string;
  };
}

export interface TradeAnalysisResult {
  overallGrade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D+' | 'D' | 'F';
  fairnessScore: number; // 0-1, 0.5 being perfectly fair
  recommendation: 'accept' | 'reject' | 'negotiate';
  reasoning: string;
  impactAnalysis: {
    team1Impact: {
      positionalImpact: { [position: string]: number }; // -1 to 1
      weeklyProjection: number;
      seasonProjection: number;
    };
    team2Impact: {
      positionalImpact: { [position: string]: number };
      weeklyProjection: number;
      seasonProjection: number;
    };
  };
  playerAnalysis: {
    [playerId: string]: {
      playerName: string;
      position: string;
      currentValue: number;
      futureValue: number;
      risk: 'low' | 'medium' | 'high';
      notes: string;
    };
  };
  alternativeOptions: string[];
  riskFactors: string[];
  keyInsights: string[];
  lastUpdated: Date;
}

// Waiver Wire Analysis Types
export interface WaiverWireRequest {
  userId: string;
  leagueId: string;
  week: number;
  budget?: number; // FAAB budget remaining
  priorityPosition?: number; // Waiver priority
  targetPositions?: string[]; // Positions to prioritize
  userPreferences?: {
    riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
    streamingStrategy?: boolean;
    dynastyMode?: boolean;
  };
}

export interface WaiverWireRecommendation {
  playerId: string;
  playerName: string;
  position: string;
  priority: 'high' | 'medium' | 'low';
  bidAmount?: number; // FAAB bid amount
  reasoning: string;
  projectedValue: {
    thisWeek: number;
    nextThreeWeeks: number;
    seasonLong: number;
  };
  availabilityLikelihood: number; // 0-1
  dropCandidates: string[]; // Player IDs to consider dropping
}

export interface WaiverWireAnalysis {
  recommendations: WaiverWireRecommendation[];
  streamingOptions: {
    [position: string]: WaiverWireRecommendation[];
  };
  budgetStrategy: {
    recommendedSpend: number;
    savingsTarget: number;
    reasoning: string;
  };
  dropCandidates: {
    playerId: string;
    playerName: string;
    dropPriority: 'safe' | 'consider' | 'drop';
    reasoning: string;
  }[];
  keyInsights: string[];
  lastUpdated: Date;
}

// Lineup Optimizer Types
export interface LineupOptimizerRequest {
  userId: string;
  leagueId: string;
  week: number;
  constraints?: {
    mustStart?: string[]; // Player IDs that must be in lineup
    mustSit?: string[]; // Player IDs that must be on bench
    stackPreferences?: {
      qbWr?: boolean; // Prefer QB/WR same team stacks
      qbTe?: boolean; // Prefer QB/TE same team stacks
    };
    avoidOpponents?: string[]; // Team abbreviations to avoid
  };
  optimization?: 'ceiling' | 'floor' | 'balanced';
  userPreferences?: {
    riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
    favorProjections?: boolean;
    favorMatchups?: boolean;
  };
}

export interface LineupOptimizerResult {
  optimalLineup: {
    [position: string]: {
      playerId: string;
      playerName: string;
      projectedPoints: number;
      confidence: number;
    };
  };
  alternativeLineups: Array<{
    name: string;
    lineup: { [position: string]: string };
    projectedTotal: number;
    reasoning: string;
  }>;
  benchOptimization: {
    playerId: string;
    playerName: string;
    flexEligible: boolean;
    projectedPoints: number;
  }[];
  projectedTotal: number;
  confidenceScore: number;
  riskFactors: string[];
  keyDecisions: {
    position: string;
    alternatives: Array<{
      playerId: string;
      playerName: string;
      pros: string[];
      cons: string[];
    }>;
  }[];
  lastUpdated: Date;
}

export class AIService {
  private mcpServerUrl: string;
  private sleeperAPI: SleeperAPIService;
  private prisma: PrismaClient;

  constructor(sleeperAPIService?: SleeperAPIService, prismaClient?: PrismaClient) {
    this.mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:3001';
    this.sleeperAPI = sleeperAPIService || defaultSleeperAPI;
    this.prisma = prismaClient || prisma;
  }

  // Direct AI Provider Calls (Primary Method)
  private async callAIProviderDirect(request: AIRequest): Promise<AIResponse> {
    const provider = request.provider || this.getDefaultProvider();
    
    try {
      console.log(`Calling ${provider} AI provider directly`);
      
      switch (provider) {
        case AIProvider.CLAUDE:
          return await this.callClaudeDirect(request);
        case AIProvider.OPENAI:
          return await this.callOpenAIDirect(request);
        case AIProvider.GEMINI:
          return await this.callGeminiDirect(request);
        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }
    } catch (error) {
      console.error(`Direct ${provider} call failed:`, error);
      throw error;
    }
  }

  // MCP Fallback - Currently disabled as MCP server doesn't provide AI functionality
  private async callAIServiceMCP(request: AIRequest): Promise<AIResponse> {
    throw new Error('MCP AI fallback not available - Sleeper MCP server does not provide AI functionality');
  }

  // Main AI Chat Method - Direct providers only
  async chat(request: AIRequest): Promise<AIResponse> {
    try {
      // Try each available AI provider until one succeeds
      const providers = [AIProvider.CLAUDE, AIProvider.OPENAI, AIProvider.GEMINI];
      let lastError: Error | null = null;

      for (const provider of providers) {
        try {
          const providerRequest = { ...request, provider };
          return await this.callAIProviderDirect(providerRequest);
        } catch (error) {
          console.warn(`${provider} AI provider failed:`, error);
          lastError = error instanceof Error ? error : new Error(String(error));
          continue;
        }
      }

      throw lastError || new Error('All AI providers failed');
    } catch (error) {
      console.error('All AI methods failed:', error);
      throw new Error(`AI request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Start/Sit Analysis with Direct API + MCP Fallback
  async analyzeStartSit(request: StartSitRequest): Promise<StartSitAnalysis> {
    try {
      console.log(`Analyzing start/sit for user ${request.userId}, week ${request.week}`);

      // Look up the league in database to get Sleeper league ID
      const league = await this.prisma.league.findUnique({
        where: { id: request.leagueId },
      });

      if (!league) {
        throw new Error(`League not found for ID: ${request.leagueId}`);
      }

      console.log(`Found league: ${league.name} (Sleeper ID: ${league.sleeperLeagueId})`);

      // Get fantasy data using direct Sleeper API (following Phase 1 pattern)
      let leagueData, playersData, userRoster;
      
      try {
        // Direct Sleeper API calls (Primary)
        console.log('Using direct Sleeper API for start/sit data');
        const [leagueDetails, allPlayers] = await Promise.all([
          this.sleeperAPI.getLeagueDetailsBatch(league.sleeperLeagueId),
          this.sleeperAPI.getAllPlayers(),
        ]);
        
        leagueData = leagueDetails;
        playersData = allPlayers;
        
        // Get user's roster
        const userRosterData = leagueDetails.rosters.find(roster => 
          roster.owner_id === request.userId
        );
        userRoster = userRosterData;
        
      } catch (directAPIError) {
        console.warn('Direct Sleeper API failed for start/sit, using MCP fallback:', directAPIError);
        // MCP fallback would go here - for now, throw error
        throw directAPIError;
      }

      // Build AI prompt with gathered data
      const systemPrompt = this.buildStartSitSystemPrompt(request);
      const userPrompt = this.buildStartSitUserPrompt(request, leagueData, playersData, userRoster);

      const aiRequest: AIRequest = {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        maxTokens: 4000,
        temperature: 0.1,
        provider: request.userPreferences?.riskTolerance === 'aggressive' ? AIProvider.CLAUDE : AIProvider.OPENAI,
      };

      const aiResponse = await this.chat(aiRequest);
      const analysis = this.parseStartSitResponse(aiResponse.content, request);

      // Store analysis in database
      await this.storeStartSitAnalysis(request, analysis, aiResponse.provider);

      return analysis;
    } catch (error) {
      console.error('Start/Sit analysis failed:', error);
      throw new Error(`Start/Sit analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Trade Analysis with Direct API + MCP Fallback
  async analyzeTradeProposal(request: TradeAnalysisRequest): Promise<TradeAnalysisResult> {
    try {
      console.log(`Analyzing trade proposal for user ${request.userId}, week ${request.week}`);

      // Look up the league in database to get Sleeper league ID
      const league = await this.prisma.league.findUnique({
        where: { id: request.leagueId },
      });

      if (!league) {
        throw new Error(`League not found for ID: ${request.leagueId}`);
      }

      console.log(`Found league: ${league.name} (Sleeper ID: ${league.sleeperLeagueId})`);

      // Get fantasy data using direct Sleeper API (following Phase 1 pattern)
      let leagueData, playersData, userRoster;
      
      try {
        // Direct Sleeper API calls (Primary)
        console.log('Using direct Sleeper API for trade analysis data');
        const [leagueDetails, allPlayers] = await Promise.all([
          this.sleeperAPI.getLeagueDetailsBatch(league.sleeperLeagueId),
          this.sleeperAPI.getAllPlayers(),
        ]);
        
        leagueData = leagueDetails;
        playersData = allPlayers;
        
        // Get user's roster
        const userRosterData = leagueDetails.rosters.find(roster => 
          roster.owner_id === request.userId
        );
        userRoster = userRosterData;
        
      } catch (directAPIError) {
        console.warn('Direct Sleeper API failed for trade analysis, using MCP fallback:', directAPIError);
        // MCP fallback would go here - for now, throw error
        throw directAPIError;
      }

      // Build AI prompt with gathered data
      const systemPrompt = this.buildTradeAnalysisSystemPrompt(request);
      const userPrompt = this.buildTradeAnalysisUserPrompt(request, leagueData, playersData, userRoster);

      const aiRequest: AIRequest = {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        maxTokens: 4000,
        temperature: 0.1,
        provider: request.userPreferences?.riskTolerance === 'aggressive' ? AIProvider.CLAUDE : AIProvider.OPENAI,
      };

      const aiResponse = await this.chat(aiRequest);
      const analysis = this.parseTradeAnalysisResponse(aiResponse.content, request);

      // Store analysis in database
      await this.storeTradeAnalysis(request, analysis, aiResponse.provider);

      return analysis;
    } catch (error) {
      console.error('Trade analysis failed:', error);
      throw new Error(`Trade analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Waiver Wire Analysis with Direct API + MCP Fallback
  async analyzeWaiverWire(request: WaiverWireRequest): Promise<WaiverWireAnalysis> {
    try {
      console.log(`Analyzing waiver wire for user ${request.userId}, week ${request.week}`);

      // Look up the league in database to get Sleeper league ID
      const league = await this.prisma.league.findUnique({
        where: { id: request.leagueId },
      });

      if (!league) {
        throw new Error(`League not found for ID: ${request.leagueId}`);
      }

      console.log(`Found league: ${league.name} (Sleeper ID: ${league.sleeperLeagueId})`);

      // Get fantasy data using direct Sleeper API
      let leagueData, playersData, userRoster;
      
      try {
        console.log('Using direct Sleeper API for waiver wire data');
        const [leagueDetails, allPlayers] = await Promise.all([
          this.sleeperAPI.getLeagueDetailsBatch(league.sleeperLeagueId),
          this.sleeperAPI.getAllPlayers(),
        ]);
        
        leagueData = leagueDetails;
        playersData = allPlayers;
        
        userRoster = leagueDetails.rosters.find(roster => 
          roster.owner_id === request.userId
        );
        
      } catch (directAPIError) {
        console.warn('Direct Sleeper API failed for waiver wire, using MCP fallback:', directAPIError);
        throw directAPIError;
      }

      // Build AI prompt
      const systemPrompt = this.buildWaiverWireSystemPrompt(request);
      const userPrompt = this.buildWaiverWireUserPrompt(request, leagueData, playersData, userRoster);

      const aiRequest: AIRequest = {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        maxTokens: 4000,
        temperature: 0.1,
        provider: AIProvider.CLAUDE,
      };

      const aiResponse = await this.chat(aiRequest);
      const analysis = this.parseWaiverWireResponse(aiResponse.content, request);

      // Store analysis in database
      await this.storeWaiverWireAnalysis(request, analysis, aiResponse.provider);

      return analysis;
    } catch (error) {
      console.error('Waiver wire analysis failed:', error);
      throw new Error(`Waiver wire analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Lineup Optimizer with Direct API + MCP Fallback
  async optimizeLineup(request: LineupOptimizerRequest): Promise<LineupOptimizerResult> {
    try {
      console.log(`Optimizing lineup for user ${request.userId}, week ${request.week}`);

      // Look up the league in database to get Sleeper league ID
      const league = await this.prisma.league.findUnique({
        where: { id: request.leagueId },
      });

      if (!league) {
        throw new Error(`League not found for ID: ${request.leagueId}`);
      }

      console.log(`Found league: ${league.name} (Sleeper ID: ${league.sleeperLeagueId})`);

      // Get fantasy data using direct Sleeper API
      let leagueData, playersData, userRoster;
      
      try {
        console.log('Using direct Sleeper API for lineup optimization');
        const [leagueDetails, allPlayers] = await Promise.all([
          this.sleeperAPI.getLeagueDetailsBatch(league.sleeperLeagueId),
          this.sleeperAPI.getAllPlayers(),
        ]);
        
        leagueData = leagueDetails;
        playersData = allPlayers;
        
        userRoster = leagueDetails.rosters.find(roster => 
          roster.owner_id === request.userId
        );
        
      } catch (directAPIError) {
        console.warn('Direct Sleeper API failed for lineup optimization, using MCP fallback:', directAPIError);
        throw directAPIError;
      }

      // Build AI prompt
      const systemPrompt = this.buildLineupOptimizerSystemPrompt(request);
      const userPrompt = this.buildLineupOptimizerUserPrompt(request, leagueData, playersData, userRoster);

      const aiRequest: AIRequest = {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        maxTokens: 4000,
        temperature: 0.1,
        provider: AIProvider.CLAUDE,
      };

      const aiResponse = await this.chat(aiRequest);
      const analysis = this.parseLineupOptimizerResponse(aiResponse.content, request);

      // Store analysis in database
      await this.storeLineupOptimizerAnalysis(request, analysis, aiResponse.provider);

      return analysis;
    } catch (error) {
      console.error('Lineup optimization failed:', error);
      throw new Error(`Lineup optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildStartSitSystemPrompt(request: StartSitRequest): string {
    const riskProfile = request.userPreferences?.riskTolerance || 'moderate';
    
    return `You are an expert fantasy football analyst specializing in start/sit decisions. Your goal is to help users optimize their weekly lineups for maximum points.

ANALYSIS FRAMEWORK:
1. Consider matchup difficulty based on opposing team defenses
2. Factor in player health, recent performance trends, and usage patterns
3. Account for weather conditions and game scripts
4. Evaluate upside vs. floor based on user risk tolerance: ${riskProfile}

RISK TOLERANCE GUIDELINES:
- Conservative: Prioritize high floor, consistent performers, avoid risky plays
- Moderate: Balance floor and ceiling, consider favorable matchups
- Aggressive: Chase upside and boom potential, accept higher variance

OUTPUT REQUIREMENTS:
You must respond with a valid JSON object containing:
{
  "recommendations": [
    {
      "playerId": "string",
      "playerName": "string", 
      "position": "string",
      "recommendation": "start|sit|flex",
      "confidence": 0.0-1.0,
      "reasoning": "detailed explanation",
      "projectedPoints": {
        "floor": number,
        "ceiling": number,
        "expected": number
      },
      "matchupAnalysis": {
        "opponent": "string",
        "difficulty": "easy|medium|hard",
        "keyFactors": ["array", "of", "factors"]
      },
      "riskFactors": ["array", "of", "risks"],
      "alternativeOptions": ["optional", "alternatives"]
    }
  ],
  "optimalLineup": {
    "QB": "playerId",
    "RB1": "playerId",
    "RB2": "playerId",
    "WR1": "playerId",
    "WR2": "playerId",
    "TE": "playerId",
    "FLEX": "playerId",
    "K": "playerId",
    "DEF": "playerId"
  },
  "benchPlayers": ["arrayOfPlayerIds"],
  "confidenceScore": 0.0-1.0,
  "weeklyOutlook": "overall analysis summary",
  "keyInsights": ["array", "of", "key", "insights"]
}

Be thorough but concise in your reasoning. Focus on actionable insights.`;
  }

  private buildStartSitUserPrompt(
    request: StartSitRequest, 
    leagueData: any, 
    playersData: any, 
    userRoster: any
  ): string {
    const preferences = request.userPreferences;
    const preferencesText = preferences ? `
User Preferences:
- Risk Tolerance: ${preferences.riskTolerance}
- Prioritize Upside: ${preferences.prioritizeUpside ? 'Yes' : 'No'}
- Avoid Injured Players: ${preferences.avoidInjuredPlayers ? 'Yes' : 'No'}
` : '';

    // Build player information from direct API data
    const playerInfo = request.playerIds.map(playerId => {
      const player = playersData[playerId];
      if (!player) return `Player ${playerId}: Data not available`;
      
      return `Player ${playerId} (${player.full_name}): ${player.position} - ${player.team || 'FA'} - Status: ${player.status || 'Active'}`;
    }).join('\n');

    const leagueInfo = `
League: ${leagueData.league.name} (${leagueData.league.season})
Scoring: ${leagueData.league.scoring_settings ? 'PPR' : 'Standard'}
Total Teams: ${leagueData.league.total_rosters}
`;

    return `Please analyze the start/sit decisions for my fantasy team this week.

LEAGUE DETAILS:
${leagueInfo}
- Week: ${request.week}
- User ID: ${request.userId}

PLAYER INFORMATION:
${playerInfo}

AVAILABLE ROSTER SLOTS: ${request.rosterSlots.join(', ')}

${preferencesText}

Please provide detailed start/sit recommendations with optimal lineup construction. Consider:
- Projected points vs. actual scoring potential
- Matchup advantages/disadvantages  
- Player health and status
- Recent form and usage trends
- Weather and game script implications
- Risk/reward trade-offs

Focus on maximizing my team's scoring potential for this specific week.`;
  }

  private parseStartSitResponse(aiResponse: string, request: StartSitRequest): StartSitAnalysis {
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        throw new Error('Invalid recommendations format');
      }

      if (!parsed.optimalLineup || typeof parsed.optimalLineup !== 'object') {
        throw new Error('Invalid optimal lineup format');
      }

      // Ensure all recommendations have required fields
      const validatedRecommendations: StartSitRecommendation[] = parsed.recommendations.map((rec: any) => ({
        playerId: rec.playerId || 'unknown',
        playerName: rec.playerName || 'Unknown Player',
        position: rec.position || 'UNKNOWN',
        recommendation: ['start', 'sit', 'flex'].includes(rec.recommendation) ? rec.recommendation : 'sit',
        confidence: Math.max(0, Math.min(1, rec.confidence || 0.5)),
        reasoning: rec.reasoning || 'No reasoning provided',
        projectedPoints: {
          floor: rec.projectedPoints?.floor || 0,
          ceiling: rec.projectedPoints?.ceiling || 0,
          expected: rec.projectedPoints?.expected || 0,
        },
        matchupAnalysis: {
          opponent: rec.matchupAnalysis?.opponent || 'Unknown',
          difficulty: ['easy', 'medium', 'hard'].includes(rec.matchupAnalysis?.difficulty) 
            ? rec.matchupAnalysis.difficulty : 'medium',
          keyFactors: Array.isArray(rec.matchupAnalysis?.keyFactors) 
            ? rec.matchupAnalysis.keyFactors : [],
        },
        riskFactors: Array.isArray(rec.riskFactors) ? rec.riskFactors : [],
        alternativeOptions: Array.isArray(rec.alternativeOptions) ? rec.alternativeOptions : undefined,
      }));

      return {
        recommendations: validatedRecommendations,
        optimalLineup: parsed.optimalLineup,
        benchPlayers: Array.isArray(parsed.benchPlayers) ? parsed.benchPlayers : [],
        confidenceScore: Math.max(0, Math.min(1, parsed.confidenceScore || 0.7)),
        weeklyOutlook: parsed.weeklyOutlook || 'Analysis completed',
        keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Failed to parse start/sit response:', error);
      
      // Return fallback analysis
      return {
        recommendations: request.playerIds.map(playerId => ({
          playerId,
          playerName: 'Unknown Player',
          position: 'UNKNOWN',
          recommendation: 'sit' as const,
          confidence: 0.1,
          reasoning: 'Analysis failed - manual review required',
          projectedPoints: { floor: 0, ceiling: 0, expected: 0 },
          matchupAnalysis: {
            opponent: 'Unknown',
            difficulty: 'medium' as const,
            keyFactors: ['Analysis failed'],
          },
          riskFactors: ['AI analysis unavailable'],
        })),
        optimalLineup: {},
        benchPlayers: request.playerIds,
        confidenceScore: 0.1,
        weeklyOutlook: 'Analysis failed - please try again',
        keyInsights: ['AI analysis is currently unavailable'],
        lastUpdated: new Date(),
      };
    }
  }

  private async storeStartSitAnalysis(
    request: StartSitRequest, 
    analysis: StartSitAnalysis, 
    provider: AIProvider
  ): Promise<void> {
    try {
      await this.prisma.aIAnalysis.create({
        data: {
          userId: request.userId,
          leagueId: request.leagueId,
          analysisType: 'start_sit',
          input: JSON.stringify(request),
          output: JSON.stringify(analysis),
          metadata: {
            provider: provider,
            confidence: analysis.confidenceScore,
            week: request.week,
            playerCount: request.playerIds.length,
            riskTolerance: request.userPreferences?.riskTolerance || 'moderate',
          },
        },
      });
      console.log('Start/Sit analysis stored in database');
    } catch (error) {
      console.error('Failed to store start/sit analysis:', error);
      // Non-critical error - continue without storage
    }
  }

  // Trade Analysis Helper Methods
  private buildTradeAnalysisSystemPrompt(request: TradeAnalysisRequest): string {
    const riskProfile = request.userPreferences?.riskTolerance || 'moderate';
    
    return `You are an expert fantasy football trade analyst. Your goal is to provide comprehensive trade analysis that helps users make informed decisions.

ANALYSIS FRAMEWORK:
1. Evaluate player values based on current performance, future projections, and positional scarcity
2. Consider team needs, roster construction, and positional depth
3. Account for schedule strength, injury risk, and role security
4. Factor in league format, scoring settings, and trade deadline implications
5. Apply risk tolerance: ${riskProfile}

OUTPUT REQUIREMENTS:
You must respond with a valid JSON object containing:
{
  "overallGrade": "A+|A|B+|B|C+|C|D+|D|F",
  "fairnessScore": 0.0-1.0,
  "recommendation": "accept|reject|negotiate",
  "reasoning": "detailed explanation",
  "impactAnalysis": {
    "team1Impact": {
      "positionalImpact": {"QB": number, "RB": number, "WR": number, "TE": number},
      "weeklyProjection": number,
      "seasonProjection": number
    },
    "team2Impact": {
      "positionalImpact": {"QB": number, "RB": number, "WR": number, "TE": number},
      "weeklyProjection": number,
      "seasonProjection": number
    }
  },
  "playerAnalysis": {
    "playerId": {
      "playerName": "string",
      "position": "string",
      "currentValue": number,
      "futureValue": number,
      "risk": "low|medium|high",
      "notes": "string"
    }
  },
  "alternativeOptions": ["array", "of", "suggestions"],
  "riskFactors": ["array", "of", "risks"],
  "keyInsights": ["array", "of", "insights"]
}`;
  }

  private buildTradeAnalysisUserPrompt(
    request: TradeAnalysisRequest,
    leagueData: any,
    playersData: any,
    userRoster: any
  ): string {
    const preferences = request.userPreferences;
    const preferencesText = preferences ? `
User Preferences:
- Risk Tolerance: ${preferences.riskTolerance}
- Favor Long Term: ${preferences.favorLongTerm ? 'Yes' : 'No'}
- Priority Position: ${preferences.prioritizePosition || 'None'}
` : '';

    // Build player information
    const allPlayerIds = [
      ...request.team1Players.give,
      ...request.team1Players.receive,
      ...request.team2Players.give,
      ...request.team2Players.receive
    ];

    const playerInfo = allPlayerIds.map(playerId => {
      const player = playersData[playerId];
      if (!player) return `Player ${playerId}: Data not available`;
      
      return `Player ${playerId} (${player.full_name}): ${player.position} - ${player.team || 'FA'} - Status: ${player.status || 'Active'}`;
    }).join('\n');

    return `Please analyze this trade proposal for my fantasy team.

LEAGUE DETAILS:
League: ${leagueData.league.name} (${leagueData.league.season})
Week: ${request.week}

TRADE PROPOSAL:
Team 1 Gives: ${request.team1Players.give.join(', ')}
Team 1 Receives: ${request.team1Players.receive.join(', ')}

Team 2 Gives: ${request.team2Players.give.join(', ')}
Team 2 Receives: ${request.team2Players.receive.join(', ')}

PLAYER INFORMATION:
${playerInfo}

${preferencesText}

Please provide a comprehensive trade analysis including:
- Overall trade grade and fairness assessment
- Impact on both teams' roster construction
- Individual player value analysis
- Risk factors and considerations
- Alternative trade suggestions if applicable

Focus on providing actionable insights for making the trade decision.`;
  }

  private parseTradeAnalysisResponse(aiResponse: string, request: TradeAnalysisRequest): TradeAnalysisResult {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        overallGrade: parsed.overallGrade || 'C',
        fairnessScore: Math.max(0, Math.min(1, parsed.fairnessScore || 0.5)),
        recommendation: ['accept', 'reject', 'negotiate'].includes(parsed.recommendation) ? parsed.recommendation : 'negotiate',
        reasoning: parsed.reasoning || 'Analysis incomplete',
        impactAnalysis: {
          team1Impact: {
            positionalImpact: parsed.impactAnalysis?.team1Impact?.positionalImpact || {},
            weeklyProjection: parsed.impactAnalysis?.team1Impact?.weeklyProjection || 0,
            seasonProjection: parsed.impactAnalysis?.team1Impact?.seasonProjection || 0,
          },
          team2Impact: {
            positionalImpact: parsed.impactAnalysis?.team2Impact?.positionalImpact || {},
            weeklyProjection: parsed.impactAnalysis?.team2Impact?.weeklyProjection || 0,
            seasonProjection: parsed.impactAnalysis?.team2Impact?.seasonProjection || 0,
          },
        },
        playerAnalysis: parsed.playerAnalysis || {},
        alternativeOptions: Array.isArray(parsed.alternativeOptions) ? parsed.alternativeOptions : [],
        riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
        keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Failed to parse trade analysis response:', error);
      
      return {
        overallGrade: 'C',
        fairnessScore: 0.5,
        recommendation: 'negotiate',
        reasoning: 'Analysis failed - manual review required',
        impactAnalysis: {
          team1Impact: { positionalImpact: {}, weeklyProjection: 0, seasonProjection: 0 },
          team2Impact: { positionalImpact: {}, weeklyProjection: 0, seasonProjection: 0 },
        },
        playerAnalysis: {},
        alternativeOptions: [],
        riskFactors: ['AI analysis unavailable'],
        keyInsights: ['Manual trade evaluation recommended'],
        lastUpdated: new Date(),
      };
    }
  }

  // Waiver Wire Helper Methods
  private buildWaiverWireSystemPrompt(request: WaiverWireRequest): string {
    const riskProfile = request.userPreferences?.riskTolerance || 'moderate';
    
    return `You are an expert fantasy football waiver wire analyst. Your goal is to identify the best available players and optimal acquisition strategy.

ANALYSIS FRAMEWORK:
1. Identify high-value available players based on opportunity, talent, and matchups
2. Consider positional needs and roster construction
3. Factor in FAAB budget management and waiver priority strategy
4. Evaluate short-term vs long-term value based on user preferences
5. Apply risk tolerance: ${riskProfile}

OUTPUT REQUIREMENTS:
You must respond with a valid JSON object containing:
{
  "recommendations": [
    {
      "playerId": "string",
      "playerName": "string",
      "position": "string",
      "priority": "high|medium|low",
      "bidAmount": number,
      "reasoning": "string",
      "projectedValue": {
        "thisWeek": number,
        "nextThreeWeeks": number,
        "seasonLong": number
      },
      "availabilityLikelihood": 0.0-1.0,
      "dropCandidates": ["playerId1", "playerId2"]
    }
  ],
  "streamingOptions": {
    "QB": [],
    "DEF": [],
    "K": []
  },
  "budgetStrategy": {
    "recommendedSpend": number,
    "savingsTarget": number,
    "reasoning": "string"
  },
  "dropCandidates": [
    {
      "playerId": "string",
      "playerName": "string",
      "dropPriority": "safe|consider|drop",
      "reasoning": "string"
    }
  ],
  "keyInsights": ["array", "of", "insights"]
}`;
  }

  private buildWaiverWireUserPrompt(
    request: WaiverWireRequest,
    leagueData: any,
    playersData: any,
    userRoster: any
  ): string {
    const preferences = request.userPreferences;
    const preferencesText = preferences ? `
User Preferences:
- Risk Tolerance: ${preferences.riskTolerance}
- Streaming Strategy: ${preferences.streamingStrategy ? 'Yes' : 'No'}
- Dynasty Mode: ${preferences.dynastyMode ? 'Yes' : 'No'}
` : '';

    const budgetText = request.budget ? `FAAB Budget Remaining: $${request.budget}` : '';
    const priorityText = request.priorityPosition ? `Waiver Priority: ${request.priorityPosition}` : '';
    const targetPositions = request.targetPositions ? `Target Positions: ${request.targetPositions.join(', ')}` : '';

    return `Please analyze waiver wire opportunities for my fantasy team.

LEAGUE DETAILS:
League: ${leagueData.league.name} (${leagueData.league.season})
Week: ${request.week}
${budgetText}
${priorityText}
${targetPositions}

CURRENT ROSTER:
${userRoster ? `Roster Players: ${userRoster.players?.join(', ') || 'No players found'}` : 'Roster not found'}

${preferencesText}

Please provide comprehensive waiver wire analysis including:
- Priority player recommendations with bid amounts
- Streaming options for QB/DEF/K positions
- FAAB budget strategy and allocation
- Drop candidates from current roster
- Key insights and strategic recommendations

Focus on maximizing roster value and weekly scoring potential.`;
  }

  private parseWaiverWireResponse(aiResponse: string, request: WaiverWireRequest): WaiverWireAnalysis {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map((rec: any) => ({
          playerId: rec.playerId || 'unknown',
          playerName: rec.playerName || 'Unknown Player',
          position: rec.position || 'UNKNOWN',
          priority: ['high', 'medium', 'low'].includes(rec.priority) ? rec.priority : 'medium',
          bidAmount: rec.bidAmount || 0,
          reasoning: rec.reasoning || 'No reasoning provided',
          projectedValue: {
            thisWeek: rec.projectedValue?.thisWeek || 0,
            nextThreeWeeks: rec.projectedValue?.nextThreeWeeks || 0,
            seasonLong: rec.projectedValue?.seasonLong || 0,
          },
          availabilityLikelihood: Math.max(0, Math.min(1, rec.availabilityLikelihood || 0.5)),
          dropCandidates: Array.isArray(rec.dropCandidates) ? rec.dropCandidates : [],
        })) : [],
        streamingOptions: parsed.streamingOptions || {},
        budgetStrategy: {
          recommendedSpend: parsed.budgetStrategy?.recommendedSpend || 0,
          savingsTarget: parsed.budgetStrategy?.savingsTarget || 0,
          reasoning: parsed.budgetStrategy?.reasoning || 'No strategy provided',
        },
        dropCandidates: Array.isArray(parsed.dropCandidates) ? parsed.dropCandidates : [],
        keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Failed to parse waiver wire response:', error);
      
      return {
        recommendations: [],
        streamingOptions: {},
        budgetStrategy: {
          recommendedSpend: 0,
          savingsTarget: 0,
          reasoning: 'Analysis failed - manual review required',
        },
        dropCandidates: [],
        keyInsights: ['AI waiver wire analysis is currently unavailable'],
        lastUpdated: new Date(),
      };
    }
  }

  // Lineup Optimizer Helper Methods
  private buildLineupOptimizerSystemPrompt(request: LineupOptimizerRequest): string {
    const optimization = request.optimization || 'balanced';
    
    return `You are an expert fantasy football lineup optimizer. Your goal is to construct the highest-scoring lineup based on projections, matchups, and constraints.

OPTIMIZATION STRATEGY: ${optimization}
- ceiling: Maximize upside potential, accept higher variance
- floor: Prioritize safe, consistent performers
- balanced: Balance floor and ceiling considerations

OUTPUT REQUIREMENTS:
You must respond with a valid JSON object containing:
{
  "optimalLineup": {
    "QB": {
      "playerId": "string",
      "playerName": "string", 
      "projectedPoints": number,
      "confidence": 0.0-1.0
    }
  },
  "alternativeLineups": [
    {
      "name": "string",
      "lineup": {"QB": "playerId"},
      "projectedTotal": number,
      "reasoning": "string"
    }
  ],
  "benchOptimization": [
    {
      "playerId": "string",
      "playerName": "string",
      "flexEligible": boolean,
      "projectedPoints": number
    }
  ],
  "projectedTotal": number,
  "confidenceScore": 0.0-1.0,
  "riskFactors": ["array", "of", "risks"],
  "keyDecisions": [
    {
      "position": "string",
      "alternatives": [
        {
          "playerId": "string",
          "playerName": "string",
          "pros": ["array"],
          "cons": ["array"]
        }
      ]
    }
  ]
}`;
  }

  private buildLineupOptimizerUserPrompt(
    request: LineupOptimizerRequest,
    leagueData: any,
    playersData: any,
    userRoster: any
  ): string {
    const constraints = request.constraints;
    const constraintsText = constraints ? `
Constraints:
- Must Start: ${constraints.mustStart?.join(', ') || 'None'}
- Must Sit: ${constraints.mustSit?.join(', ') || 'None'}
- QB/WR Stack Preference: ${constraints.stackPreferences?.qbWr ? 'Yes' : 'No'}
- QB/TE Stack Preference: ${constraints.stackPreferences?.qbTe ? 'Yes' : 'No'}
- Avoid Opponents: ${constraints.avoidOpponents?.join(', ') || 'None'}
` : '';

    const preferences = request.userPreferences;
    const preferencesText = preferences ? `
User Preferences:
- Risk Tolerance: ${preferences.riskTolerance}
- Favor Projections: ${preferences.favorProjections ? 'Yes' : 'No'}
- Favor Matchups: ${preferences.favorMatchups ? 'Yes' : 'No'}
` : '';

    return `Please optimize my fantasy football lineup for maximum scoring potential.

LEAGUE DETAILS:
League: ${leagueData.league.name} (${leagueData.league.season})
Week: ${request.week}
Optimization Target: ${request.optimization || 'balanced'}

AVAILABLE PLAYERS:
${userRoster ? `Roster Players: ${userRoster.players?.join(', ') || 'No players found'}` : 'Roster not found'}

${constraintsText}
${preferencesText}

Please provide optimal lineup construction including:
- Best lineup with projected point totals
- Alternative lineup options with different strategies
- Bench optimization and flex considerations
- Key decisions and trade-offs
- Risk factors and confidence assessment

Focus on maximizing expected points while considering the specified optimization strategy.`;
  }

  private parseLineupOptimizerResponse(aiResponse: string, request: LineupOptimizerRequest): LineupOptimizerResult {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        optimalLineup: parsed.optimalLineup || {},
        alternativeLineups: Array.isArray(parsed.alternativeLineups) ? parsed.alternativeLineups : [],
        benchOptimization: Array.isArray(parsed.benchOptimization) ? parsed.benchOptimization : [],
        projectedTotal: parsed.projectedTotal || 0,
        confidenceScore: Math.max(0, Math.min(1, parsed.confidenceScore || 0.7)),
        riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
        keyDecisions: Array.isArray(parsed.keyDecisions) ? parsed.keyDecisions : [],
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Failed to parse lineup optimizer response:', error);
      
      return {
        optimalLineup: {},
        alternativeLineups: [],
        benchOptimization: [],
        projectedTotal: 0,
        confidenceScore: 0.1,
        riskFactors: ['AI lineup optimization unavailable'],
        keyDecisions: [],
        lastUpdated: new Date(),
      };
    }
  }

  // Storage Methods for New Analysis Types
  private async storeTradeAnalysis(
    request: TradeAnalysisRequest,
    analysis: TradeAnalysisResult,
    provider: AIProvider
  ): Promise<void> {
    try {
      await this.prisma.aIAnalysis.create({
        data: {
          userId: request.userId,
          leagueId: request.leagueId,
          analysisType: 'trade_analysis',
          input: JSON.stringify(request),
          output: JSON.stringify(analysis),
          metadata: {
            provider: provider,
            grade: analysis.overallGrade,
            recommendation: analysis.recommendation,
            week: request.week,
            riskTolerance: request.userPreferences?.riskTolerance || 'moderate',
          },
        },
      });
      console.log('Trade analysis stored in database');
    } catch (error) {
      console.error('Failed to store trade analysis:', error);
    }
  }

  private async storeWaiverWireAnalysis(
    request: WaiverWireRequest,
    analysis: WaiverWireAnalysis,
    provider: AIProvider
  ): Promise<void> {
    try {
      await this.prisma.aIAnalysis.create({
        data: {
          userId: request.userId,
          leagueId: request.leagueId,
          analysisType: 'waiver_wire',
          input: JSON.stringify(request),
          output: JSON.stringify(analysis),
          metadata: {
            provider: provider,
            recommendationCount: analysis.recommendations.length,
            week: request.week,
            riskTolerance: request.userPreferences?.riskTolerance || 'moderate',
          },
        },
      });
      console.log('Waiver wire analysis stored in database');
    } catch (error) {
      console.error('Failed to store waiver wire analysis:', error);
    }
  }

  private async storeLineupOptimizerAnalysis(
    request: LineupOptimizerRequest,
    analysis: LineupOptimizerResult,
    provider: AIProvider
  ): Promise<void> {
    try {
      await this.prisma.aIAnalysis.create({
        data: {
          userId: request.userId,
          leagueId: request.leagueId,
          analysisType: 'lineup_optimizer',
          input: JSON.stringify(request),
          output: JSON.stringify(analysis),
          metadata: {
            provider: provider,
            projectedTotal: analysis.projectedTotal,
            confidence: analysis.confidenceScore,
            optimization: request.optimization || 'balanced',
            week: request.week,
          },
        },
      });
      console.log('Lineup optimizer analysis stored in database');
    } catch (error) {
      console.error('Failed to store lineup optimizer analysis:', error);
    }
  }

  // Direct AI Provider Implementations
  private async callClaudeDirect(request: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.1,
        messages: request.messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json() as {
      content: Array<{ text: string }>;
      usage: {
        input_tokens: number;
        output_tokens: number;
      };
    };
    
    return {
      content: data.content[0].text,
      provider: AIProvider.CLAUDE,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
    };
  }

  private async callOpenAIDirect(request: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: request.messages,
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json() as {
      choices: Array<{
        message: {
          content: string;
        };
      }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };
    
    return {
      content: data.choices[0].message.content,
      provider: AIProvider.OPENAI,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }

  private async callGeminiDirect(request: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: request.messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })),
        generationConfig: {
          maxOutputTokens: request.maxTokens || 2000,
          temperature: request.temperature || 0.1,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json() as {
      candidates: Array<{
        content: {
          parts: Array<{ text: string }>;
        };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };
    
    return {
      content: data.candidates[0].content.parts[0].text,
      provider: AIProvider.GEMINI,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
    };
  }

  private getDefaultProvider(): AIProvider {
    if (process.env.ANTHROPIC_API_KEY) return AIProvider.CLAUDE;
    if (process.env.OPENAI_API_KEY) return AIProvider.OPENAI;
    if (process.env.GEMINI_API_KEY) return AIProvider.GEMINI;
    return AIProvider.CLAUDE; // Default even if not configured
  }

  // Health check method
  async healthCheck(): Promise<{ 
    directProviders: Record<AIProvider, boolean>;
    mcpService: boolean;
    sleeperAPI: boolean;
  }> {
    const results = {
      directProviders: {} as Record<AIProvider, boolean>,
      mcpService: false,
      sleeperAPI: false,
    };

    // Check direct AI providers
    for (const provider of [AIProvider.CLAUDE, AIProvider.OPENAI, AIProvider.GEMINI]) {
      try {
        await this.callAIProviderDirect({
          messages: [{ role: 'user', content: 'test' }],
          maxTokens: 1,
          provider,
        });
        results.directProviders[provider] = true;
      } catch {
        results.directProviders[provider] = false;
      }
    }

    // Check MCP AI service
    try {
      await this.callAIServiceMCP({
        messages: [{ role: 'user', content: 'test' }],
        maxTokens: 1,
      });
      results.mcpService = true;
    } catch {
      results.mcpService = false;
    }

    // Check Sleeper API
    try {
      await this.sleeperAPI.healthCheck();
      results.sleeperAPI = true;
    } catch {
      results.sleeperAPI = false;
    }

    return results;
  }
}

export const aiService = new AIService();