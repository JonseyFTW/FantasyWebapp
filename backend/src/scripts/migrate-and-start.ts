#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function migrateAndStart() {
  console.log('🔄 Starting deployment process...');
  
  try {
    // Sync database schema
    console.log('📊 Syncing database schema...');
    await execAsync('npx prisma db push');
    console.log('✅ Database schema synced');
    
    // Generate Prisma client (in case it's needed)
    console.log('🔧 Generating Prisma client...');
    await execAsync('npx prisma generate');
    console.log('✅ Prisma client generated');
    
    // Start the application
    console.log('🚀 Starting application...');
    require('../index.js');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Only run migrations in production
if (process.env.NODE_ENV === 'production') {
  migrateAndStart();
} else {
  // In development, just start the app
  require('../index.js');
}