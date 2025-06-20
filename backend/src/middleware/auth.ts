import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { User } from '@shared/types/user';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export function createToken(payload: { userId: string; email: string }): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
    },
    secret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    } as jwt.SignOptions
  );
}

export function verifyToken(token: string): JWTPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  try {
    return jwt.verify(token, secret) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid token');
    }
    throw new AuthenticationError('Token verification failed');
  }
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    const decoded = verifyToken(token);
    
    // Fetch user from database to ensure they still exist
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: error.message,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          version: '1.0.0',
        },
      });
    } else {
      console.error('Authentication middleware error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          version: '1.0.0',
        },
      });
    }
  }
}

export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return next();
  }

  try {
    const decoded = verifyToken(token);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    // For optional auth, we don't fail on invalid tokens
    next();
  }
}

export function requireRole(allowedRoles: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthenticationError();
      }

      const leagueId = req.params.leagueId;
      if (!leagueId) {
        throw new AuthorizationError('League ID required');
      }

      const userLeague = await prisma.userLeague.findUnique({
        where: {
          userId_leagueId: {
            userId: req.user.id,
            leagueId: leagueId,
          },
        },
      });

      if (!userLeague) {
        throw new AuthorizationError('Not a member of this league');
      }

      if (!allowedRoles.includes(userLeague.role)) {
        throw new AuthorizationError(`Role '${userLeague.role}' not authorized for this action`);
      }

      next();
    } catch (error) {
      if (error instanceof AuthorizationError) {
        res.status(403).json({
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: error.message,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown',
            version: '1.0.0',
          },
        });
      } else {
        next(error);
      }
    }
  };
}