#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDemoData() {
  console.log('🧹 Starting demo data cleanup...');
  
  try {
    // Delete all existing leagues and related data
    console.log('🗑️ Removing existing leagues...');
    await prisma.league.deleteMany({});
    
    // Delete user-league relationships  
    console.log('🗑️ Removing user-league relationships...');
    await prisma.userLeague.deleteMany({});
    
    // Delete player stats
    console.log('🗑️ Removing player stats...');
    await prisma.playerStats.deleteMany({});
    
    // Delete players
    console.log('🗑️ Removing players...');
    await prisma.player.deleteMany({});
    
    // Delete AI analyses
    console.log('🗑️ Removing AI analyses...');
    await prisma.aIAnalysis.deleteMany({});
    
    // Delete trade analyses
    console.log('🗑️ Removing trade analyses...');
    await prisma.tradeAnalysis.deleteMany({});
    
    // Reset user sleeper data (keep users but clear sleeper info)
    console.log('🗑️ Clearing user Sleeper data...');
    await prisma.user.updateMany({
      data: {
        sleeperUserId: null,
      },
    });
    
    console.log('✅ Demo data cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Demo data cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run cleanup if called directly
if (require.main === module) {
  cleanupDemoData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { cleanupDemoData };