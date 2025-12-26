-- Migration: Add Programs System
-- Replaces the old workout system with a more structured program-based approach
-- Programs contain multiple workouts assigned to specific days (workout splits)

-- Programs table (replaces workout templates)
CREATE TABLE IF NOT EXISTS programs (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- NULL for templates, set for assigned programs
    name VARCHAR(255) NOT NULL,
    description TEXT,
    split_type VARCHAR(100), -- e.g., 'PPL', 'Upper/Lower', 'Full Body', 'Custom'
    duration_weeks INTEGER DEFAULT 4,
    start_date DATE,
    end_date DATE,
    is_template BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Program workouts (workouts assigned to specific days in a program)
CREATE TABLE IF NOT EXISTS program_workouts (
    id SERIAL PRIMARY KEY,
    program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    workout_name VARCHAR(255) NOT NULL,
    day_number INTEGER NOT NULL, -- Day 1, 2, 3, etc. in the program
    week_number INTEGER DEFAULT 1, -- Week 1, 2, 3, etc.
    order_index INTEGER DEFAULT 0, -- For ordering workouts on the same day
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Program workout exercises (exercises within a program workout)
CREATE TABLE IF NOT EXISTS program_workout_exercises (
    id SERIAL PRIMARY KEY,
    program_workout_id INTEGER NOT NULL REFERENCES program_workouts(id) ON DELETE CASCADE,
    exercise_name VARCHAR(255) NOT NULL,
    exercise_type VARCHAR(50), -- e.g., 'AMRAP', 'INTERVAL', 'REGULAR', 'TABATA', 'ENOM'
    sets INTEGER,
    reps VARCHAR(50), -- Can be "5", "5-8", "AMRAP", etc.
    weight VARCHAR(50), -- Can be "100 lb", "bodyweight", etc.
    duration VARCHAR(50), -- e.g., "10:00" for 10 minutes
    rest VARCHAR(50),
    tempo VARCHAR(50),
    notes TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Program assignments (tracking which clients have which programs)
CREATE TABLE IF NOT EXISTS program_assignments (
    id SERIAL PRIMARY KEY,
    program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL,
    start_date DATE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(program_id, client_id)
);

-- Program workout completions (tracking when clients complete workouts)
CREATE TABLE IF NOT EXISTS program_workout_completions (
    id SERIAL PRIMARY KEY,
    program_workout_id INTEGER NOT NULL REFERENCES program_workouts(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    completed_date DATE NOT NULL,
    exercises_completed JSONB, -- Store actual reps, weights, etc. completed
    notes TEXT,
    duration INTEGER, -- in minutes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_programs_trainer_id ON programs(trainer_id);
CREATE INDEX IF NOT EXISTS idx_programs_client_id ON programs(client_id);
CREATE INDEX IF NOT EXISTS idx_programs_is_template ON programs(is_template);
CREATE INDEX IF NOT EXISTS idx_program_workouts_program_id ON program_workouts(program_id);
CREATE INDEX IF NOT EXISTS idx_program_workouts_day_number ON program_workouts(day_number);
CREATE INDEX IF NOT EXISTS idx_program_workouts_week_number ON program_workouts(week_number);
CREATE INDEX IF NOT EXISTS idx_program_workout_exercises_program_workout_id ON program_workout_exercises(program_workout_id);
CREATE INDEX IF NOT EXISTS idx_program_assignments_client_id ON program_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_program_assignments_program_id ON program_assignments(program_id);
CREATE INDEX IF NOT EXISTS idx_program_workout_completions_client_id ON program_workout_completions(client_id);
CREATE INDEX IF NOT EXISTS idx_program_workout_completions_program_workout_id ON program_workout_completions(program_workout_id);

