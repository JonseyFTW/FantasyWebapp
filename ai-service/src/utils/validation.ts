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