-- Ensure sleeper_username column exists (in case previous migration didn't run)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sleeper_username" TEXT;