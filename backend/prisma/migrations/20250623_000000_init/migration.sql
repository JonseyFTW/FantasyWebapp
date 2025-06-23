-- CreateTable (Add missing tables and columns)

-- Add missing columns to existing tables if they don't exist
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sleeper_username" TEXT;

-- Ensure all required tables exist
CREATE TABLE IF NOT EXISTS "leagues" (
    "id" TEXT NOT NULL,
    "sleeper_league_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "total_rosters" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "settings" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_leagues" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "league_id" TEXT NOT NULL,
    "sleeper_roster_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_leagues_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes if they don't exist
CREATE UNIQUE INDEX IF NOT EXISTS "leagues_sleeper_league_id_key" ON "leagues"("sleeper_league_id");
CREATE UNIQUE INDEX IF NOT EXISTS "user_leagues_user_id_league_id_key" ON "user_leagues"("user_id", "league_id");

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_leagues_user_id_fkey'
    ) THEN
        ALTER TABLE "user_leagues" ADD CONSTRAINT "user_leagues_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_leagues_league_id_fkey'
    ) THEN
        ALTER TABLE "user_leagues" ADD CONSTRAINT "user_leagues_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;