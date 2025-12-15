-- Migration: Add comprehensive client onboarding data
-- Based on professional trainer feedback

-- Add comprehensive client onboarding fields
ALTER TABLE clients ADD COLUMN IF NOT EXISTS height DECIMAL(5, 2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS weight DECIMAL(5, 2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS previous_experience TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS average_daily_eating TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS primary_goal TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS goal_target VARCHAR(255); -- e.g., "Lose 20 lbs"
ALTER TABLE clients ADD COLUMN IF NOT EXISTS goal_timeframe VARCHAR(100); -- e.g., "3 months"
ALTER TABLE clients ADD COLUMN IF NOT EXISTS secondary_goals JSONB;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS barriers TEXT; -- What kept them from gym
ALTER TABLE clients ADD COLUMN IF NOT EXISTS training_preference VARCHAR(50); -- in-person, online, hybrid
ALTER TABLE clients ADD COLUMN IF NOT EXISTS communication_preference VARCHAR(50); -- daily, weekly, etc.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_data JSONB; -- Store full onboarding form data

-- Add status field if it doesn't exist
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Create custom metrics table for flexible progress tracking
CREATE TABLE IF NOT EXISTS custom_metrics (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metric_name VARCHAR(255) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- weight, strength, custom, etc.
    unit VARCHAR(50), -- lbs, kg, reps, etc.
    target_value DECIMAL(10, 2),
    current_value DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create progress entries with custom metrics support
ALTER TABLE progress_entries ADD COLUMN IF NOT EXISTS custom_metrics JSONB;

-- Create daily check-ins table for accountability
CREATE TABLE IF NOT EXISTS daily_check_ins (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL,
    workout_completed BOOLEAN,
    diet_stuck_to BOOLEAN,
    notes TEXT,
    trainer_response TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, missed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, check_in_date)
);

-- Create index for daily check-ins
CREATE INDEX IF NOT EXISTS idx_daily_check_ins_client_id ON daily_check_ins(client_id);
CREATE INDEX IF NOT EXISTS idx_daily_check_ins_date ON daily_check_ins(check_in_date);
CREATE INDEX IF NOT EXISTS idx_custom_metrics_client_id ON custom_metrics(client_id);

-- Add trigger for custom_metrics updated_at
CREATE TRIGGER update_custom_metrics_updated_at BEFORE UPDATE ON custom_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for daily_check_ins updated_at
CREATE TRIGGER update_daily_check_ins_updated_at BEFORE UPDATE ON daily_check_ins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

