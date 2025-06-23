-- Emergency database schema fix
-- Run this manually if migrations aren't working

-- Add missing columns if they don't exist
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sleeper_username" TEXT;

-- Create indexes if they don't exist  
CREATE UNIQUE INDEX IF NOT EXISTS "leagues_sleeper_league_id_key" ON "leagues"("sleeper_league_id");
CREATE UNIQUE INDEX IF NOT EXISTS "user_leagues_user_id_league_id_key" ON "user_leagues"("user_id", "league_id");

-- Verify tables exist and show structure
\d leagues;
\d user_leagues;
\d users;