import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import {
  authenticateToken,
  createToken,
  verifyToken,
  AuthenticatedRequest,
  AuthenticationError,
} from '../../middleware/auth';

// Mock Prisma
jest.mock('@prisma/client');
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
} as any;

// Mock jwt
jest.mock('jsonwebtoken');
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Middleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();

    // Setup environment variable
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('createToken', () => {
    it('should create a valid JWT token', () => {
      const payload = { userId: 'user123', email: 'test@example.com' };
      mockJwt.sign.mockReturnValue('mock-token');

      const token = createToken(payload);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        payload,
        'test-secret',
        { expiresIn: '7d' }
      );
      expect(token).toBe('mock-token');
    });

    it('should throw error when JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;

      expect(() => createToken({ userId: 'user123', email: 'test@example.com' }))
        .toThrow('JWT_SECRET environment variable is not set');
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const mockPayload = { userId: 'user123', email: 'test@example.com', iat: 123, exp: 456 };
      mockJwt.verify.mockReturnValue(mockPayload);

      const result = verifyToken('valid-token');

      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(result).toEqual(mockPayload);
    });

    it('should throw AuthenticationError for expired token', () => {
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      expect(() => verifyToken('expired-token'))
        .toThrow(new AuthenticationError('Token has expired'));
    });

    it('should throw AuthenticationError for invalid token', () => {
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      expect(() => verifyToken('invalid-token'))
        .toThrow(new AuthenticationError('Invalid token'));
    });
  });

  describe('authenticateToken middleware', () => {
    beforeEach(() => {
      // Mock PrismaClient
      (PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrisma);
    });

    it('should authenticate valid token and set user', async () => {
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

      mockReq.headers!.authorization = 'Bearer valid-token';
      mockJwt.verify.mockReturnValue({ userId: 'user123', email: 'test@example.com', iat: 123, exp: 456 });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user123' },
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          sleeperUserId: true,
          preferences: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(mockReq.user).toEqual(mockUser);
      expect(mockReq.userId).toBe('user123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when no token provided', async () => {
      mockReq.headers!.authorization = undefined;

      await authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'No token provided',
        },
        metadata: expect.objectContaining({
          timestamp: expect.any(String),
          requestId: 'unknown',
          version: '1.0.0',
        }),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', async () => {
      mockReq.headers!.authorization = 'Bearer invalid-token';
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      await authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Invalid token',
        },
        metadata: expect.objectContaining({
          timestamp: expect.any(String),
          requestId: 'unknown',
          version: '1.0.0',
        }),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user not found', async () => {
      mockReq.headers!.authorization = 'Bearer valid-token';
      mockJwt.verify.mockReturnValue({ userId: 'user123', email: 'test@example.com', iat: 123, exp: 456 });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'User not found',
        },
        metadata: expect.objectContaining({
          timestamp: expect.any(String),
          requestId: 'unknown',
          version: '1.0.0',
        }),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockReq.headers!.authorization = 'Bearer valid-token';
      mockJwt.verify.mockReturnValue({ userId: 'user123', email: 'test@example.com', iat: 123, exp: 456 });
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      await authenticateToken(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
        },
        metadata: expect.objectContaining({
          timestamp: expect.any(String),
          requestId: 'unknown',
          version: '1.0.0',
        }),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});