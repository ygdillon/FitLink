-- Recurring Sessions Support

-- Add recurring session fields to sessions table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'is_recurring') THEN
        ALTER TABLE sessions ADD COLUMN is_recurring BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'recurring_pattern') THEN
        ALTER TABLE sessions ADD COLUMN recurring_pattern VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'recurring_end_date') THEN
        ALTER TABLE sessions ADD COLUMN recurring_end_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'recurring_parent_id') THEN
        ALTER TABLE sessions ADD COLUMN recurring_parent_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'day_of_week') THEN
        ALTER TABLE sessions ADD COLUMN day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6);
    END IF;
END $$;

-- Index for recurring sessions
CREATE INDEX IF NOT EXISTS idx_sessions_recurring_parent ON sessions(recurring_parent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_recurring ON sessions(is_recurring);

