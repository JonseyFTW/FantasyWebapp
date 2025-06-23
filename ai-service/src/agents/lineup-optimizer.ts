import { AIManager } from '../services/ai-manager';
import { AIProvider, AIMessage } from '../types/ai-providers';

export interface LineupOptimizerRequest {
  userId: string;
  leagueId: string;
  week: number;
  availablePlayers: string[]; // Player IDs available to start
  rosterSlots: string[]; // Required lineup slots (QB, RB1, RB2, WR1, WR2, TE, FLEX, DST, K)
  userPreferences?: {
    riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
    prioritizeFloor?: boolean; // vs. prioritize ceiling
    stackPreference?: 'qb_wr' | 'qb_te' | 'none'; // Stacking preferences
    avoidOpponents?: boolean; // Avoid players facing each other
    weatherConcerns?: boolean; // Factor in weather conditions
  };
  constraints?: {
    mustStart?: string[]; // Player IDs that must be in lineup
    cannotStart?: string[]; // Player IDs to avoid
    maxPlayersPerTeam?: number;
    minProjectedPoints?: number;
  };
}

export interface PlayerProjection {
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  opponent: string;
  projectedPoints: {
    floor: number;
    expected: number;
    ceiling: number;
  };
  confidence: number; // 0-1
  startProbability: number; // 0-100%
  variance: number; // Statistical variance in projection
  matchupRating: 'excellent' | 'good' | 'average' | 'poor' | 'terrible';
  factors: {
    recentForm: number; // -2 to +2
    matchupAdvantage: number; // -2 to +2
    weatherImpact: number; // -2 to +2
    injuryRisk: number; // 0-2 (higher = more risk)
    gameScript: number; // -2 to +2
  };
  reasoning: string;
}

export interface LineupScenario {
  scenarioName: string;
  lineup: { [position: string]: string }; // position -> playerId
  projectedTotal: {
    floor: number;
    expected: number;
    ceiling: number;
  };
  confidence: number; // 0-1
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string;
  advantages: string[];
  concerns: string[];
  winProbability?: number; // 0-100% (if opponent lineup available)
}

export interface BenchAnalysis {
  playerId: string;
  playerName: string;
  position: string;
  benchReason: string;
  alternativeScenarios: string[]; // When this player could be started
  keepOrDrop: 'keep' | 'consider_dropping' | 'drop_candidate';
  upcomingValue: {
    nextWeek: number; // 1-10 scale
    restOfSeason: number; // 1-10 scale
    playoffSchedule: number; // 1-10 scale
  };
}

export interface LineupOptimization {
  optimalLineup: LineupScenario;
  alternativeLineups: LineupScenario[];
  playerProjections: PlayerProjection[];
  benchAnalysis: BenchAnalysis[];
  keyDecisions: {
    position: string;
    options: {
      playerId: string;
      playerName: string;
      pros: string[];
      cons: string[];
      recommendation: 'start' | 'bench' | 'consider';
    }[];
    recommendation: string;
  }[];
  stackingOpportunities?: {
    players: string[];
    correlation: number; // 0-1
    upside: string;
    risk: string;
  }[];
  lastUpdated: Date;
}

export class LineupOptimizer {
  constructor(private aiManager: AIManager) {}

  async optimizeLineup(
    request: LineupOptimizerRequest,
    preferredProvider?: AIProvider
  ): Promise<LineupOptimization> {
    console.log(`Optimizing lineup for user ${request.userId}, week ${request.week}`);

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
          maxTokens: 8000,
          temperature: 0.1,
        },
        preferredProvider,
        true // Enable MCP for data fetching
      );

      return this.parseLineupResponse(response.content, request);
    } catch (error) {
      console.error('Lineup optimization failed:', error);
      throw new Error(`Lineup optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildSystemPrompt(request: LineupOptimizerRequest): string {
    const riskProfile: 'conservative' | 'moderate' | 'aggressive' = request.userPreferences?.riskTolerance || 'moderate';
    const floorFocus = request.userPreferences?.prioritizeFloor || false;

    return `You are an expert fantasy football lineup optimizer with deep statistical knowledge and game theory expertise. Your goal is to construct the optimal lineup for maximizing points while considering risk tolerance.

OPTIMIZATION FRAMEWORK:
1. Use MCP tools to gather comprehensive player data, projections, and matchup information
2. Calculate floor, expected, and ceiling projections for each player
3. Consider correlations between players (stacking opportunities and conflicts)
4. Factor in game script, weather, and injury risks
5. Optimize for the user's specific risk tolerance and preferences
6. Provide multiple lineup scenarios for different strategic approaches

RISK TOLERANCE GUIDELINES:
- Conservative: Prioritize high-floor players, avoid volatile options, minimize bust potential
- Moderate: Balance floor and ceiling, mix safe and upside plays
- Aggressive: Chase ceiling outcomes, accept higher variance, target boom-or-bust players

${floorFocus ? `
FLOOR-FOCUSED STRATEGY:
- Prioritize consistent performers with predictable usage
- Avoid players with high variance or uncertain roles
- Focus on game script favorable situations
- Target players in positive matchups with stable target shares
` : `
CEILING-FOCUSED STRATEGY:
- Target players with high upside potential
- Consider volatile players with league-winning upside
- Factor in positive game script scenarios
- Look for correlation opportunities (stacking)
`}

LINEUP CONSTRUCTION PRINCIPLES:
1. Position Scarcity: Consider positional depth and replacement level
2. Game Stacking: Identify games with high scoring potential
3. Contrarian Plays: Find low-owned high-upside players
4. Matchup Exploitation: Target favorable defensive matchups
5. Weather Impact: Account for outdoor games in poor conditions
6. Injury Situations: Monitor snap counts and target shares

OUTPUT REQUIREMENTS:
You must respond with a valid JSON object following the exact schema. Provide detailed analysis and clear reasoning for all recommendations.`;
  }

  private buildUserPrompt(request: LineupOptimizerRequest): string {
    const preferences = request.userPreferences;
    const constraints = request.constraints;

    const preferencesText = preferences ? `
User Preferences:
- Risk Tolerance: ${preferences.riskTolerance}
- Prioritize Floor: ${preferences.prioritizeFloor ? 'Yes' : 'No'}
- Stacking Preference: ${preferences.stackPreference || 'None specified'}
- Avoid Opponents: ${preferences.avoidOpponents ? 'Yes' : 'No'}
- Weather Concerns: ${preferences.weatherConcerns ? 'Yes' : 'No'}
` : '';

    const constraintsText = constraints ? `
Lineup Constraints:
${constraints.mustStart?.length ? `- Must Start: ${constraints.mustStart.join(', ')}` : ''}
${constraints.cannotStart?.length ? `- Cannot Start: ${constraints.cannotStart.join(', ')}` : ''}
${constraints.maxPlayersPerTeam ? `- Max Players Per Team: ${constraints.maxPlayersPerTeam}` : ''}
${constraints.minProjectedPoints ? `- Minimum Projected Points: ${constraints.minProjectedPoints}` : ''}
` : '';

    return `Please optimize my fantasy football lineup for maximum expected points while considering my preferences and constraints.

LINEUP DETAILS:
- League ID: ${request.leagueId} (Use this ID for all MCP tool calls)
- Week: ${request.week}
- User ID: ${request.userId}
- Available Players: ${request.availablePlayers.join(', ')}
- Roster Slots: ${request.rosterSlots.join(', ')}

${preferencesText}${constraintsText}

REQUIRED ANALYSIS STEPS:
1. Use get_league with the League ID to understand scoring settings and roster requirements
2. Use get_league_rosters with the League ID to get current roster and opponent information
3. Use get_players_nfl to get detailed player information
4. Use get_projections for rest-of-season and weekly projections
5. Use get_player_stats for recent performance trends
6. Use get_matchups to understand opponent context and game environment
7. Use get_nfl_state for current week context and bye weeks

COMPREHENSIVE LINEUP OPTIMIZATION NEEDED:
{
  "optimalLineup": {
    "scenarioName": "Optimal Expected Points",
    "lineup": {
      "QB": "playerId",
      "RB1": "playerId", 
      "RB2": "playerId",
      "WR1": "playerId",
      "WR2": "playerId",
      "TE": "playerId",
      "FLEX": "playerId",
      "DST": "playerId",
      "K": "playerId"
    },
    "projectedTotal": {
      "floor": number,
      "expected": number,
      "ceiling": number
    },
    "confidence": 0.0-1.0,
    "riskLevel": "low|medium|high",
    "reasoning": "explanation of lineup construction",
    "advantages": ["array of advantages"],
    "concerns": ["array of concerns"],
    "winProbability": 0-100
  },
  "alternativeLineups": [
    {
      "scenarioName": "High Floor",
      "lineup": {...},
      "projectedTotal": {...},
      "confidence": 0.0-1.0,
      "riskLevel": "low|medium|high", 
      "reasoning": "explanation",
      "advantages": ["advantages"],
      "concerns": ["concerns"]
    },
    {
      "scenarioName": "High Ceiling",
      "lineup": {...},
      "projectedTotal": {...},
      "confidence": 0.0-1.0,
      "riskLevel": "low|medium|high",
      "reasoning": "explanation", 
      "advantages": ["advantages"],
      "concerns": ["concerns"]
    }
  ],
  "playerProjections": [
    {
      "playerId": "string",
      "playerName": "string",
      "position": "string",
      "team": "string",
      "opponent": "string",
      "projectedPoints": {
        "floor": number,
        "expected": number,
        "ceiling": number
      },
      "confidence": 0.0-1.0,
      "startProbability": 0-100,
      "variance": number,
      "matchupRating": "excellent|good|average|poor|terrible",
      "factors": {
        "recentForm": -2 to +2,
        "matchupAdvantage": -2 to +2,
        "weatherImpact": -2 to +2,
        "injuryRisk": 0-2,
        "gameScript": -2 to +2
      },
      "reasoning": "detailed explanation"
    }
  ],
  "benchAnalysis": [
    {
      "playerId": "string",
      "playerName": "string", 
      "position": "string",
      "benchReason": "why not starting",
      "alternativeScenarios": ["when to consider starting"],
      "keepOrDrop": "keep|consider_dropping|drop_candidate",
      "upcomingValue": {
        "nextWeek": 1-10,
        "restOfSeason": 1-10,
        "playoffSchedule": 1-10
      }
    }
  ],
  "keyDecisions": [
    {
      "position": "FLEX",
      "options": [
        {
          "playerId": "string",
          "playerName": "string",
          "pros": ["advantages"],
          "cons": ["disadvantages"], 
          "recommendation": "start|bench|consider"
        }
      ],
      "recommendation": "final recommendation with reasoning"
    }
  ],
  "stackingOpportunities": [
    {
      "players": ["playerId1", "playerId2"],
      "correlation": 0.0-1.0,
      "upside": "stacking upside explanation",
      "risk": "stacking risk explanation"
    }
  ]
}

Focus on providing:
- Detailed projections with floor/ceiling ranges
- Clear reasoning for each lineup decision
- Multiple strategic approaches (conservative vs. aggressive)
- Specific advice for close decisions
- Stack identification and correlation analysis
- Bench player value assessment for future weeks

Be thorough but actionable in your recommendations.`;
  }

  private parseLineupResponse(aiResponse: string, request: LineupOptimizerRequest): LineupOptimization {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        optimalLineup: this.validateLineupScenario(parsed.optimalLineup),
        alternativeLineups: Array.isArray(parsed.alternativeLineups) 
          ? parsed.alternativeLineups.map((lineup: any) => this.validateLineupScenario(lineup))
          : [],
        playerProjections: this.validatePlayerProjections(parsed.playerProjections || []),
        benchAnalysis: this.validateBenchAnalysis(parsed.benchAnalysis || []),
        keyDecisions: this.validateKeyDecisions(parsed.keyDecisions || []),
        stackingOpportunities: this.validateStackingOpportunities(parsed.stackingOpportunities || []),
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Failed to parse lineup response:', error);
      return this.createFallbackOptimization(request);
    }
  }

  private validateLineupScenario(scenario: any): LineupScenario {
    return {
      scenarioName: scenario?.scenarioName || 'Unknown Scenario',
      lineup: scenario?.lineup || {},
      projectedTotal: {
        floor: scenario?.projectedTotal?.floor || 0,
        expected: scenario?.projectedTotal?.expected || 0,
        ceiling: scenario?.projectedTotal?.ceiling || 0,
      },
      confidence: Math.max(0, Math.min(1, scenario?.confidence || 0.5)),
      riskLevel: ['low', 'medium', 'high'].includes(scenario?.riskLevel) ? scenario.riskLevel : 'medium',
      reasoning: scenario?.reasoning || 'No reasoning provided',
      advantages: Array.isArray(scenario?.advantages) ? scenario.advantages : [],
      concerns: Array.isArray(scenario?.concerns) ? scenario.concerns : [],
      winProbability: scenario?.winProbability ? Math.max(0, Math.min(100, scenario.winProbability)) : undefined,
    };
  }

  private validatePlayerProjections(projections: any[]): PlayerProjection[] {
    if (!Array.isArray(projections)) return [];

    return projections.map(proj => ({
      playerId: proj.playerId || 'unknown',
      playerName: proj.playerName || 'Unknown Player',
      position: proj.position || 'UNKNOWN',
      team: proj.team || 'FA',
      opponent: proj.opponent || 'BYE',
      projectedPoints: {
        floor: proj.projectedPoints?.floor || 0,
        expected: proj.projectedPoints?.expected || 0,
        ceiling: proj.projectedPoints?.ceiling || 0,
      },
      confidence: Math.max(0, Math.min(1, proj.confidence || 0.5)),
      startProbability: Math.max(0, Math.min(100, proj.startProbability || 50)),
      variance: proj.variance || 0,
      matchupRating: ['excellent', 'good', 'average', 'poor', 'terrible'].includes(proj.matchupRating)
        ? proj.matchupRating : 'average',
      factors: {
        recentForm: Math.max(-2, Math.min(2, proj.factors?.recentForm || 0)),
        matchupAdvantage: Math.max(-2, Math.min(2, proj.factors?.matchupAdvantage || 0)),
        weatherImpact: Math.max(-2, Math.min(2, proj.factors?.weatherImpact || 0)),
        injuryRisk: Math.max(0, Math.min(2, proj.factors?.injuryRisk || 0)),
        gameScript: Math.max(-2, Math.min(2, proj.factors?.gameScript || 0)),
      },
      reasoning: proj.reasoning || 'No analysis provided',
    }));
  }

  private validateBenchAnalysis(bench: any[]): BenchAnalysis[] {
    if (!Array.isArray(bench)) return [];

    return bench.map(player => ({
      playerId: player.playerId || 'unknown',
      playerName: player.playerName || 'Unknown Player',
      position: player.position || 'UNKNOWN',
      benchReason: player.benchReason || 'Lower projected points',
      alternativeScenarios: Array.isArray(player.alternativeScenarios) ? player.alternativeScenarios : [],
      keepOrDrop: ['keep', 'consider_dropping', 'drop_candidate'].includes(player.keepOrDrop)
        ? player.keepOrDrop : 'keep',
      upcomingValue: {
        nextWeek: Math.max(1, Math.min(10, player.upcomingValue?.nextWeek || 5)),
        restOfSeason: Math.max(1, Math.min(10, player.upcomingValue?.restOfSeason || 5)),
        playoffSchedule: Math.max(1, Math.min(10, player.upcomingValue?.playoffSchedule || 5)),
      },
    }));
  }

  private validateKeyDecisions(decisions: any[]): LineupOptimization['keyDecisions'] {
    if (!Array.isArray(decisions)) return [];

    return decisions.map(decision => ({
      position: decision.position || 'FLEX',
      options: Array.isArray(decision.options) ? decision.options.map((option: any) => ({
        playerId: option.playerId || 'unknown',
        playerName: option.playerName || 'Unknown Player',
        pros: Array.isArray(option.pros) ? option.pros : [],
        cons: Array.isArray(option.cons) ? option.cons : [],
        recommendation: ['start', 'bench', 'consider'].includes(option.recommendation)
          ? option.recommendation : 'consider',
      })) : [],
      recommendation: decision.recommendation || 'No recommendation provided',
    }));
  }

  private validateStackingOpportunities(stacks: any[]): LineupOptimization['stackingOpportunities'] {
    if (!Array.isArray(stacks)) return [];

    return stacks.map(stack => ({
      players: Array.isArray(stack.players) ? stack.players : [],
      correlation: Math.max(0, Math.min(1, stack.correlation || 0)),
      upside: stack.upside || 'Moderate correlation upside',
      risk: stack.risk || 'Standard correlation risk',
    }));
  }

  private createFallbackOptimization(request: LineupOptimizerRequest): LineupOptimization {
    const fallbackLineup: { [position: string]: string } = {};
    request.rosterSlots.forEach((slot, index) => {
      fallbackLineup[slot] = request.availablePlayers[index] || 'unknown';
    });

    return {
      optimalLineup: {
        scenarioName: 'Fallback Lineup',
        lineup: fallbackLineup,
        projectedTotal: { floor: 0, expected: 0, ceiling: 0 },
        confidence: 0.1,
        riskLevel: 'medium',
        reasoning: 'Lineup optimization failed - manual review required',
        advantages: [],
        concerns: ['AI analysis unavailable'],
      },
      alternativeLineups: [],
      playerProjections: [],
      benchAnalysis: [],
      keyDecisions: [],
      stackingOpportunities: [],
      lastUpdated: new Date(),
    };
  }

  async getPlayerComparison(
    playerIds: string[],
    position: string,
    week: number,
    leagueId: string,
    preferredProvider?: AIProvider
  ): Promise<PlayerProjection[]> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are a fantasy football expert specializing in player comparisons for lineup decisions. Use MCP tools for current data.

OUTPUT REQUIREMENTS:
You must respond with a valid JSON object containing:
{
  "playerProjections": [
    {
      "playerId": "string",
      "playerName": "string",
      "position": "string",
      "team": "string",
      "opponent": "string",
      "projectedPoints": {
        "floor": number,
        "expected": number,
        "ceiling": number
      },
      "confidence": number (0-1),
      "startProbability": number (0-100),
      "variance": number,
      "matchupRating": "excellent|good|average|poor|terrible",
      "factors": {
        "recentForm": number (-2 to +2),
        "matchupAdvantage": number (-2 to +2),
        "weatherImpact": number (-2 to +2),
        "injuryRisk": number (0-2),
        "gameScript": number (-2 to +2)
      },
      "reasoning": "detailed explanation"
    }
  ]
}`,
      },
      {
        role: 'user',
        content: `Compare these ${position} players for week ${week} in league ${leagueId}: ${playerIds.join(', ')}. 

Provide detailed projections including:
- Fantasy points projections (floor/expected/ceiling)
- Matchup analysis and difficulty
- Recent form and usage trends
- Weather and game script factors
- Start/sit recommendations with confidence

Use get_league with league ID ${leagueId} to understand league context.
Use get_players_nfl to get player information.
Use get_player_stats for recent performance trends.
Use get_projections for weekly projections.

Rank by expected fantasy points for week ${week}.`,
      },
    ];

    try {
      const response = await this.aiManager.chat(
        { messages, maxTokens: 3000, temperature: 0.1 },
        preferredProvider,
        true
      );

      const parsed = this.parsePlayerProjectionsResponse(response.content, playerIds);
      return this.validatePlayerProjections(parsed);
    } catch (error) {
      console.error('Error getting player comparison:', error);
      return this.validatePlayerProjections([]);
    }
  }

  async getPositionalRankings(
    position: string,
    week: number,
    leagueId: string,
    preferredProvider?: AIProvider
  ): Promise<PlayerProjection[]> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are a fantasy football expert. Provide weekly positional rankings with detailed projections. Use MCP tools for current data.

OUTPUT REQUIREMENTS:
You must respond with a valid JSON object containing:
{
  "playerProjections": [
    {
      "playerId": "string",
      "playerName": "string",
      "position": "string",
      "team": "string",
      "opponent": "string",
      "projectedPoints": {
        "floor": number,
        "expected": number,
        "ceiling": number
      },
      "confidence": number (0-1),
      "startProbability": number (0-100),
      "variance": number,
      "matchupRating": "excellent|good|average|poor|terrible",
      "factors": {
        "recentForm": number (-2 to +2),
        "matchupAdvantage": number (-2 to +2),
        "weatherImpact": number (-2 to +2),
        "injuryRisk": number (0-2),
        "gameScript": number (-2 to +2)
      },
      "reasoning": "detailed explanation"
    }
  ]
}`,
      },
      {
        role: 'user',
        content: `Get top ${position} rankings for week ${week} in league ${leagueId}. 

Provide top 15-20 players with:
- Fantasy points projections (floor/expected/ceiling)
- Matchup analysis and difficulty ratings
- Recent form and usage trends
- Weather and game script considerations
- Start/sit tier classifications

Use get_league with league ID ${leagueId} to understand league context.
Use get_players_nfl to get player information.
Use get_player_stats for recent performance trends.
Use get_projections for weekly projections.

Rank by expected fantasy points for week ${week}.`,
      },
    ];

    try {
      const response = await this.aiManager.chat(
        { messages, maxTokens: 4000, temperature: 0.1 },
        preferredProvider,
        true
      );

      const parsed = this.parsePlayerProjectionsResponse(response.content, []);
      return this.validatePlayerProjections(parsed);
    } catch (error) {
      console.error('Error getting positional rankings:', error);
      return this.validatePlayerProjections([]);
    }
  }

  private parsePlayerProjectionsResponse(
    aiResponse: string, 
    expectedPlayerIds: string[]
  ): PlayerProjection[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.playerProjections || !Array.isArray(parsed.playerProjections)) {
        throw new Error('Invalid playerProjections format');
      }

      // Map and validate each projection
      return parsed.playerProjections.map((proj: any) => ({
        playerId: proj.playerId || 'unknown',
        playerName: proj.playerName || 'Unknown Player',
        position: proj.position || 'UNKNOWN',
        team: proj.team || 'UNKNOWN',
        opponent: proj.opponent || 'UNKNOWN',
        projectedPoints: {
          floor: typeof proj.projectedPoints?.floor === 'number' ? proj.projectedPoints.floor : 5,
          expected: typeof proj.projectedPoints?.expected === 'number' ? proj.projectedPoints.expected : 10,
          ceiling: typeof proj.projectedPoints?.ceiling === 'number' ? proj.projectedPoints.ceiling : 15,
        },
        confidence: typeof proj.confidence === 'number' ? Math.max(0, Math.min(1, proj.confidence)) : 0.5,
        startProbability: typeof proj.startProbability === 'number' ? Math.max(0, Math.min(100, proj.startProbability)) : 50,
        variance: typeof proj.variance === 'number' ? Math.max(0, proj.variance) : 3,
        matchupRating: ['excellent', 'good', 'average', 'poor', 'terrible'].includes(proj.matchupRating) 
          ? proj.matchupRating : 'average',
        factors: {
          recentForm: typeof proj.factors?.recentForm === 'number' ? Math.max(-2, Math.min(2, proj.factors.recentForm)) : 0,
          matchupAdvantage: typeof proj.factors?.matchupAdvantage === 'number' ? Math.max(-2, Math.min(2, proj.factors.matchupAdvantage)) : 0,
          weatherImpact: typeof proj.factors?.weatherImpact === 'number' ? Math.max(-2, Math.min(2, proj.factors.weatherImpact)) : 0,
          injuryRisk: typeof proj.factors?.injuryRisk === 'number' ? Math.max(0, Math.min(2, proj.factors.injuryRisk)) : 0,
          gameScript: typeof proj.factors?.gameScript === 'number' ? Math.max(-2, Math.min(2, proj.factors.gameScript)) : 0,
        },
        reasoning: proj.reasoning || 'Projection analysis completed',
      }));
    } catch (error) {
      console.error('Error parsing player projections response:', error);
      return [];
    }
  }
}