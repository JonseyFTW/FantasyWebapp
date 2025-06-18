import { z } from 'zod';

export const PlayerSchema = z.object({
  id: z.string(),
  sleeperPlayerId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
  position: z.enum(['QB', 'RB', 'WR', 'TE', 'K', 'DEF']),
  team: z.string().length(3).optional(), // NFL team abbreviation
  age: z.number().int().min(18).max(50).optional(),
  experience: z.number().int().min(0).max(25).optional(),
  status: z.enum(['active', 'injured', 'suspended', 'retired']).default('active'),
  fantasyPositions: z.array(z.string()),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const PlayerStatsSchema = z.object({
  playerId: z.string(),
  season: z.number().int(),
  week: z.number().int().min(1).max(18).optional(), // null for season totals
  stats: z.record(z.string(), z.number()),
  fantasyPoints: z.object({
    standard: z.number(),
    ppr: z.number(),
    halfPpr: z.number(),
  }),
  updatedAt: z.date(),
});

export const PlayerProjectionSchema = z.object({
  playerId: z.string(),
  season: z.number().int(),
  week: z.number().int().min(1).max(18),
  projectedStats: z.record(z.string(), z.number()),
  projectedPoints: z.object({
    standard: z.number(),
    ppr: z.number(),
    halfPpr: z.number(),
  }),
  confidence: z.number().min(0).max(1), // 0-1 confidence score
  source: z.string(),
  createdAt: z.date(),
});

export const PlayerRecommendationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  playerId: z.string(),
  recommendationType: z.enum(['start', 'sit', 'pickup', 'drop', 'trade_target', 'avoid']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1).max(1000),
  context: z.object({
    week: z.number().int().min(1).max(18),
    matchup: z.string().optional(),
    injury_concerns: z.array(z.string()).optional(),
    weather: z.string().optional(),
  }),
  createdAt: z.date(),
  expiresAt: z.date(),
});

export type Player = z.infer<typeof PlayerSchema>;
export type PlayerStats = z.infer<typeof PlayerStatsSchema>;
export type PlayerProjection = z.infer<typeof PlayerProjectionSchema>;
export type PlayerRecommendation = z.infer<typeof PlayerRecommendationSchema>;

export type Position = Player['position'];
export type PlayerStatus = Player['status'];
export type RecommendationType = PlayerRecommendation['recommendationType'];
export type FantasyPoints = PlayerStats['fantasyPoints'];