-- Combined migration: Programs System + Program Builder System
-- Run this file to create all necessary tables for the program system

-- ============================================
-- Migration 013: Add Programs System
-- ============================================

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

-- Indexes for performance (Migration 013)
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

-- ============================================
-- Migration 014: Add Program Builder System
-- ============================================

-- Enhanced Client Training Profile
ALTER TABLE clients ADD COLUMN IF NOT EXISTS training_experience VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS training_days_per_week INTEGER;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS session_duration_minutes INTEGER;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS equipment_access VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS known_exercises JSONB;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS preferred_exercises JSONB;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS avoided_exercises JSONB;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS training_style_preferences JSONB;

-- Exercise Database
CREATE TABLE IF NOT EXISTS exercises (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    primary_muscle_group VARCHAR(100) NOT NULL,
    secondary_muscle_groups JSONB,
    movement_pattern VARCHAR(100),
    equipment_required VARCHAR(100),
    difficulty_level VARCHAR(50) DEFAULT 'intermediate',
    video_url VARCHAR(500),
    form_cues TEXT,
    common_mistakes TEXT,
    alternative_exercises JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Program Templates
CREATE TABLE IF NOT EXISTS program_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    split_type VARCHAR(100) NOT NULL,
    duration_weeks INTEGER DEFAULT 4,
    target_experience_level VARCHAR(50),
    target_goal VARCHAR(100),
    target_days_per_week INTEGER,
    target_equipment VARCHAR(50),
    target_session_duration INTEGER,
    progression_type VARCHAR(50) DEFAULT 'linear',
    is_system_template BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template Workouts
CREATE TABLE IF NOT EXISTS template_workouts (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES program_templates(id) ON DELETE CASCADE,
    workout_name VARCHAR(255) NOT NULL,
    day_number INTEGER NOT NULL,
    week_number INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template Workout Exercises
CREATE TABLE IF NOT EXISTS template_workout_exercises (
    id SERIAL PRIMARY KEY,
    template_workout_id INTEGER NOT NULL REFERENCES template_workouts(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE SET NULL,
    exercise_name VARCHAR(255) NOT NULL,
    exercise_type VARCHAR(50) DEFAULT 'REGULAR',
    sets INTEGER,
    reps VARCHAR(50),
    weight VARCHAR(50),
    duration VARCHAR(50),
    rest VARCHAR(50),
    tempo VARCHAR(50),
    rpe VARCHAR(50),
    notes TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Program Progression Rules
CREATE TABLE IF NOT EXISTS program_progression_rules (
    id SERIAL PRIMARY KEY,
    program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    progression_type VARCHAR(50) DEFAULT 'linear',
    week_number INTEGER NOT NULL,
    weight_increase_percent DECIMAL(5, 2) DEFAULT 0,
    weight_increase_absolute DECIMAL(5, 2) DEFAULT 0,
    rep_increase INTEGER DEFAULT 0,
    volume_modifier DECIMAL(5, 2) DEFAULT 1.0,
    is_deload BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Program Builder System
CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscle ON exercises(primary_muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercises_movement_pattern ON exercises(movement_pattern);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises(equipment_required);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON exercises(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_program_templates_target_experience ON program_templates(target_experience_level);
CREATE INDEX IF NOT EXISTS idx_program_templates_target_goal ON program_templates(target_goal);
CREATE INDEX IF NOT EXISTS idx_program_templates_split_type ON program_templates(split_type);
CREATE INDEX IF NOT EXISTS idx_template_workouts_template_id ON template_workouts(template_id);
CREATE INDEX IF NOT EXISTS idx_template_workout_exercises_template_workout_id ON template_workout_exercises(template_workout_id);
CREATE INDEX IF NOT EXISTS idx_template_workout_exercises_exercise_id ON template_workout_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_program_progression_rules_program_id ON program_progression_rules(program_id);

-- Trigger for exercises updated_at
CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for program_templates updated_at
CREATE TRIGGER update_program_templates_updated_at BEFORE UPDATE ON program_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


