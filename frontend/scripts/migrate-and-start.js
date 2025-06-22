#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function migrateAndStart() {
  console.log('🔄 Starting frontend deployment process...');
  
  try {
    // Run database migrations
    console.log('📊 Running database migrations...');
    await execAsync('npx prisma migrate deploy');
    console.log('✅ Database migrations completed');
    
    // Generate Prisma client (in case it's needed)
    console.log('🔧 Generating Prisma client...');
    await execAsync('npx prisma generate');
    console.log('✅ Prisma client generated');
    
    // Start the application
    console.log('🚀 Starting frontend application...');
    
    // Use the appropriate start command based on environment
    const startCommand = process.env.NODE_ENV === 'production' 
      ? 'node .next/standalone/server.js'
      : 'npm run dev';
      
    console.log(`📡 Running: ${startCommand}`);
    require('child_process').exec(startCommand, (error, stdout, stderr) => {
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
      if (error) {
        console.error('❌ Application failed:', error);
        process.exit(1);
      }
    });
    
  } catch (error) {
    console.error('❌ Frontend deployment failed:', error);
    process.exit(1);
  }
}

// Only run migrations in production
if (process.env.NODE_ENV === 'production') {
  migrateAndStart();
} else {
  // In development, just start the app
  console.log('🔧 Development mode - starting without migrations');
  require('child_process').exec('npm run dev');
}