-- Migration: Add meals recommendations system
-- Supports both structured meal plans and flexible meal guidance

-- ============================================
-- TRAINER MEAL RECOMMENDATIONS
-- ============================================

-- Stores meals/recipes that trainers recommend to clients (flexible meal guidance)
CREATE TABLE IF NOT EXISTS trainer_meal_recommendations (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nutrition_plan_id INTEGER REFERENCES nutrition_plans(id) ON DELETE CASCADE,
    
    -- Meal/Recipe Reference
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    meal_name VARCHAR(255) NOT NULL,
    meal_description TEXT,
    
    -- Category & Type
    meal_category VARCHAR(50) NOT NULL, -- 'breakfast', 'lunch', 'dinner', 'snack', 'quick_eat'
    meal_type VARCHAR(50), -- 'main_dish', 'side', 'dessert', 'beverage'
    
    -- Macros (per serving)
    calories_per_serving DECIMAL(8, 2),
    protein_per_serving DECIMAL(8, 2),
    carbs_per_serving DECIMAL(8, 2),
    fats_per_serving DECIMAL(8, 2),
    
    -- Assignment Details
    is_assigned BOOLEAN DEFAULT false, -- If assigned to specific day
    assigned_day_number INTEGER, -- 1-7 for weekly plans
    assigned_date DATE, -- For specific date assignments
    assigned_meal_slot VARCHAR(50), -- 'breakfast', 'lunch', 'dinner', 'snack_1', 'snack_2'
    
    -- Recommendation Details
    recommendation_type VARCHAR(50) DEFAULT 'flexible', -- 'flexible', 'assigned', 'suggested'
    priority INTEGER DEFAULT 0, -- Higher = more recommended
    notes TEXT, -- Trainer notes for client
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trainer_meal_recommendations_client ON trainer_meal_recommendations(client_id, is_active);
CREATE INDEX IF NOT EXISTS idx_trainer_meal_recommendations_category ON trainer_meal_recommendations(meal_category, is_active);
CREATE INDEX IF NOT EXISTS idx_trainer_meal_recommendations_trainer ON trainer_meal_recommendations(trainer_id, client_id);

-- ============================================
-- CLIENT MEAL SELECTIONS
-- ============================================

-- Tracks which meals clients have selected/logged from recommendations
CREATE TABLE IF NOT EXISTS client_meal_selections (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recommendation_id INTEGER REFERENCES trainer_meal_recommendations(id) ON DELETE SET NULL,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL,
    
    -- Selection Details
    selected_date DATE NOT NULL,
    meal_category VARCHAR(50) NOT NULL,
    meal_slot VARCHAR(50), -- 'breakfast', 'lunch', 'dinner', 'snack_1', etc.
    
    -- Actual Consumption
    servings DECIMAL(4, 2) DEFAULT 1.0,
    actual_calories DECIMAL(8, 2),
    actual_protein DECIMAL(8, 2),
    actual_carbs DECIMAL(8, 2),
    actual_fats DECIMAL(8, 2),
    
    -- Status
    is_logged BOOLEAN DEFAULT false, -- If added to nutrition_logs
    nutrition_log_id INTEGER REFERENCES nutrition_logs(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_meal_selections_date ON client_meal_selections(client_id, selected_date);
CREATE INDEX IF NOT EXISTS idx_client_meal_selections_category ON client_meal_selections(meal_category, selected_date);

-- ============================================
-- RECIPE ENHANCEMENTS
-- ============================================

-- Add columns to recipes table if they don't exist
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS nutrition_tips TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS prep_tips TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS storage_tips TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS serving_suggestions TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_quick_meal BOOLEAN DEFAULT false; -- < 15 min prep
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_meal_prep_friendly BOOLEAN DEFAULT false;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp for trainer_meal_recommendations
DROP TRIGGER IF EXISTS update_trainer_meal_recommendations_updated_at ON trainer_meal_recommendations;
CREATE TRIGGER update_trainer_meal_recommendations_updated_at
    BEFORE UPDATE ON trainer_meal_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

