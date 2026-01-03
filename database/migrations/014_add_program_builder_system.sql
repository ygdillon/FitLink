-- Migration: Add Program Builder System
-- Enhances the program system with exercise database, client training profiles, and program templates

-- Enhanced Client Training Profile
ALTER TABLE clients ADD COLUMN IF NOT EXISTS training_experience VARCHAR(50); -- 'never', 'beginner_0_6mo', 'intermediate_6_12mo', 'intermediate_1_2yr', 'advanced_2plus'
ALTER TABLE clients ADD COLUMN IF NOT EXISTS training_days_per_week INTEGER; -- 2-7
ALTER TABLE clients ADD COLUMN IF NOT EXISTS session_duration_minutes INTEGER; -- 30, 45, 60, 75, 90
ALTER TABLE clients ADD COLUMN IF NOT EXISTS equipment_access VARCHAR(50); -- 'full_gym', 'home_gym', 'dumbbells_only', 'bodyweight_only'
ALTER TABLE clients ADD COLUMN IF NOT EXISTS known_exercises JSONB; -- Array of exercise names client knows
ALTER TABLE clients ADD COLUMN IF NOT EXISTS preferred_exercises JSONB; -- Exercises client wants to include
ALTER TABLE clients ADD COLUMN IF NOT EXISTS avoided_exercises JSONB; -- Exercises to avoid
ALTER TABLE clients ADD COLUMN IF NOT EXISTS training_style_preferences JSONB; -- ['strength', 'circuits', 'hiit', etc.]

-- Exercise Database
CREATE TABLE IF NOT EXISTS exercises (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    primary_muscle_group VARCHAR(100) NOT NULL, -- 'chest', 'back', 'shoulders', 'legs', 'arms', 'core'
    secondary_muscle_groups JSONB, -- Array of muscle groups
    movement_pattern VARCHAR(100), -- 'squat', 'hinge', 'push_horizontal', 'push_vertical', 'pull_horizontal', 'pull_vertical', 'carry', 'rotation'
    equipment_required VARCHAR(100), -- 'barbell', 'dumbbells', 'cables', 'machines', 'bodyweight', 'bands', 'kettlebells'
    difficulty_level VARCHAR(50) DEFAULT 'intermediate', -- 'beginner', 'intermediate', 'advanced'
    video_url VARCHAR(500),
    form_cues TEXT,
    common_mistakes TEXT,
    alternative_exercises JSONB, -- Array of exercise IDs that are alternatives
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Program Templates (pre-built program structures)
CREATE TABLE IF NOT EXISTS program_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    split_type VARCHAR(100) NOT NULL, -- 'full_body', 'upper_lower', 'push_pull_legs', 'body_part'
    duration_weeks INTEGER DEFAULT 4,
    target_experience_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced', 'all'
    target_goal VARCHAR(100), -- 'build_muscle', 'get_stronger', 'lose_fat', 'athletic_performance', 'general_fitness'
    target_days_per_week INTEGER, -- 2-7
    target_equipment VARCHAR(50), -- 'full_gym', 'home_gym', 'dumbbells_only', 'bodyweight_only'
    target_session_duration INTEGER, -- minutes
    progression_type VARCHAR(50) DEFAULT 'linear', -- 'linear', 'undulating', 'block', 'double'
    is_system_template BOOLEAN DEFAULT true, -- System templates vs user-created
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, -- NULL for system templates
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template Workouts (workouts within a template)
CREATE TABLE IF NOT EXISTS template_workouts (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES program_templates(id) ON DELETE CASCADE,
    workout_name VARCHAR(255) NOT NULL,
    day_number INTEGER NOT NULL, -- Day 1, 2, 3, etc.
    week_number INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template Workout Exercises
CREATE TABLE IF NOT EXISTS template_workout_exercises (
    id SERIAL PRIMARY KEY,
    template_workout_id INTEGER NOT NULL REFERENCES template_workouts(id) ON DELETE CASCADE,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE SET NULL, -- Reference to exercise database
    exercise_name VARCHAR(255) NOT NULL, -- Fallback if exercise_id is null
    exercise_type VARCHAR(50) DEFAULT 'REGULAR', -- 'AMRAP', 'INTERVAL', 'REGULAR', 'TABATA', 'EMOM'
    sets INTEGER,
    reps VARCHAR(50), -- Can be "5", "5-8", "AMRAP", etc.
    weight VARCHAR(50), -- Can be "100 lb", "bodyweight", "%1RM", etc.
    duration VARCHAR(50),
    rest VARCHAR(50),
    tempo VARCHAR(50), -- e.g., "3010"
    rpe VARCHAR(50), -- Rate of Perceived Exertion
    notes TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Program Progression Rules (how programs progress week-to-week)
CREATE TABLE IF NOT EXISTS program_progression_rules (
    id SERIAL PRIMARY KEY,
    program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    progression_type VARCHAR(50) DEFAULT 'linear', -- 'linear', 'undulating', 'block', 'double'
    week_number INTEGER NOT NULL,
    weight_increase_percent DECIMAL(5, 2) DEFAULT 0, -- Percentage to increase weight
    weight_increase_absolute DECIMAL(5, 2) DEFAULT 0, -- Absolute weight increase (lbs/kg)
    rep_increase INTEGER DEFAULT 0, -- Reps to add
    volume_modifier DECIMAL(5, 2) DEFAULT 1.0, -- Multiplier for total volume
    is_deload BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
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


