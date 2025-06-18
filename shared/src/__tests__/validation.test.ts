import { z } from 'zod';
import { validateSchema, safeValidate, ValidationError } from '../utils/validation';
import { UserSchema } from '../types/user';

describe('Validation Utils', () => {
  const testSchema = z.object({
    name: z.string().min(1),
    age: z.number().min(0),
  });

  describe('validateSchema', () => {
    it('should validate correct data', () => {
      const data = { name: 'John', age: 25 };
      const result = validateSchema(testSchema, data);
      expect(result).toEqual(data);
    });

    it('should throw ValidationError for invalid data', () => {
      const data = { name: '', age: -1 };
      expect(() => validateSchema(testSchema, data)).toThrow(ValidationError);
    });
  });

  describe('safeValidate', () => {
    it('should return success for valid data', () => {
      const data = { name: 'John', age: 25 };
      const result = safeValidate(testSchema, data);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.error).toBeUndefined();
    });

    it('should return error for invalid data', () => {
      const data = { name: '', age: -1 };
      const result = safeValidate(testSchema, data);
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeInstanceOf(ValidationError);
    });
  });

  describe('UserSchema validation', () => {
    it('should validate a complete user object', () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        sleeperUserId: 'sleeper123',
        createdAt: new Date(),
        updatedAt: new Date(),
        preferences: {
          riskTolerance: 'moderate' as const,
          notificationSettings: {
            email: true,
            push: true,
            weeklyReport: true,
            tradeAlerts: true,
          },
          theme: 'system' as const,
        },
      };

      const result = safeValidate(UserSchema, userData);
      expect(result.success).toBe(true);
    });

    it('should fail validation for invalid email', () => {
      const userData = {
        id: 'user123',
        email: 'invalid-email',
        displayName: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = safeValidate(UserSchema, userData);
      expect(result.success).toBe(false);
      expect(result.error?.field).toBe('email');
    });
  });
});