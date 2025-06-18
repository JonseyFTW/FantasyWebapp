import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().min(1).max(50),
  avatarUrl: z.string().url().optional(),
  sleeperUserId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  preferences: z.object({
    riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).default('moderate'),
    notificationSettings: z.object({
      email: z.boolean().default(true),
      push: z.boolean().default(true),
      weeklyReport: z.boolean().default(true),
      tradeAlerts: z.boolean().default(true),
    }).default({}),
    theme: z.enum(['light', 'dark', 'system']).default('system'),
  }).optional(),
});

export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateUserSchema = CreateUserSchema.partial();

export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;

export type UserPreferences = NonNullable<User['preferences']>;
export type NotificationSettings = UserPreferences['notificationSettings'];
export type RiskTolerance = UserPreferences['riskTolerance'];
export type Theme = UserPreferences['theme'];