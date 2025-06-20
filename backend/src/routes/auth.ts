import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { createToken, authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validateSchema } from '@shared/utils/validation';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const TokenExchangeSchema = z.object({
  nextAuthToken: z.string().min(1, 'NextAuth token is required'),
});

const SleeperLinkSchema = z.object({
  sleeperUserId: z.string().min(1, 'Sleeper user ID is required'),
});

const PreferencesUpdateSchema = z.object({
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
  notificationSettings: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    weeklyReport: z.boolean().optional(),
    tradeAlerts: z.boolean().optional(),
  }).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
});

/**
 * POST /api/auth/token-exchange
 * Exchange NextAuth session token for API JWT token
 */
router.post('/token-exchange', async (req, res) => {
  try {
    const { nextAuthToken } = validateSchema(TokenExchangeSchema, req.body);

    // In a real implementation, you would verify the NextAuth token
    // For now, we'll assume it contains user information
    // This would typically involve calling NextAuth's getToken() function
    
    // TODO: Implement proper NextAuth token verification
    // const session = await getToken({ token: nextAuthToken });
    
    // Mock implementation - in production, extract user from verified token
    const mockUserId = 'user_123'; // This would come from the verified NextAuth token
    
    const user = await prisma.user.findUnique({
      where: { id: mockUserId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          version: '1.0.0',
        },
      });
    }

    const apiToken = createToken({
      userId: user.id,
      email: user.email,
    });

    res.json({
      success: true,
      data: {
        token: apiToken,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          sleeperUserId: user.sleeperUserId,
          preferences: user.preferences,
        },
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        version: '1.0.0',
      },
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Invalid request',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        version: '1.0.0',
      },
    });
  }
});

/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'User not authenticated',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          version: '1.0.0',
        },
      });
    }

    res.json({
      success: true,
      data: {
        user: req.user,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        version: '1.0.0',
      },
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch profile',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        version: '1.0.0',
      },
    });
  }
});

/**
 * PUT /api/auth/preferences
 * Update user preferences
 */
router.put('/preferences', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'User not authenticated',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          version: '1.0.0',
        },
      });
    }

    const preferences = validateSchema(PreferencesUpdateSchema, req.body);

    // Merge with existing preferences
    const currentPreferences = (req.user.preferences as any) || {};
    const updatedPreferences = {
      ...currentPreferences,
      ...preferences,
      notificationSettings: {
        ...currentPreferences.notificationSettings,
        ...preferences.notificationSettings,
      },
    };

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { preferences: updatedPreferences },
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

    res.json({
      success: true,
      data: {
        user: updatedUser,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        version: '1.0.0',
      },
    });
  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Invalid preferences',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        version: '1.0.0',
      },
    });
  }
});

/**
 * POST /api/auth/link-sleeper
 * Link Sleeper account to user profile
 */
router.post('/link-sleeper', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'User not authenticated',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          version: '1.0.0',
        },
      });
    }

    const { sleeperUserId } = validateSchema(SleeperLinkSchema, req.body);

    // Check if Sleeper user ID is already linked to another account
    const existingUser = await prisma.user.findFirst({
      where: {
        sleeperUserId,
        id: { not: req.user.id },
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Sleeper account is already linked to another user',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          version: '1.0.0',
        },
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { sleeperUserId },
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

    res.json({
      success: true,
      data: {
        user: updatedUser,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        version: '1.0.0',
      },
    });
  } catch (error) {
    console.error('Sleeper link error:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Invalid Sleeper user ID',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        version: '1.0.0',
      },
    });
  }
});

export { router as authRoutes };