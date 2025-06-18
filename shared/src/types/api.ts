import { z } from 'zod';

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }).optional(),
  metadata: z.object({
    timestamp: z.string(),
    requestId: z.string(),
    version: z.string(),
    processingTime: z.number().optional(),
  }),
});

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export const PaginatedResponseSchema = ApiResponseSchema.extend({
  data: z.object({
    items: z.array(z.any()),
    pagination: PaginationSchema,
  }),
});

export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'AUTHENTICATION_ERROR',
  'AUTHORIZATION_ERROR',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMIT_EXCEEDED',
  'INTERNAL_SERVER_ERROR',
  'SERVICE_UNAVAILABLE',
  'BAD_REQUEST',
  'EXTERNAL_API_ERROR',
  'AI_SERVICE_ERROR',
  'MCP_SERVER_ERROR',
]);

export const WebSocketMessageSchema = z.object({
  type: z.enum([
    'score_update',
    'lineup_change',
    'trade_proposal',
    'waiver_claim',
    'chat_message',
    'rivalry_update',
    'notification',
    'connection_status',
  ]),
  payload: z.any(),
  timestamp: z.string(),
  userId: z.string().optional(),
  leagueId: z.string().optional(),
});

export const NotificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum([
    'score_alert',
    'player_news',
    'trade_offer',
    'waiver_success',
    'matchup_reminder',
    'weekly_report',
    'achievement_unlocked',
    'rivalry_update',
  ]),
  title: z.string(),
  message: z.string(),
  actionUrl: z.string().optional(),
  read: z.boolean().default(false),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  createdAt: z.date(),
  expiresAt: z.date().optional(),
});

export type ApiResponse<T = any> = Omit<z.infer<typeof ApiResponseSchema>, 'data'> & {
  data?: T;
};

export type PaginatedResponse<T = any> = Omit<z.infer<typeof PaginatedResponseSchema>, 'data'> & {
  data: {
    items: T[];
    pagination: Pagination;
  };
};

export type Pagination = z.infer<typeof PaginationSchema>;
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;
export type Notification = z.infer<typeof NotificationSchema>;

export interface PaginationParams {
  page?: number;
  limit?: number;
}