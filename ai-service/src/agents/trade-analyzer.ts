import { AIManager } from '../services/ai-manager';
import { AIProvider, AIMessage } from '../types/ai-providers';

export interface TradeRequest {
  leagueId: string;
  team1UserId: string;
  team2UserId: string;
  team1Players: string[]; // Player IDs being traded away by team 1
  team2Players: string[]; // Player IDs being traded away by team 2
  requestingUserId: string; // Who is asking for the analysis
  tradeContext?: {
    deadline?: Date;
    keepers?: boolean;
    dynastyLeague?: boolean;
    needAnalysis?: string; // "Need RB help", "Selling high on QB", etc.
  };
}

export interface TradeImpact {
  positionalChange: {
    [position: string]: {
      before: number; // strength rating 1-10
      after: number;
      change: number; // positive = improvement
    };
  };
  startingLineupImpact: number; // -5 to +5 scale
  depthChartImpact: number; // -5 to +5 scale
  byeWeekHelp: boolean;
  playoffImplications: string;
}

export interface TradeRecommendation {
  decision: 'accept' | 'reject' | 'counter' | 'consider';
  confidence: number; // 0-1
  reasoning: string;
  pros: string[];
  cons: string[];
  counterOfferSuggestion?: {
    description: string;
    adjustments: string[];
  };
}

export interface TradeAnalysis {
  fairnessScore: number; // 0-10 scale (5 = perfectly fair)
  team1Analysis: {
    grade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'F';
    impact: TradeImpact;
    recommendation: TradeRecommendation;
  };
  team2Analysis: {
    grade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'F';
    impact: TradeImpact;
    recommendation: TradeRecommendation;
  };
  marketValue: {
    team1Total: number;
    team2Total: number;
    difference: number;
    valueVerdict: 'fair' | 'team1_wins' | 'team2_wins';
  };
  riskAssessment: {
    team1Risk: 'low' | 'medium' | 'high';
    team2Risk: 'low' | 'medium' | 'high';
    riskFactors: string[];
  };
  timing: {
    optimalTiming: boolean;
    seasonContext: string;
    urgency: 'low' | 'medium' | 'high';
  };
  summary: string;
  keyInsights: string[];
  similarTrades?: string[];
  lastUpdated: Date;
}

export class TradeAnalyzer {
  constructor(private aiManager: AIManager) {}

  async analyzeTrade(
    request: TradeRequest,
    preferredProvider?: AIProvider
  ): Promise<TradeAnalysis> {
    console.log(`Analyzing trade between teams ${request.team1UserId} and ${request.team2UserId}`);

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
          maxTokens: 5000,
          temperature: 0.1,
        },
        preferredProvider,
        true // Enable MCP for data fetching
      );

      return this.parseTradeResponse(response.content, request);
    } catch (error) {
      console.error('Trade analysis failed:', error);
      throw new Error(`Trade analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildSystemPrompt(request: TradeRequest): string {
    return `You are an expert fantasy football trade analyst with deep knowledge of player values, market trends, and roster construction. Your goal is to provide comprehensive, unbiased trade analysis.

ANALYSIS FRAMEWORK:
1. Use MCP tools to gather comprehensive data on all players and teams involved
2. Evaluate both immediate and long-term impact for both teams
3. Consider league context, scoring settings, and roster construction
4. Assess risk factors including injury history, age, and situation changes
5. Compare market values using multiple valuation methods
6. Consider timing and season context (early season vs. playoff push)

EVALUATION CRITERIA:
- Player Value: Current ranking, projection accuracy, upside/downside
- Positional Need: Does the trade address roster weaknesses?
- Depth Impact: How does this affect bench strength and bye week coverage?
- Risk Assessment: Injury history, age curve, team situation stability
- Market Timing: Is this the right time to buy/sell these assets?
- League Context: Keeper/dynasty implications, current standings

GRADING SCALE:
A+/A/A- = Excellent trade, significant improvement
B+/B/B- = Good trade, modest improvement  
C+/C/C- = Fair trade, minimal impact
D+/D/F = Poor trade, hurts team

OUTPUT REQUIREMENTS:
You must respond with a valid JSON object containing all required fields. Be thorough but concise in analysis.

IMPORTANT: Focus on objective analysis. Consider both teams' perspectives fairly.`;
  }

  private buildUserPrompt(request: TradeRequest): string {
    const contextText = request.tradeContext ? `
Trade Context:
- Deadline: ${request.tradeContext.deadline || 'Not specified'}
- Keeper League: ${request.tradeContext.keepers ? 'Yes' : 'No'}
- Dynasty League: ${request.tradeContext.dynastyLeague ? 'Yes' : 'No'}
- Need Analysis: ${request.tradeContext.needAnalysis || 'Not specified'}
` : '';

    return `Please analyze this proposed fantasy football trade in detail.

TRADE DETAILS:
- League ID: ${request.leagueId}
- Team 1 (${request.team1UserId}) trades away: ${request.team1Players.join(', ')}
- Team 2 (${request.team2UserId}) trades away: ${request.team2Players.join(', ')}
- Analysis requested by: ${request.requestingUserId}

${contextText}

REQUIRED ANALYSIS STEPS:
1. Use get_league to understand scoring settings and roster requirements
2. Use get_league_rosters to get both teams' current rosters  
3. Use get_league_users to get team information
4. Use get_players_nfl to get detailed player information for all involved players
5. Use get_projections for rest-of-season outlook
6. Use get_player_stats for recent performance and trends
7. Use get_league_matchups to understand current standings context

COMPREHENSIVE ANALYSIS NEEDED:
{
  "fairnessScore": 0-10,
  "team1Analysis": {
    "grade": "letter grade",
    "impact": {
      "positionalChange": {
        "QB": {"before": 0-10, "after": 0-10, "change": number},
        "RB": {"before": 0-10, "after": 0-10, "change": number},
        "WR": {"before": 0-10, "after": 0-10, "change": number},
        "TE": {"before": 0-10, "after": 0-10, "change": number}
      },
      "startingLineupImpact": -5 to +5,
      "depthChartImpact": -5 to +5,
      "byeWeekHelp": boolean,
      "playoffImplications": "string"
    },
    "recommendation": {
      "decision": "accept|reject|counter|consider",
      "confidence": 0-1,
      "reasoning": "detailed explanation",
      "pros": ["array of positives"],
      "cons": ["array of negatives"],
      "counterOfferSuggestion": {
        "description": "suggested adjustment",
        "adjustments": ["specific changes"]
      }
    }
  },
  "team2Analysis": { /* same structure as team1Analysis */ },
  "marketValue": {
    "team1Total": number,
    "team2Total": number, 
    "difference": number,
    "valueVerdict": "fair|team1_wins|team2_wins"
  },
  "riskAssessment": {
    "team1Risk": "low|medium|high",
    "team2Risk": "low|medium|high", 
    "riskFactors": ["array of risk factors"]
  },
  "timing": {
    "optimalTiming": boolean,
    "seasonContext": "early season|mid season|playoff push|etc",
    "urgency": "low|medium|high"
  },
  "summary": "overall trade assessment",
  "keyInsights": ["array of key insights"],
  "similarTrades": ["optional similar trade examples"]
}

Provide detailed, actionable analysis that helps users make informed decisions.`;
  }

  private parseTradeResponse(aiResponse: string, request: TradeRequest): TradeAnalysis {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and construct the response with fallbacks
      return {
        fairnessScore: this.clamp(parsed.fairnessScore || 5, 0, 10),
        team1Analysis: this.validateTeamAnalysis(parsed.team1Analysis),
        team2Analysis: this.validateTeamAnalysis(parsed.team2Analysis),
        marketValue: {
          team1Total: parsed.marketValue?.team1Total || 0,
          team2Total: parsed.marketValue?.team2Total || 0,
          difference: parsed.marketValue?.difference || 0,
          valueVerdict: ['fair', 'team1_wins', 'team2_wins'].includes(parsed.marketValue?.valueVerdict) 
            ? parsed.marketValue.valueVerdict : 'fair',
        },
        riskAssessment: {
          team1Risk: ['low', 'medium', 'high'].includes(parsed.riskAssessment?.team1Risk) 
            ? parsed.riskAssessment.team1Risk : 'medium',
          team2Risk: ['low', 'medium', 'high'].includes(parsed.riskAssessment?.team2Risk)
            ? parsed.riskAssessment.team2Risk : 'medium',
          riskFactors: Array.isArray(parsed.riskAssessment?.riskFactors) 
            ? parsed.riskAssessment.riskFactors : [],
        },
        timing: {
          optimalTiming: parsed.timing?.optimalTiming || false,
          seasonContext: parsed.timing?.seasonContext || 'Unknown timing',
          urgency: ['low', 'medium', 'high'].includes(parsed.timing?.urgency)
            ? parsed.timing.urgency : 'medium',
        },
        summary: parsed.summary || 'Trade analysis completed',
        keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
        similarTrades: Array.isArray(parsed.similarTrades) ? parsed.similarTrades : undefined,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Failed to parse trade response:', error);
      
      // Return fallback analysis
      return this.createFallbackAnalysis(request);
    }
  }

  private validateTeamAnalysis(teamData: any): TradeAnalysis['team1Analysis'] {
    const validGrades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'];
    
    return {
      grade: validGrades.includes(teamData?.grade) ? teamData.grade : 'C',
      impact: {
        positionalChange: this.validatePositionalChange(teamData?.impact?.positionalChange),
        startingLineupImpact: this.clamp(teamData?.impact?.startingLineupImpact || 0, -5, 5),
        depthChartImpact: this.clamp(teamData?.impact?.depthChartImpact || 0, -5, 5),
        byeWeekHelp: teamData?.impact?.byeWeekHelp || false,
        playoffImplications: teamData?.impact?.playoffImplications || 'Minimal impact',
      },
      recommendation: {
        decision: ['accept', 'reject', 'counter', 'consider'].includes(teamData?.recommendation?.decision)
          ? teamData.recommendation.decision : 'consider',
        confidence: this.clamp(teamData?.recommendation?.confidence || 0.5, 0, 1),
        reasoning: teamData?.recommendation?.reasoning || 'Analysis incomplete',
        pros: Array.isArray(teamData?.recommendation?.pros) ? teamData.recommendation.pros : [],
        cons: Array.isArray(teamData?.recommendation?.cons) ? teamData.recommendation.cons : [],
        counterOfferSuggestion: teamData?.recommendation?.counterOfferSuggestion,
      },
    };
  }

  private validatePositionalChange(posData: any): TradeImpact['positionalChange'] {
    const positions = ['QB', 'RB', 'WR', 'TE'];
    const result: any = {};
    
    for (const pos of positions) {
      const data = posData?.[pos];
      result[pos] = {
        before: this.clamp(data?.before || 5, 0, 10),
        after: this.clamp(data?.after || 5, 0, 10),
        change: data?.change || 0,
      };
    }
    
    return result;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private createFallbackAnalysis(request: TradeRequest): TradeAnalysis {
    const fallbackTeamAnalysis = {
      grade: 'C' as const,
      impact: {
        positionalChange: {
          QB: { before: 5, after: 5, change: 0 },
          RB: { before: 5, after: 5, change: 0 },
          WR: { before: 5, after: 5, change: 0 },
          TE: { before: 5, after: 5, change: 0 },
        },
        startingLineupImpact: 0,
        depthChartImpact: 0,
        byeWeekHelp: false,
        playoffImplications: 'Analysis unavailable',
      },
      recommendation: {
        decision: 'consider' as const,
        confidence: 0.1,
        reasoning: 'Analysis failed - manual review required',
        pros: [],
        cons: ['AI analysis unavailable'],
      },
    };

    return {
      fairnessScore: 5,
      team1Analysis: fallbackTeamAnalysis,
      team2Analysis: fallbackTeamAnalysis,
      marketValue: {
        team1Total: 0,
        team2Total: 0,
        difference: 0,
        valueVerdict: 'fair',
      },
      riskAssessment: {
        team1Risk: 'medium',
        team2Risk: 'medium',
        riskFactors: ['Analysis unavailable'],
      },
      timing: {
        optimalTiming: false,
        seasonContext: 'Unknown',
        urgency: 'medium',
      },
      summary: 'Trade analysis failed - please try again',
      keyInsights: ['AI analysis is currently unavailable'],
      lastUpdated: new Date(),
    };
  }

  async getTradeValueComparison(
    playerIds: string[],
    leagueId: string,
    preferredProvider?: AIProvider
  ): Promise<{ playerId: string; value: number; tier: string }[]> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are a fantasy football expert. Provide player trade values and tiers. Use MCP tools for current data.

OUTPUT REQUIREMENTS:
You must respond with a valid JSON object containing:
{
  "playerValues": [
    {
      "playerId": "string",
      "playerName": "string",
      "value": number (0-100 scale),
      "tier": "string (Tier 1-5)",
      "reasoning": "brief explanation"
    }
  ]
}`,
      },
      {
        role: 'user',
        content: `Get trade values and tiers for players: ${playerIds.join(', ')} in league ${leagueId}. 
        
Use current stats, projections, and recent performance. Rate each player on a 0-100 scale where:
- 90-100: Elite tier (Tier 1)
- 80-89: High tier (Tier 2) 
- 70-79: Mid tier (Tier 3)
- 60-69: Low tier (Tier 4)
- Below 60: Waiver tier (Tier 5)`,
      },
    ];

    try {
      const response = await this.aiManager.chat(
        { messages, maxTokens: 2000, temperature: 0.1 },
        preferredProvider,
        true
      );

      return this.parseTradeValueResponse(response.content, playerIds);
    } catch (error) {
      console.error('Error getting trade value comparison:', error);
      // Return fallback values
      return playerIds.map(playerId => ({
        playerId,
        value: 50,
        tier: 'Tier 3',
      }));
    }
  }

  private parseTradeValueResponse(
    aiResponse: string, 
    playerIds: string[]
  ): { playerId: string; value: number; tier: string }[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.playerValues || !Array.isArray(parsed.playerValues)) {
        throw new Error('Invalid playerValues format');
      }

      // Map the response to expected format
      const result = parsed.playerValues.map((player: any) => ({
        playerId: player.playerId || 'unknown',
        value: typeof player.value === 'number' ? Math.max(0, Math.min(100, player.value)) : 50,
        tier: player.tier || 'Tier 3',
      }));

      // Ensure we have values for all requested players
      const resultPlayerIds = result.map((r: any) => r.playerId);
      const missingPlayers = playerIds.filter(id => !resultPlayerIds.includes(id));
      
      for (const playerId of missingPlayers) {
        result.push({
          playerId,
          value: 50,
          tier: 'Tier 3',
        });
      }

      return result;
    } catch (error) {
      console.error('Error parsing trade value response:', error);
      // Return fallback values for all players
      return playerIds.map(playerId => ({
        playerId,
        value: 50,
        tier: 'Tier 3',
      }));
    }
  }
}