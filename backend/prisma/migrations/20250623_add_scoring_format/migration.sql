-- Add scoring_format column if it doesn't exist
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "scoring_format" TEXT NOT NULL DEFAULT 'standard';