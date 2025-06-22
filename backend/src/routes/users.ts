import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get user by email or ID
router.get('/:userIdentifier', async (req, res) => {
  try {
    const { userIdentifier } = req.params;

    // Try to find by email first, then by ID
    const user = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: userIdentifier },
          { id: userIdentifier }
        ]
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        sleeperUserId: true,
        sleeperUsername: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch user',
      },
    });
  }
});

// Update user
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { displayName, preferences, sleeperUserId } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(displayName && { displayName }),
        ...(preferences && { preferences }),
        ...(sleeperUserId && { sleeperUserId }),
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        sleeperUserId: true,
        sleeperUsername: true,
        preferences: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update user',
      },
    });
  }
});

export { router as userRoutes };