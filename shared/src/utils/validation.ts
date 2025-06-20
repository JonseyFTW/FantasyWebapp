import { z } from 'zod';

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new ValidationError(
        firstError.message,
        firstError.path.join('.'),
        firstError.code
      );
    }
    throw error;
  }
}

export function validatePartialSchema<T>(
  schema: z.ZodObject<any>, 
  data: unknown
): any {
  try {
    return schema.partial().parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new ValidationError(
        firstError.message,
        firstError.path.join('.'),
        firstError.code
      );
    }
    throw error;
  }
}

export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  error?: ValidationError;
} {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: new ValidationError(
          firstError.message,
          firstError.path.join('.'),
          firstError.code
        ),
      };
    }
    return {
      success: false,
      error: new ValidationError('Unknown validation error'),
    };
  }
}

// Common validation patterns
export const commonValidations = {
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username must be less than 30 characters'),
  url: z.string().url('Invalid URL'),
  uuid: z.string().uuid('Invalid UUID'),
  positiveInt: z.number().int().positive('Must be a positive integer'),
  nonEmptyString: z.string().min(1, 'Field cannot be empty'),
  phoneNumber: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number'),
  hexColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
};

// NFL specific validations
export const nflValidations = {
  team: z.string().length(3, 'NFL team must be 3 characters').toUpperCase(),
  position: z.enum(['QB', 'RB', 'WR', 'TE', 'K', 'DEF']),
  week: z.number().int().min(1).max(18),
  season: z.number().int().min(2020).max(2030),
  fantasyPoints: z.number().min(0, 'Fantasy points cannot be negative'),
};