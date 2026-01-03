-- Migration: Add Program Week Names
-- Allows naming weeks in programs (e.g., "Push Pull Legs", "Upper Lower", etc.)

-- Program Weeks table (stores week names for each program)
CREATE TABLE IF NOT EXISTS program_weeks (
    id SERIAL PRIMARY KEY,
    program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL, -- Week 1, 2, 3, etc.
    week_name VARCHAR(255), -- Custom name for the week (e.g., "Push Pull Legs", "Upper Lower")
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(program_id, week_number)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_program_weeks_program_id ON program_weeks(program_id);
CREATE INDEX IF NOT EXISTS idx_program_weeks_week_number ON program_weeks(week_number);


