import { z } from 'zod';

export const AIAnalysisSchema = z.object({
  id: z.string(),
  userId: z.string(),
  leagueId: z.string().optional(),
  analysisType: z.enum([
    'start_sit',
    'waiver_wire',
    'trade_analysis',
    'draft_grade',
    'playoff_odds',
    'power_ranking',
    'matchup_preview',
    'season_outlook'
  ]),
  input: z.record(z.string(), z.any()),
  output: z.object({
    recommendation: z.string(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
    alternativeOptions: z.array(z.string()).optional(),
    riskAssessment: z.enum(['low', 'medium', 'high']).optional(),
  }),
  metadata: z.object({
    processingTime: z.number(), // milliseconds
    model: z.string(),
    version: z.string(),
    contextSize: z.number().optional(),
  }),
  createdAt: z.date(),
});

export const TradeAnalysisSchema = z.object({
  id: z.string(),
  leagueId: z.string(),
  team1UserId: z.string(),
  team2UserId: z.string(),
  team1Players: z.array(z.string()), // player IDs
  team2Players: z.array(z.string()), // player IDs
  analysis: z.object({
    fairnessScore: z.number().min(0).max(10), // 0-10 scale
    team1Grade: z.enum(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F']),
    team2Grade: z.enum(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F']),
    summary: z.string(),
    positionalImpact: z.record(z.string(), z.string()),
    riskFactors: z.array(z.string()),
    recommendation: z.enum(['accept', 'reject', 'negotiate', 'consider']),
  }),
  aiModelUsed: z.string(),
  createdAt: z.date(),
});

export const PowerRankingSchema = z.object({
  id: z.string(),
  leagueId: z.string(),
  week: z.number().int().min(1).max(18),
  rankings: z.array(z.object({
    userId: z.string(),
    rank: z.number().int().min(1),
    score: z.number(),
    trend: z.enum(['up', 'down', 'stable']),
    analysis: z.string(),
  })),
  methodology: z.string(),
  createdAt: z.date(),
});

export const PlayoffScenarioSchema = z.object({
  id: z.string(),
  leagueId: z.string(),
  week: z.number().int().min(1).max(18),
  scenarios: z.array(z.object({
    userId: z.string(),
    playoffOdds: z.number().min(0).max(1), // 0-1 probability
    champOdds: z.number().min(0).max(1),
    scenarios: z.array(z.string()), // "If X beats Y and..."
    mustWin: z.array(z.string()), // Required outcomes
    help: z.array(z.string()), // Helpful outcomes
  })),
  simulationRuns: z.number().int().min(1000),
  createdAt: z.date(),
});

export type AIAnalysis = z.infer<typeof AIAnalysisSchema>;
export type TradeAnalysis = z.infer<typeof TradeAnalysisSchema>;
export type PowerRanking = z.infer<typeof PowerRankingSchema>;
export type PlayoffScenario = z.infer<typeof PlayoffScenarioSchema>;

export type AnalysisType = AIAnalysis['analysisType'];
export type TradeGrade = TradeAnalysis['analysis']['team1Grade'];
export type TradeRecommendation = TradeAnalysis['analysis']['recommendation'];
export type RankingTrend = PowerRanking['rankings'][0]['trend'];