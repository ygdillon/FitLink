-- Migration: Add workout rating to daily check-ins

-- Add workout_rating column to daily_check_ins table
ALTER TABLE daily_check_ins 
ADD COLUMN IF NOT EXISTS workout_rating INTEGER CHECK (workout_rating >= 1 AND workout_rating <= 10);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_check_ins_rating ON daily_check_ins(workout_rating) WHERE workout_rating IS NOT NULL;

