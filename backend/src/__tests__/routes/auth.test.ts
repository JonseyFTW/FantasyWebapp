import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { createToken } from '../../middleware/auth';
import authRouter from '../../routes/auth';
import express from 'express';

// Mock Prisma
jest.mock('@prisma/client');
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
} as any;

// Mock the PrismaClient constructor
(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrisma);

describe('Auth Routes', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    
    // Set environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '7d';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRES_IN;
  });

  describe('POST /api/auth/token-exchange', () => {
    it('should exchange NextAuth token for API token', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        sleeperUserId: 'sleeper123',
        preferences: { theme: 'dark' },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/token-exchange')
        .send({ nextAuthToken: 'valid-nextauth-token' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user).toEqual(mockUser);
      expect(response.body.metadata).toMatchObject({
        timestamp: expect.any(String),
        requestId: 'unknown',
        version: '1.0.0',
      });
    });

    it('should return 400 for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/token-exchange')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/token-exchange')
        .send({ nextAuthToken: 'valid-nextauth-token' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return user profile for authenticated user', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
        sleeperUserId: null,
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const token = createToken({ userId: 'user123', email: 'test@example.com' });

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toEqual(mockUser);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('PUT /api/auth/preferences', () => {
    it('should update user preferences', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
        sleeperUserId: null,
        preferences: {
          riskTolerance: 'moderate',
          notificationSettings: {
            email: true,
            push: true,
            weeklyReport: true,
            tradeAlerts: true,
          },
          theme: 'system',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedUser = {
        ...mockUser,
        preferences: {
          ...mockUser.preferences,
          theme: 'dark',
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);
      const token = createToken({ userId: 'user123', email: 'test@example.com' });

      const response = await request(app)
        .put('/api/auth/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ theme: 'dark' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.preferences.theme).toBe('dark');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          preferences: expect.objectContaining({
            theme: 'dark',
          }),
        },
        select: expect.any(Object),
      });
    });

    it('should merge notification settings', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
        sleeperUserId: null,
        preferences: {
          riskTolerance: 'moderate',
          notificationSettings: {
            email: true,
            push: true,
            weeklyReport: true,
            tradeAlerts: true,
          },
          theme: 'system',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      const token = createToken({ userId: 'user123', email: 'test@example.com' });

      await request(app)
        .put('/api/auth/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({
          notificationSettings: {
            email: false,
          },
        })
        .expect(200);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          preferences: expect.objectContaining({
            notificationSettings: {
              email: false,
              push: true,
              weeklyReport: true,
              tradeAlerts: true,
            },
          }),
        },
        select: expect.any(Object),
      });
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .put('/api/auth/preferences')
        .send({ theme: 'dark' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should return 400 for invalid preferences', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        displayName: 'Test User',
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const token = createToken({ userId: 'user123', email: 'test@example.com' });

      const response = await request(app)
        .put('/api/auth/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ theme: 'invalid-theme' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/link-sleeper', () => {
    it('should link Sleeper account to user', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
        sleeperUserId: null,
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedUser = {
        ...mockUser,
        sleeperUserId: 'sleeper123',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.findFirst.mockResolvedValue(null); // No existing user with this Sleeper ID
      mockPrisma.user.update.mockResolvedValue(updatedUser);
      const token = createToken({ userId: 'user123', email: 'test@example.com' });

      const response = await request(app)
        .post('/api/auth/link-sleeper')
        .set('Authorization', `Bearer ${token}`)
        .send({ sleeperUserId: 'sleeper123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.sleeperUserId).toBe('sleeper123');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: { sleeperUserId: 'sleeper123' },
        select: expect.any(Object),
      });
    });

    it('should return 409 if Sleeper account already linked', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        displayName: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existingUser = {
        id: 'user456',
        sleeperUserId: 'sleeper123',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);
      const token = createToken({ userId: 'user123', email: 'test@example.com' });

      const response = await request(app)
        .post('/api/auth/link-sleeper')
        .set('Authorization', `Bearer ${token}`)
        .send({ sleeperUserId: 'sleeper123' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('should return 400 for invalid Sleeper user ID', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const token = createToken({ userId: 'user123', email: 'test@example.com' });

      const response = await request(app)
        .post('/api/auth/link-sleeper')
        .set('Authorization', `Bearer ${token}`)
        .send({ sleeperUserId: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});