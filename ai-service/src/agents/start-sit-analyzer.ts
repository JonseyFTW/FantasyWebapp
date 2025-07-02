import { AIManager } from '../services/ai-manager';
import { AIProvider, AIMessage } from '../types/ai-providers';

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
  confidence: number; // 0-1
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
    [position: string]: string; // position -> playerId
  };
  benchPlayers: string[];
  confidenceScore: number;
  weeklyOutlook: string;
  keyInsights: string[];
  lastUpdated: Date;
}

export class StartSitAnalyzer {
  constructor(private aiManager: AIManager) {}

  async analyzeStartSit(
    request: StartSitRequest,
    preferredProvider?: AIProvider
  ): Promise<StartSitAnalysis> {
    console.log(`Analyzing start/sit for user ${request.userId}, week ${request.week}`);

    const systemPrompt = this.buildSystemPrompt(request);
    const userPrompt = this.buildUserPrompt(request);

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      const response = await this.aiManager.chat(
        {
          messages,
          maxTokens: 4000,
          temperature: 0.1,
        },
        preferredProvider,
        true // Enable MCP for data fetching
      );

      return this.parseStartSitResponse(response.content, request);
    } catch (error) {
      console.error('Start/Sit analysis failed:', error);
      throw new Error(`Start/Sit analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildSystemPrompt(request: StartSitRequest): string {
    const riskProfile = request.userPreferences?.riskTolerance || 'moderate';
    
    return `You are an expert fantasy football analyst specializing in start/sit decisions. Your goal is to help users optimize their weekly lineups for maximum points.

ANALYSIS FRAMEWORK:
1. Use MCP tools to gather current player data, stats, projections, and league information
2. Consider matchup difficulty based on opposing team defenses
3. Factor in player health, recent performance trends, and usage patterns
4. Account for weather conditions and game scripts
5. Evaluate upside vs. floor based on user risk tolerance: ${riskProfile}

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

  private buildUserPrompt(request: StartSitRequest): string {
    const preferences = request.userPreferences;
    const preferencesText = preferences ? `
User Preferences:
- Risk Tolerance: ${preferences.riskTolerance}
- Prioritize Upside: ${preferences.prioritizeUpside ? 'Yes' : 'No'}
- Avoid Injured Players: ${preferences.avoidInjuredPlayers ? 'Yes' : 'No'}
` : '';

    return `Please analyze the start/sit decisions for my fantasy team this week.

LEAGUE DETAILS:
- League ID: ${request.leagueId}
- Week: ${request.week}
- User ID: ${request.userId}

ROSTER ANALYSIS NEEDED:
- Player IDs to analyze: ${request.playerIds.join(', ')}
- Available roster slots: ${request.rosterSlots.join(', ')}

${preferencesText}

REQUIRED ANALYSIS STEPS:
1. Use get_league to understand scoring settings and roster requirements
2. Use get_league_rosters to get my current roster
3. Use sleeper.getAllPlayers to get player information
4. Use sleeper.getTrendingPlayers to understand current player popularity
5. Use get_league_matchups to understand opponent matchups
6. Use sleeper.getMatchups to understand weekly matchup context

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

      const parsed = JSON.parse(this.stripJSONComments(jsonMatch[0]));
      
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

  async getQuickRecommendation(
    playerId: string,
    leagueId: string,
    week: number,
    preferredProvider?: AIProvider
  ): Promise<StartSitRecommendation> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are a fantasy football expert. Provide a quick start/sit recommendation for a single player. Use MCP tools to get current data and respond with valid JSON.`,
      },
      {
        role: 'user',
        content: `Quick start/sit recommendation for player ${playerId} in league ${leagueId} for week ${week}. Get player info, stats, and projections using MCP tools.`,
      },
    ];

    const response = await this.aiManager.chat(
      { messages, maxTokens: 1000, temperature: 0.1 },
      preferredProvider,
      true
    );

    // Parse single recommendation from response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(this.stripJSONComments(jsonMatch[0]));
        return {
          playerId: parsed.playerId || playerId,
          playerName: parsed.playerName || 'Unknown Player',
          position: parsed.position || 'UNKNOWN',
          recommendation: parsed.recommendation || 'sit',
          confidence: parsed.confidence || 0.5,
          reasoning: parsed.reasoning || 'Quick analysis',
          projectedPoints: parsed.projectedPoints || { floor: 0, ceiling: 0, expected: 0 },
          matchupAnalysis: parsed.matchupAnalysis || {
            opponent: 'Unknown',
            difficulty: 'medium',
            keyFactors: [],
          },
          riskFactors: parsed.riskFactors || [],
        };
      } catch (error) {
        console.error('Failed to parse quick recommendation:', error);
      }
    }

    // Fallback recommendation
    return {
      playerId,
      playerName: 'Unknown Player',
      position: 'UNKNOWN',
      recommendation: 'sit',
      confidence: 0.1,
      reasoning: 'Quick analysis failed',
      projectedPoints: { floor: 0, ceiling: 0, expected: 0 },
      matchupAnalysis: {
        opponent: 'Unknown',
        difficulty: 'medium',
        keyFactors: [],
      },
      riskFactors: ['Analysis unavailable'],
    };
  }

  /**
   * Strip single-line and multi-line comments from JSON string
   * This helps handle AI responses that include comments in JSON
   */
  private stripJSONComments(jsonString: string): string {
    // Remove single-line comments (// comment)
    let cleaned = jsonString.replace(/\/\/.*$/gm, '');
    
    // Remove multi-line comments (/* comment */)
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove trailing commas that might be left after comment removal
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
    
    return cleaned;
  }
}