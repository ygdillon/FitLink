-- Migration: Add trainer preferences (fitness goals and client age ranges)
-- Allows trainers to specify what types of clients they prefer to work with

ALTER TABLE trainers ADD COLUMN IF NOT EXISTS fitness_goals JSONB;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS client_age_ranges JSONB;

-- Add index for better query performance when filtering trainers
CREATE INDEX IF NOT EXISTS idx_trainers_fitness_goals ON trainers USING GIN (fitness_goals);
CREATE INDEX IF NOT EXISTS idx_trainers_client_age_ranges ON trainers USING GIN (client_age_ranges);

