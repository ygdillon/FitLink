-- Migration: Enhance check-in system with Phase 1 metrics
-- Based on CHECK_IN_RECOMMENDATIONS.md Phase 1 priorities

-- Add duration tracking (in minutes)
ALTER TABLE daily_check_ins ADD COLUMN IF NOT EXISTS workout_duration INTEGER;

-- Add sleep quality (1-10 scale)
ALTER TABLE daily_check_ins ADD COLUMN IF NOT EXISTS sleep_hours DECIMAL(4, 2);
ALTER TABLE daily_check_ins ADD COLUMN IF NOT EXISTS sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10);

-- Add energy level (1-10 scale)
ALTER TABLE daily_check_ins ADD COLUMN IF NOT EXISTS energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10);

-- Add pain/discomfort tracking
ALTER TABLE daily_check_ins ADD COLUMN IF NOT EXISTS pain_experienced BOOLEAN DEFAULT false;
ALTER TABLE daily_check_ins ADD COLUMN IF NOT EXISTS pain_location TEXT;
ALTER TABLE daily_check_ins ADD COLUMN IF NOT EXISTS pain_intensity INTEGER CHECK (pain_intensity >= 1 AND pain_intensity <= 10);

-- Add progress photo storage
ALTER TABLE daily_check_ins ADD COLUMN IF NOT EXISTS progress_photo TEXT; -- Base64 encoded image or URL

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_check_ins_sleep_quality ON daily_check_ins(sleep_quality) WHERE sleep_quality IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_daily_check_ins_energy_level ON daily_check_ins(energy_level) WHERE energy_level IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_daily_check_ins_pain ON daily_check_ins(pain_experienced) WHERE pain_experienced = true;
CREATE INDEX IF NOT EXISTS idx_daily_check_ins_client_id_date ON daily_check_ins(client_id, check_in_date);

