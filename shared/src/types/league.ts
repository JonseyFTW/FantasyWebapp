import { z } from 'zod';

export const LeagueSchema = z.object({
  id: z.string(),
  sleeperLeagueId: z.string(),
  name: z.string().min(1).max(100),
  season: z.number().int().min(2020).max(2030),
  totalRosters: z.number().int().min(2).max(32),
  scoringFormat: z.enum(['standard', 'ppr', 'half_ppr', 'superflex']),
  settings: z.object({
    playoffWeekStart: z.number().int().min(14).max(17),
    playoffTeams: z.number().int().min(2).max(8),
    rosterPositions: z.array(z.string()),
    scoring: z.record(z.string(), z.number()),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const UserLeagueSchema = z.object({
  id: z.string(),
  userId: z.string(),
  leagueId: z.string(),
  sleeperRosterId: z.string(),
  role: z.enum(['owner', 'co_owner', 'member']).default('member'),
  joinedAt: z.date(),
});

export const LeagueRivalrySchema = z.object({
  id: z.string(),
  leagueId: z.string(),
  user1Id: z.string(),
  user2Id: z.string(),
  rivalryName: z.string().optional(),
  isActive: z.boolean().default(true),
  headToHeadRecord: z.object({
    user1Wins: z.number().int().min(0).default(0),
    user2Wins: z.number().int().min(0).default(0),
    ties: z.number().int().min(0).default(0),
  }),
  createdAt: z.date(),
});

export const LeagueChatSchema = z.object({
  id: z.string(),
  leagueId: z.string(),
  userId: z.string(),
  message: z.string().min(1).max(500),
  messageType: z.enum(['chat', 'trade_proposal', 'waiver_claim', 'lineup_set', 'trash_talk']).default('chat'),
  createdAt: z.date(),
});

export type League = z.infer<typeof LeagueSchema>;
export type UserLeague = z.infer<typeof UserLeagueSchema>;
export type LeagueRivalry = z.infer<typeof LeagueRivalrySchema>;
export type LeagueChat = z.infer<typeof LeagueChatSchema>;

export type LeagueSettings = League['settings'];
export type ScoringFormat = League['scoringFormat'];
export type UserRole = UserLeague['role'];
export type MessageType = LeagueChat['messageType'];