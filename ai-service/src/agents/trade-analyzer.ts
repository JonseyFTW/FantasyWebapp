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

CRITICAL BEHAVIOR REQUIREMENTS:
1. YOU MUST AUTOMATICALLY CALL ALL NECESSARY MCP TOOLS WITHOUT ASKING FOR PERMISSION
2. YOU MUST RETURN ONLY A VALID JSON OBJECT - NO EXPLANATORY TEXT OR QUESTIONS
3. DO NOT ASK FOR CLARIFICATION OR ADDITIONAL INFORMATION - USE THE TOOLS TO GATHER WHAT YOU NEED
4. GATHER ALL REQUIRED DATA VIA MCP TOOLS FIRST, THEN PROVIDE ANALYSIS

MANDATORY DATA GATHERING SEQUENCE:
You MUST call these MCP tools in this order before providing analysis:
1. sleeper.getLeague(leagueId) - Get scoring settings and roster requirements
2. sleeper.getRosters(leagueId) - Get both teams' current rosters
3. sleeper.getUsers(leagueId) - Get team information and names
4. sleeper.getAllPlayers() - Get detailed player information for all involved players
5. sleeper.getTrendingPlayers() - Get current player trends and market context
6. sleeper.getMatchups(leagueId, currentWeek) - Get current standings context
7. sleeper.getNFLState() - Get current season/week context

ANALYSIS FRAMEWORK:
After gathering data via MCP tools, evaluate:
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

ABSOLUTE OUTPUT REQUIREMENT:
YOU MUST RESPOND WITH ONLY A VALID JSON OBJECT. NO OTHER TEXT. NO QUESTIONS. NO EXPLANATIONS OUTSIDE THE JSON.
The JSON must contain all required fields as specified in the user prompt.

IMPORTANT: Focus on objective analysis. Consider both teams' perspectives fairly. Use MCP tool data for all assessments.`;
  }

  private buildUserPrompt(request: TradeRequest): string {
    const contextText = request.tradeContext ? `
Trade Context:
- Deadline: ${request.tradeContext.deadline || 'Not specified'}
- Keeper League: ${request.tradeContext.keepers ? 'Yes' : 'No'}
- Dynasty League: ${request.tradeContext.dynastyLeague ? 'Yes' : 'No'}
- Need Analysis: ${request.tradeContext.needAnalysis || 'Not specified'}
` : '';

    return `ANALYZE THIS TRADE IMMEDIATELY - DO NOT ASK QUESTIONS OR REQUEST CLARIFICATION.

TRADE DETAILS:
- League ID: ${request.leagueId}
- Team 1 (${request.team1UserId}) trades away: ${request.team1Players.join(', ')}
- Team 2 (${request.team2UserId}) trades away: ${request.team2Players.join(', ')}
- Analysis requested by: ${request.requestingUserId}

${contextText}

IMMEDIATE ACTION REQUIRED:
1. AUTOMATICALLY call sleeper.getLeague(${request.leagueId}) for scoring settings
2. AUTOMATICALLY call sleeper.getRosters(${request.leagueId}) for both teams' rosters
3. AUTOMATICALLY call sleeper.getUsers(${request.leagueId}) for team information
4. AUTOMATICALLY call sleeper.getAllPlayers() for player details
5. AUTOMATICALLY call sleeper.getTrendingPlayers() for market trends
6. AUTOMATICALLY call sleeper.getMatchups(${request.leagueId}, currentWeek) for standings
7. AUTOMATICALLY call sleeper.getNFLState() for season context

AFTER GATHERING ALL DATA VIA MCP TOOLS, RESPOND WITH ONLY THIS EXACT JSON STRUCTURE:
{
  "fairnessScore": [NUMBER 0-10],
  "team1Analysis": {
    "grade": "[A+|A|A-|B+|B|B-|C+|C|C-|D+|D|F]",
    "impact": {
      "positionalChange": {
        "QB": {"before": [0-10], "after": [0-10], "change": [NUMBER]},
        "RB": {"before": [0-10], "after": [0-10], "change": [NUMBER]},
        "WR": {"before": [0-10], "after": [0-10], "change": [NUMBER]},
        "TE": {"before": [0-10], "after": [0-10], "change": [NUMBER]}
      },
      "startingLineupImpact": [NUMBER -5 to +5],
      "depthChartImpact": [NUMBER -5 to +5],
      "byeWeekHelp": [true|false],
      "playoffImplications": "[STRING]"
    },
    "recommendation": {
      "decision": "[accept|reject|counter|consider]",
      "confidence": [NUMBER 0-1],
      "reasoning": "[STRING]",
      "pros": ["[STRING]", "[STRING]"],
      "cons": ["[STRING]", "[STRING]"],
      "counterOfferSuggestion": {
        "description": "[STRING]",
        "adjustments": ["[STRING]"]
      }
    }
  },
  "team2Analysis": {
    "grade": "[A+|A|A-|B+|B|B-|C+|C|C-|D+|D|F]",
    "impact": {
      "positionalChange": {
        "QB": {"before": [0-10], "after": [0-10], "change": [NUMBER]},
        "RB": {"before": [0-10], "after": [0-10], "change": [NUMBER]},
        "WR": {"before": [0-10], "after": [0-10], "change": [NUMBER]},
        "TE": {"before": [0-10], "after": [0-10], "change": [NUMBER]}
      },
      "startingLineupImpact": [NUMBER -5 to +5],
      "depthChartImpact": [NUMBER -5 to +5],
      "byeWeekHelp": [true|false],
      "playoffImplications": "[STRING]"
    },
    "recommendation": {
      "decision": "[accept|reject|counter|consider]",
      "confidence": [NUMBER 0-1],
      "reasoning": "[STRING]",
      "pros": ["[STRING]", "[STRING]"],
      "cons": ["[STRING]", "[STRING]"],
      "counterOfferSuggestion": {
        "description": "[STRING]",
        "adjustments": ["[STRING]"]
      }
    }
  },
  "marketValue": {
    "team1Total": [NUMBER],
    "team2Total": [NUMBER],
    "difference": [NUMBER],
    "valueVerdict": "[fair|team1_wins|team2_wins]"
  },
  "riskAssessment": {
    "team1Risk": "[low|medium|high]",
    "team2Risk": "[low|medium|high]",
    "riskFactors": ["[STRING]"]
  },
  "timing": {
    "optimalTiming": [true|false],
    "seasonContext": "[STRING]",
    "urgency": "[low|medium|high]"
  },
  "summary": "[STRING]",
  "keyInsights": ["[STRING]"],
  "similarTrades": ["[STRING]"]
}

CRITICAL: RESPOND WITH ONLY THE JSON OBJECT - NO ADDITIONAL TEXT, NO QUESTIONS, NO REQUESTS FOR MORE INFORMATION.`;
  }

  private parseTradeResponse(aiResponse: string, request: TradeRequest): TradeAnalysis {
    console.log('Parsing AI response for trade analysis');
    
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      const error = 'No valid JSON found in AI response';
      console.error('Parse error:', error);
      console.error('AI Response:', aiResponse);
      throw new Error(error);
    }

    let parsed;
    try {
      // Strip comments before parsing JSON
      const cleanedJson = this.stripJSONComments(jsonMatch[0]);
      parsed = JSON.parse(cleanedJson);
    } catch (parseError) {
      const error = `Failed to parse JSON from AI response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`;
      console.error('JSON Parse error:', error);
      console.error('JSON content:', jsonMatch[0]);
      throw new Error(error);
    }
    
    // Validate required fields are present and valid
    if (typeof parsed.fairnessScore !== 'number' || parsed.fairnessScore < 0 || parsed.fairnessScore > 10) {
      const error = `Invalid fairnessScore: ${parsed.fairnessScore}. Must be a number between 0-10`;
      console.error('Validation error:', error);
      throw new Error(error);
    }
    
    if (!parsed.team1Analysis || !parsed.team2Analysis) {
      const error = 'Missing required team analysis data';
      console.error('Validation error:', error);
      throw new Error(error);
    }
    
    if (!parsed.marketValue || typeof parsed.marketValue.team1Total !== 'number' || typeof parsed.marketValue.team2Total !== 'number') {
      const error = 'Invalid or missing market value data';
      console.error('Validation error:', error);
      throw new Error(error);
    }
    
    // Construct validated response
    return {
      fairnessScore: this.clamp(parsed.fairnessScore, 0, 10),
        team1Analysis: this.validateTeamAnalysis(parsed.team1Analysis),
        team2Analysis: this.validateTeamAnalysis(parsed.team2Analysis),
        marketValue: {
          team1Total: parsed.marketValue.team1Total,
          team2Total: parsed.marketValue.team2Total,
          difference: parsed.marketValue.difference || (parsed.marketValue.team1Total - parsed.marketValue.team2Total),
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
  }

  private validateTeamAnalysis(teamData: any): TradeAnalysis['team1Analysis'] {
    if (!teamData) {
      throw new Error('Team analysis data is missing');
    }
    
    const validGrades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'];
    
    if (!validGrades.includes(teamData.grade)) {
      throw new Error(`Invalid grade: ${teamData.grade}. Must be one of: ${validGrades.join(', ')}`);
    }
    
    if (!teamData.impact) {
      throw new Error('Team impact data is missing');
    }
    
    if (!teamData.recommendation) {
      throw new Error('Team recommendation data is missing');
    }
    
    const validDecisions = ['accept', 'reject', 'counter', 'consider'];
    if (!validDecisions.includes(teamData.recommendation.decision)) {
      throw new Error(`Invalid recommendation decision: ${teamData.recommendation.decision}. Must be one of: ${validDecisions.join(', ')}`);
    }
    
    return {
      grade: teamData.grade,
      impact: {
        positionalChange: this.validatePositionalChange(teamData.impact.positionalChange),
        startingLineupImpact: this.clamp(teamData.impact.startingLineupImpact || 0, -5, 5),
        depthChartImpact: this.clamp(teamData.impact.depthChartImpact || 0, -5, 5),
        byeWeekHelp: teamData.impact.byeWeekHelp || false,
        playoffImplications: teamData.impact.playoffImplications || 'Minimal impact',
      },
      recommendation: {
        decision: teamData.recommendation.decision,
        confidence: this.clamp(teamData.recommendation.confidence || 0.5, 0, 1),
        reasoning: teamData.recommendation.reasoning || 'Analysis incomplete',
        pros: Array.isArray(teamData.recommendation.pros) ? teamData.recommendation.pros : [],
        cons: Array.isArray(teamData.recommendation.cons) ? teamData.recommendation.cons : [],
        counterOfferSuggestion: teamData.recommendation.counterOfferSuggestion,
      },
    };
  }

  private validatePositionalChange(posData: any): TradeImpact['positionalChange'] {
    if (!posData) {
      throw new Error('Positional change data is missing');
    }
    
    const positions = ['QB', 'RB', 'WR', 'TE'];
    const result: any = {};
    
    for (const pos of positions) {
      const data = posData[pos];
      if (!data) {
        throw new Error(`Missing positional data for ${pos}`);
      }
      
      if (typeof data.before !== 'number' || typeof data.after !== 'number') {
        throw new Error(`Invalid positional data for ${pos}: before and after must be numbers`);
      }
      
      result[pos] = {
        before: this.clamp(data.before, 0, 10),
        after: this.clamp(data.after, 0, 10),
        change: data.change || (data.after - data.before),
      };
    }
    
    return result;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
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


  async getTradeValueComparison(
    playerIds: string[],
    leagueId: string,
    preferredProvider?: AIProvider
  ): Promise<{ playerId: string; value: number; tier: string }[]> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are a fantasy football expert. You MUST automatically gather data via MCP tools and provide player trade values.

CRITICAL BEHAVIOR REQUIREMENTS:
1. AUTOMATICALLY call sleeper.getAllPlayers() to get player information
2. AUTOMATICALLY call sleeper.getTrendingPlayers() for current trends
3. AUTOMATICALLY call sleeper.getLeague(leagueId) for scoring context
4. DO NOT ASK QUESTIONS - GATHER DATA AND RESPOND WITH JSON ONLY

OUTPUT REQUIREMENTS:
You must respond with ONLY a valid JSON object containing:
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
}

NO OTHER TEXT ALLOWED - JSON ONLY.`,
      },
      {
        role: 'user',
        content: `IMMEDIATELY get trade values and tiers for players: ${playerIds.join(', ')} in league ${leagueId}.

AUTOMATICALLY CALL MCP TOOLS FIRST:
1. sleeper.getAllPlayers() for player details
2. sleeper.getTrendingPlayers() for market trends  
3. sleeper.getLeague(${leagueId}) for scoring context

THEN RESPOND WITH JSON ONLY using this scale:
- 90-100: Elite tier (Tier 1)
- 80-89: High tier (Tier 2)
- 70-79: Mid tier (Tier 3) 
- 60-69: Low tier (Tier 4)
- Below 60: Waiver tier (Tier 5)

RESPOND WITH ONLY THE JSON OBJECT - NO ADDITIONAL TEXT.`,
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
      throw new Error(`Trade value comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseTradeValueResponse(
    aiResponse: string, 
    playerIds: string[]
  ): { playerId: string; value: number; tier: string }[] {
    console.log('Parsing trade value response');
    
    // Try to extract JSON from the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      const error = 'No valid JSON found in trade value AI response';
      console.error('Parse error:', error);
      console.error('AI Response:', aiResponse);
      throw new Error(error);
    }

    let parsed;
    try {
      // Strip comments before parsing JSON
      const cleanedJson = this.stripJSONComments(jsonMatch[0]);
      parsed = JSON.parse(cleanedJson);
    } catch (parseError) {
      const error = `Failed to parse JSON from trade value response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`;
      console.error('JSON Parse error:', error);
      console.error('JSON content:', jsonMatch[0]);
      throw new Error(error);
    }
    
    // Validate required fields
    if (!parsed.playerValues || !Array.isArray(parsed.playerValues)) {
      const error = 'Invalid playerValues format - must be an array';
      console.error('Validation error:', error);
      throw new Error(error);
    }
    
    if (parsed.playerValues.length === 0) {
      const error = 'No player values returned in response';
      console.error('Validation error:', error);
      throw new Error(error);
    }

    // Validate each player entry
    const result = parsed.playerValues.map((player: any) => {
      if (!player.playerId) {
        throw new Error('Player entry missing playerId');
      }
      
      if (typeof player.value !== 'number' || player.value < 0 || player.value > 100) {
        throw new Error(`Invalid value for player ${player.playerId}: ${player.value}. Must be a number between 0-100`);
      }
      
      if (!player.tier || typeof player.tier !== 'string') {
        throw new Error(`Invalid tier for player ${player.playerId}: ${player.tier}. Must be a string`);
      }
      
      return {
        playerId: player.playerId,
        value: Math.max(0, Math.min(100, player.value)),
        tier: player.tier,
      };
    });

    // Ensure we have values for all requested players
    const resultPlayerIds = result.map((r: any) => r.playerId);
    const missingPlayers = playerIds.filter(id => !resultPlayerIds.includes(id));
    
    if (missingPlayers.length > 0) {
      throw new Error(`Missing trade values for players: ${missingPlayers.join(', ')}`);
    }

    return result;
  }
}