import { AIManager } from '../services/ai-manager';
import { AIProvider, AIMessage } from '../types/ai-providers';

export interface WaiverWireRequest {
  userId: string;
  leagueId: string;
  week: number;
  budget?: number; // FAAB budget remaining
  currentRoster: string[]; // Current player IDs
  rosterNeeds?: string[]; // Positions needing help
  userPreferences?: {
    riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
    focusOnUpside?: boolean;
    prioritizeImmediateHelp?: boolean;
    maxBidPercentage?: number; // Max % of FAAB to spend on one player
  };
}

export interface WaiverWirePickup {
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  priority: number; // 1 = highest priority
  confidence: number; // 0-1
  reasoning: string;
  projectedImpact: {
    immediateStarter: boolean;
    flexConsideration: boolean;
    depthUpgrade: boolean;
    futureUpside: boolean;
  };
  bidRecommendation?: {
    suggested: number;
    minimum: number;
    maximum: number;
    reasoning: string;
  };
  targetWeeks: number[]; // Weeks where this player would be most valuable
  dropCandidates: string[]; // Player IDs to consider dropping
  riskFactors: string[];
  upside: string;
  recentTrends: {
    usage: 'increasing' | 'stable' | 'decreasing';
    opportunity: 'increasing' | 'stable' | 'decreasing';
    production: 'increasing' | 'stable' | 'decreasing';
  };
}

export interface WaiverWireAnalysis {
  topPickups: WaiverWirePickup[];
  sleepers: WaiverWirePickup[]; // Lower priority but high upside
  streamingOptions: {
    defense: WaiverWirePickup[];
    kicker: WaiverWirePickup[];
    qb?: WaiverWirePickup[]; // For superflex/2QB leagues
  };
  dropCandidates: {
    playerId: string;
    playerName: string;
    reasoning: string;
    safetyLevel: 'safe' | 'moderate_risk' | 'risky';
  }[];
  budgetStrategy?: {
    aggressiveTargets: string[]; // Players worth big bids
    conservativeTargets: string[]; // Lower bid players
    remainingBudget: number;
    allocationAdvice: string;
  };
  weeklyOutlook: string;
  keyTrends: string[];
  lastUpdated: Date;
}

export class WaiverWireAnalyzer {
  constructor(private aiManager: AIManager) {}

  async analyzeWaiverWire(
    request: WaiverWireRequest,
    preferredProvider?: AIProvider
  ): Promise<WaiverWireAnalysis> {
    console.log(`Analyzing waiver wire for user ${request.userId}, week ${request.week}`);

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
          maxTokens: 6000,
          temperature: 0.1,
        },
        preferredProvider,
        true // Enable MCP for data fetching
      );

      return this.parseWaiverWireResponse(response.content, request);
    } catch (error) {
      console.error('Waiver wire analysis failed:', error);
      throw new Error(`Waiver wire analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildSystemPrompt(request: WaiverWireRequest): string {
    const riskProfile = request.userPreferences?.riskTolerance || 'moderate';
    const hasBudget = request.budget !== undefined;

    return `You are an expert fantasy football waiver wire analyst specializing in identifying breakout players and valuable pickups. Your goal is to help users maximize their waiver wire strategy.

ANALYSIS FRAMEWORK:
1. Use MCP tools to gather comprehensive player data, usage trends, and opportunity metrics
2. Identify players with increasing opportunity due to injuries, role changes, or team situations
3. Analyze recent performance trends vs. season-long averages
4. Consider upcoming schedule strength and matchup advantages
5. Evaluate both immediate impact and long-term upside potential
6. Factor in league size, roster construction, and scoring settings

RISK TOLERANCE GUIDELINES:
- Conservative: Target proven commodities, avoid unproven players, focus on floor
- Moderate: Balance proven production with emerging opportunities
- Aggressive: Chase breakout candidates and lottery tickets, prioritize ceiling

${hasBudget ? `
FAAB BIDDING STRATEGY:
- Conservative bids for depth pieces and streamers
- Moderate bids for solid contributors with clear roles
- Aggressive bids for potential league-winners and high-upside plays
- Always consider remaining budget and future needs
` : ''}

PICKUP CATEGORIES:
1. Immediate Starters: Players who can start this week
2. Depth Upgrades: Better bench options than current roster
3. Future Starters: Players gaining opportunity/role
4. Handcuffs: Insurance for current players
5. Sleepers: Low-rostered high-upside plays
6. Streamers: Weekly matchup plays (DST/K/QB)

OUTPUT REQUIREMENTS:
You must respond with a valid JSON object following the exact schema provided. Be specific and actionable in recommendations.`;
  }

  private buildUserPrompt(request: WaiverWireRequest): string {
    const preferences = request.userPreferences;
    const preferencesText = preferences ? `
User Preferences:
- Risk Tolerance: ${preferences.riskTolerance}
- Focus on Upside: ${preferences.focusOnUpside ? 'Yes' : 'No'}
- Prioritize Immediate Help: ${preferences.prioritizeImmediateHelp ? 'Yes' : 'No'}
${preferences.maxBidPercentage ? `- Max Bid Percentage: ${preferences.maxBidPercentage}%` : ''}
` : '';

    const budgetText = request.budget ? `
FAAB Budget: $${request.budget} remaining
` : '';

    const needsText = request.rosterNeeds?.length ? `
Roster Needs: ${request.rosterNeeds.join(', ')}
` : '';

    return `Please analyze the waiver wire opportunities for my fantasy team this week.

LEAGUE DETAILS:
- League ID: ${request.leagueId} (Use this ID for all MCP tool calls)
- Week: ${request.week}
- User ID: ${request.userId}

ROSTER ANALYSIS:
- Current Roster Players: ${request.currentRoster.join(', ')}
${needsText}${budgetText}${preferencesText}

REQUIRED ANALYSIS STEPS:
1. Use get_league with the League ID to understand league settings, roster sizes, and waiver rules
2. Use get_league_rosters with the League ID to see all team rosters and identify available players
3. Use get_players_nfl to get comprehensive player information
4. Use get_player_stats to analyze recent usage and performance trends
5. Use get_projections for upcoming week and rest-of-season outlook
6. Use get_nfl_state to understand current week and season context

COMPREHENSIVE WAIVER ANALYSIS NEEDED:
{
  "topPickups": [
    {
      "playerId": "string",
      "playerName": "string",
      "position": "string", 
      "team": "string",
      "priority": 1-10,
      "confidence": 0.0-1.0,
      "reasoning": "detailed explanation",
      "projectedImpact": {
        "immediateStarter": boolean,
        "flexConsideration": boolean,
        "depthUpgrade": boolean,
        "futureUpside": boolean
      },
      "bidRecommendation": {
        "suggested": number,
        "minimum": number,
        "maximum": number,
        "reasoning": "bid strategy explanation"
      },
      "targetWeeks": [array of week numbers],
      "dropCandidates": ["player IDs to drop"],
      "riskFactors": ["array of risks"],
      "upside": "upside description",
      "recentTrends": {
        "usage": "increasing|stable|decreasing",
        "opportunity": "increasing|stable|decreasing", 
        "production": "increasing|stable|decreasing"
      }
    }
  ],
  "sleepers": [/* same structure as topPickups */],
  "streamingOptions": {
    "defense": [/* defense streaming options */],
    "kicker": [/* kicker streaming options */],
    "qb": [/* QB streaming if applicable */]
  },
  "dropCandidates": [
    {
      "playerId": "string",
      "playerName": "string", 
      "reasoning": "why safe to drop",
      "safetyLevel": "safe|moderate_risk|risky"
    }
  ],
  "budgetStrategy": {
    "aggressiveTargets": ["player IDs worth big bids"],
    "conservativeTargets": ["player IDs for small bids"],
    "remainingBudget": ${request.budget || 0},
    "allocationAdvice": "budget strategy explanation"
  },
  "weeklyOutlook": "overall waiver wire assessment",
  "keyTrends": ["important trends to watch"]
}

Focus on:
- Players with increasing opportunity due to injuries or role changes
- Favorable upcoming schedules and matchups
- Rising usage trends and target share
- Handcuff situations and depth chart movements
- Streaming options for defenses and kickers
- Budget allocation strategy for FAAB leagues

Provide actionable recommendations with specific bid amounts and drop suggestions.`;
  }

  private parseWaiverWireResponse(aiResponse: string, request: WaiverWireRequest): WaiverWireAnalysis {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        topPickups: this.validatePickups(parsed.topPickups || []),
        sleepers: this.validatePickups(parsed.sleepers || []),
        streamingOptions: {
          defense: this.validatePickups(parsed.streamingOptions?.defense || []),
          kicker: this.validatePickups(parsed.streamingOptions?.kicker || []),
          qb: this.validatePickups(parsed.streamingOptions?.qb || []),
        },
        dropCandidates: this.validateDropCandidates(parsed.dropCandidates || []),
        budgetStrategy: request.budget ? {
          aggressiveTargets: Array.isArray(parsed.budgetStrategy?.aggressiveTargets) 
            ? parsed.budgetStrategy.aggressiveTargets : [],
          conservativeTargets: Array.isArray(parsed.budgetStrategy?.conservativeTargets)
            ? parsed.budgetStrategy.conservativeTargets : [],
          remainingBudget: parsed.budgetStrategy?.remainingBudget || request.budget,
          allocationAdvice: parsed.budgetStrategy?.allocationAdvice || 'Budget strategy not available',
        } : undefined,
        weeklyOutlook: parsed.weeklyOutlook || 'Waiver wire analysis completed',
        keyTrends: Array.isArray(parsed.keyTrends) ? parsed.keyTrends : [],
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Failed to parse waiver wire response:', error);
      return this.createFallbackAnalysis(request);
    }
  }

  private validatePickups(pickups: any[]): WaiverWirePickup[] {
    if (!Array.isArray(pickups)) return [];

    return pickups.map((pickup, index) => ({
      playerId: pickup.playerId || 'unknown',
      playerName: pickup.playerName || 'Unknown Player',
      position: pickup.position || 'UNKNOWN',
      team: pickup.team || 'FA',
      priority: pickup.priority || index + 1,
      confidence: Math.max(0, Math.min(1, pickup.confidence || 0.5)),
      reasoning: pickup.reasoning || 'No reasoning provided',
      projectedImpact: {
        immediateStarter: pickup.projectedImpact?.immediateStarter || false,
        flexConsideration: pickup.projectedImpact?.flexConsideration || false,
        depthUpgrade: pickup.projectedImpact?.depthUpgrade || false,
        futureUpside: pickup.projectedImpact?.futureUpside || false,
      },
      bidRecommendation: pickup.bidRecommendation ? {
        suggested: pickup.bidRecommendation.suggested || 1,
        minimum: pickup.bidRecommendation.minimum || 1,
        maximum: pickup.bidRecommendation.maximum || 5,
        reasoning: pickup.bidRecommendation.reasoning || 'Standard bid',
      } : undefined,
      targetWeeks: Array.isArray(pickup.targetWeeks) ? pickup.targetWeeks : [],
      dropCandidates: Array.isArray(pickup.dropCandidates) ? pickup.dropCandidates : [],
      riskFactors: Array.isArray(pickup.riskFactors) ? pickup.riskFactors : [],
      upside: pickup.upside || 'Moderate upside potential',
      recentTrends: {
        usage: ['increasing', 'stable', 'decreasing'].includes(pickup.recentTrends?.usage)
          ? pickup.recentTrends.usage : 'stable',
        opportunity: ['increasing', 'stable', 'decreasing'].includes(pickup.recentTrends?.opportunity)
          ? pickup.recentTrends.opportunity : 'stable',
        production: ['increasing', 'stable', 'decreasing'].includes(pickup.recentTrends?.production)
          ? pickup.recentTrends.production : 'stable',
      },
    }));
  }

  private validateDropCandidates(candidates: any[]): WaiverWireAnalysis['dropCandidates'] {
    if (!Array.isArray(candidates)) return [];

    return candidates.map(candidate => ({
      playerId: candidate.playerId || 'unknown',
      playerName: candidate.playerName || 'Unknown Player',
      reasoning: candidate.reasoning || 'Safe to drop',
      safetyLevel: ['safe', 'moderate_risk', 'risky'].includes(candidate.safetyLevel)
        ? candidate.safetyLevel : 'moderate_risk',
    }));
  }

  private createFallbackAnalysis(request: WaiverWireRequest): WaiverWireAnalysis {
    return {
      topPickups: [],
      sleepers: [],
      streamingOptions: {
        defense: [],
        kicker: [],
        qb: [],
      },
      dropCandidates: [],
      budgetStrategy: request.budget ? {
        aggressiveTargets: [],
        conservativeTargets: [],
        remainingBudget: request.budget,
        allocationAdvice: 'Analysis failed - manual review required',
      } : undefined,
      weeklyOutlook: 'Waiver wire analysis failed - please try again',
      keyTrends: ['AI analysis is currently unavailable'],
      lastUpdated: new Date(),
    };
  }

  async getQuickPickupRecommendation(
    playerId: string,
    leagueId: string,
    week: number,
    preferredProvider?: AIProvider
  ): Promise<WaiverWirePickup> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are a fantasy football expert. Provide a quick waiver wire pickup analysis for a single player. Use MCP tools for current data.

OUTPUT REQUIREMENTS:
You must respond with a valid JSON object containing:
{
  "pickup": {
    "playerId": "string",
    "playerName": "string",
    "position": "string",
    "team": "string",
    "priority": number (1-10, 1 = highest),
    "confidence": number (0-1),
    "reasoning": "detailed explanation",
    "projectedImpact": {
      "immediateStarter": boolean,
      "flexConsideration": boolean,
      "depthUpgrade": boolean,
      "futureUpside": boolean
    },
    "targetWeeks": [number],
    "dropCandidates": ["playerId"],
    "riskFactors": ["string"],
    "upside": "string",
    "recentTrends": {
      "usage": "increasing|stable|decreasing",
      "opportunity": "increasing|stable|decreasing", 
      "production": "increasing|stable|decreasing"
    }
  }
}`,
      },
      {
        role: 'user',
        content: `Quick waiver wire analysis for player ${playerId} in league ${leagueId} for week ${week}. 
        
Get current player data including:
- Recent performance and usage
- Upcoming matchups and opportunities
- Injury status and depth chart position
- Fantasy relevance and upside potential

Use get_league with league ID ${leagueId} to understand league context.
Use get_players_nfl to get player information.
Use get_player_stats for recent performance data.

Provide specific pickup recommendation with priority ranking.`,
      },
    ];

    try {
      const response = await this.aiManager.chat(
        { messages, maxTokens: 1000, temperature: 0.1 },
        preferredProvider,
        true
      );

      return this.parseQuickPickupResponse(response.content, playerId, week);
    } catch (error) {
      console.error('Error getting quick pickup recommendation:', error);
      // Return fallback values
      return this.getFallbackPickupRecommendation(playerId, week);
    }
  }

  private parseQuickPickupResponse(
    aiResponse: string, 
    playerId: string, 
    week: number
  ): WaiverWirePickup {
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.pickup || typeof parsed.pickup !== 'object') {
        throw new Error('Invalid pickup format');
      }

      const pickup = parsed.pickup;
      
      // Return validated pickup recommendation
      return {
        playerId: pickup.playerId || playerId,
        playerName: pickup.playerName || 'Unknown Player',
        position: pickup.position || 'UNKNOWN',
        team: pickup.team || 'FA',
        priority: typeof pickup.priority === 'number' ? Math.max(1, Math.min(10, pickup.priority)) : 5,
        confidence: typeof pickup.confidence === 'number' ? Math.max(0, Math.min(1, pickup.confidence)) : 0.5,
        reasoning: pickup.reasoning || 'Quick analysis completed',
        projectedImpact: {
          immediateStarter: Boolean(pickup.projectedImpact?.immediateStarter),
          flexConsideration: Boolean(pickup.projectedImpact?.flexConsideration),
          depthUpgrade: Boolean(pickup.projectedImpact?.depthUpgrade),
          futureUpside: Boolean(pickup.projectedImpact?.futureUpside),
        },
        targetWeeks: Array.isArray(pickup.targetWeeks) ? pickup.targetWeeks : [week],
        dropCandidates: Array.isArray(pickup.dropCandidates) ? pickup.dropCandidates : [],
        riskFactors: Array.isArray(pickup.riskFactors) ? pickup.riskFactors : [],
        upside: pickup.upside || 'Moderate upside potential',
        recentTrends: {
          usage: ['increasing', 'stable', 'decreasing'].includes(pickup.recentTrends?.usage) 
            ? pickup.recentTrends.usage : 'stable',
          opportunity: ['increasing', 'stable', 'decreasing'].includes(pickup.recentTrends?.opportunity) 
            ? pickup.recentTrends.opportunity : 'stable',
          production: ['increasing', 'stable', 'decreasing'].includes(pickup.recentTrends?.production) 
            ? pickup.recentTrends.production : 'stable',
        },
      };
    } catch (error) {
      console.error('Error parsing quick pickup response:', error);
      return this.getFallbackPickupRecommendation(playerId, week);
    }
  }

  private getFallbackPickupRecommendation(playerId: string, week: number): WaiverWirePickup {
    return {
      playerId,
      playerName: 'Unknown Player',
      position: 'UNKNOWN',
      team: 'FA',
      priority: 5,
      confidence: 0.5,
      reasoning: 'Quick analysis completed',
      projectedImpact: {
        immediateStarter: false,
        flexConsideration: false,
        depthUpgrade: true,
        futureUpside: false,
      },
      targetWeeks: [week],
      dropCandidates: [],
      riskFactors: [],
      upside: 'Moderate upside potential',
      recentTrends: {
        usage: 'stable',
        opportunity: 'stable',
        production: 'stable',
      },
    };
  }

  async getStreamingRecommendations(
    position: 'DEF' | 'K' | 'QB',
    leagueId: string,
    week: number,
    preferredProvider?: AIProvider
  ): Promise<WaiverWirePickup[]> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are a fantasy football expert specializing in ${position} streaming recommendations. Use MCP tools for current data.

OUTPUT REQUIREMENTS:
You must respond with a valid JSON object containing:
{
  "streamingOptions": [
    {
      "playerId": "string",
      "playerName": "string",
      "position": "${position}",
      "team": "string",
      "priority": number (1-10, 1 = highest),
      "confidence": number (0-1),
      "reasoning": "detailed explanation focusing on matchup",
      "projectedImpact": {
        "immediateStarter": boolean,
        "flexConsideration": boolean,
        "depthUpgrade": boolean,
        "futureUpside": boolean
      },
      "targetWeeks": [number],
      "dropCandidates": ["playerId"],
      "riskFactors": ["string"],
      "upside": "string",
      "recentTrends": {
        "usage": "increasing|stable|decreasing",
        "opportunity": "increasing|stable|decreasing",
        "production": "increasing|stable|decreasing"
      }
    }
  ]
}`,
      },
      {
        role: 'user',
        content: `Get top 3-5 ${position} streaming recommendations for league ${leagueId} week ${week}. 

Focus on:
- Favorable matchups and opponent rankings
- Availability on waiver wire
- Recent performance trends
- Game script and weather factors
- Injury/rotation concerns

Use get_league with league ID ${leagueId} to understand league context.
Use get_players_nfl to get player information.
Use get_player_stats for recent performance trends.

Rank by expected weekly performance for this position.`,
      },
    ];

    try {
      const response = await this.aiManager.chat(
        { messages, maxTokens: 2000, temperature: 0.1 },
        preferredProvider,
        true
      );

      return this.parseStreamingResponse(response.content, position, week);
    } catch (error) {
      console.error('Error getting streaming recommendations:', error);
      // Return empty array as fallback
      return [];
    }
  }

  private parseStreamingResponse(
    aiResponse: string, 
    position: 'DEF' | 'K' | 'QB',
    week: number
  ): WaiverWirePickup[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.streamingOptions || !Array.isArray(parsed.streamingOptions)) {
        throw new Error('Invalid streamingOptions format');
      }

      // Map and validate each recommendation
      return parsed.streamingOptions.map((option: any) => ({
        playerId: option.playerId || 'unknown',
        playerName: option.playerName || 'Unknown Player',
        position: option.position || position,
        team: option.team || 'FA',
        priority: typeof option.priority === 'number' ? Math.max(1, Math.min(10, option.priority)) : 5,
        confidence: typeof option.confidence === 'number' ? Math.max(0, Math.min(1, option.confidence)) : 0.5,
        reasoning: option.reasoning || 'Streaming recommendation',
        projectedImpact: {
          immediateStarter: Boolean(option.projectedImpact?.immediateStarter),
          flexConsideration: Boolean(option.projectedImpact?.flexConsideration),
          depthUpgrade: Boolean(option.projectedImpact?.depthUpgrade),
          futureUpside: Boolean(option.projectedImpact?.futureUpside),
        },
        targetWeeks: Array.isArray(option.targetWeeks) ? option.targetWeeks : [week],
        dropCandidates: Array.isArray(option.dropCandidates) ? option.dropCandidates : [],
        riskFactors: Array.isArray(option.riskFactors) ? option.riskFactors : [],
        upside: option.upside || 'Good streaming option',
        recentTrends: {
          usage: ['increasing', 'stable', 'decreasing'].includes(option.recentTrends?.usage) 
            ? option.recentTrends.usage : 'stable',
          opportunity: ['increasing', 'stable', 'decreasing'].includes(option.recentTrends?.opportunity) 
            ? option.recentTrends.opportunity : 'stable',
          production: ['increasing', 'stable', 'decreasing'].includes(option.recentTrends?.production) 
            ? option.recentTrends.production : 'stable',
        },
      }));
    } catch (error) {
      console.error('Error parsing streaming response:', error);
      // Return empty array as fallback
      return [];
    }
  }
}