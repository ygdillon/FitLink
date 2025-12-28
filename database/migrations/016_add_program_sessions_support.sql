-- Add Program Workout Support to Sessions
-- This allows sessions to be linked to program workouts, enabling auto-scheduling from program assignments

-- Add program_workout_id to sessions table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'program_workout_id') THEN
        ALTER TABLE sessions ADD COLUMN program_workout_id INTEGER REFERENCES program_workouts(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'program_id') THEN
        ALTER TABLE sessions ADD COLUMN program_id INTEGER REFERENCES programs(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add index for program_workout_id lookups
CREATE INDEX IF NOT EXISTS idx_sessions_program_workout_id ON sessions(program_workout_id);
CREATE INDEX IF NOT EXISTS idx_sessions_program_id ON sessions(program_id);

-- Add default session preferences to trainers table
DO $$
BEGIN
    -- Add default session time if column doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'default_session_time') THEN
        ALTER TABLE trainers ADD COLUMN default_session_time TIME DEFAULT '18:00:00';
    END IF;
    
    -- Add default session duration if column doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'default_session_duration') THEN
        ALTER TABLE trainers ADD COLUMN default_session_duration INTEGER DEFAULT 60;
    END IF;
    
    -- Add default session type if column doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'default_session_type') THEN
        ALTER TABLE trainers ADD COLUMN default_session_type VARCHAR(50) DEFAULT 'in_person' CHECK (default_session_type IN ('in_person', 'online', 'hybrid'));
    END IF;
    
    -- Add default location if column doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainers' AND column_name = 'default_session_location') THEN
        ALTER TABLE trainers ADD COLUMN default_session_location TEXT;
    END IF;
END $$;

