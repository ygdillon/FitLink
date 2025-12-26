-- Migration: Add comprehensive nutrition program builder system
-- Based on Nutrition Program Builder MVP

-- ============================================
-- NUTRITION PROFILE SYSTEM
-- ============================================

-- Client Nutrition Profiles (comprehensive nutrition data)
CREATE TABLE IF NOT EXISTS client_nutrition_profiles (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trainer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Body Composition & Metrics
    current_weight DECIMAL(6, 2), -- lbs or kg
    height_cm DECIMAL(6, 2), -- height in cm (can be decimal)
    age INTEGER,
    biological_sex VARCHAR(20), -- 'male', 'female', 'other'
    body_fat_percentage DECIMAL(5, 2), -- optional
    waist_circumference DECIMAL(6, 2), -- optional
    weight_trend VARCHAR(50), -- 'gaining', 'losing', 'stable'
    
    -- Activity & Lifestyle
    training_frequency INTEGER, -- days per week
    training_type VARCHAR(100), -- 'strength', 'cardio', 'both', 'athletic'
    training_duration INTEGER, -- minutes per session
    daily_activity_level VARCHAR(50), -- 'sedentary', 'lightly_active', 'moderately_active', 'very_active'
    steps_per_day INTEGER,
    sleep_hours DECIMAL(4, 1),
    sleep_quality VARCHAR(50), -- 'poor', 'fair', 'good', 'excellent'
    
    -- Nutrition History
    current_eating_habits TEXT,
    previous_diet_attempts JSONB, -- Array of previous diets tried
    nutrition_challenges TEXT, -- Biggest challenges
    food_relationship TEXT, -- Relationship with food
    
    -- Dietary Framework Preferences
    dietary_framework VARCHAR(50), -- 'omnivore', 'vegetarian', 'vegan', 'pescatarian'
    religious_restrictions TEXT, -- halal, kosher, etc.
    allergies JSONB, -- Array of allergies
    dislikes JSONB, -- Array of foods they won't eat
    cooking_skill_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
    meal_prep_time VARCHAR(50), -- 'none', '1-2_hours_week', 'daily'
    
    -- Goal-Specific Information
    primary_goal VARCHAR(50), -- 'lose_fat', 'build_muscle', 'maintain', 'performance', 'health'
    rate_of_change VARCHAR(50), -- 'aggressive', 'moderate', 'conservative'
    target_weight DECIMAL(6, 2),
    timeline_expectations TEXT,
    upcoming_events TEXT,
    
    -- Lifestyle Constraints
    budget_level VARCHAR(50), -- 'tight', 'moderate', 'flexible'
    family_situation VARCHAR(50), -- 'single', 'family', 'roommates'
    social_eating_frequency VARCHAR(50), -- 'rare', 'occasional', 'frequent'
    travel_frequency VARCHAR(50), -- 'none', 'occasional', 'frequent'
    kitchen_access BOOLEAN DEFAULT true,
    food_storage_options TEXT,
    
    -- Psychological Factors
    food_as_reward BOOLEAN,
    stress_eating_patterns TEXT,
    adherence_personality VARCHAR(50), -- 'structured', 'flexible', 'intuitive'
    accountability_preference VARCHAR(50), -- 'daily', 'weekly', 'autonomous'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id)
);

-- ============================================
-- FOOD DATABASE
-- ============================================

-- Food Database (comprehensive food library)
CREATE TABLE IF NOT EXISTS foods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255), -- Optional brand name
    category VARCHAR(100) NOT NULL, -- 'protein', 'carb', 'fat', 'combination', 'vegetable', 'fruit'
    
    -- Serving Information
    serving_size DECIMAL(8, 2) NOT NULL, -- Amount
    serving_unit VARCHAR(50) NOT NULL, -- 'g', 'oz', 'cup', 'piece', 'tbsp', etc.
    
    -- Macronutrients (per serving)
    calories DECIMAL(8, 2) NOT NULL,
    protein DECIMAL(8, 2) DEFAULT 0, -- grams
    carbs DECIMAL(8, 2) DEFAULT 0, -- grams
    fats DECIMAL(8, 2) DEFAULT 0, -- grams
    fiber DECIMAL(8, 2) DEFAULT 0, -- grams
    
    -- Additional Info
    quality_tier VARCHAR(50), -- 'lean', 'moderate_fat', 'high_fat', 'processed', 'whole_food'
    preparation_methods JSONB, -- Array of common prep methods
    price_tier VARCHAR(50), -- 'budget', 'moderate', 'premium'
    common_brands JSONB, -- Array of common brand names
    
    -- Special Attributes
    is_vegan BOOLEAN DEFAULT false,
    is_vegetarian BOOLEAN DEFAULT true,
    is_gluten_free BOOLEAN DEFAULT false,
    is_dairy_free BOOLEAN DEFAULT false,
    is_nut_free BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- RECIPE DATABASE
-- ============================================

-- Recipe Database
CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- 'breakfast', 'lunch', 'dinner', 'snack', 'treat', 'basic'
    
    -- Recipe Details
    total_yield INTEGER NOT NULL, -- Number of servings
    prep_time INTEGER, -- minutes
    cook_time INTEGER, -- minutes
    total_time INTEGER, -- minutes
    difficulty_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
    equipment_needed JSONB, -- Array of required equipment
    
    -- Macros per serving (calculated from ingredients)
    calories_per_serving DECIMAL(8, 2),
    protein_per_serving DECIMAL(8, 2),
    carbs_per_serving DECIMAL(8, 2),
    fats_per_serving DECIMAL(8, 2),
    
    -- Recipe Content
    ingredients JSONB NOT NULL, -- Array of {food_id, amount, unit, notes}
    instructions TEXT NOT NULL, -- Step-by-step instructions
    storage_instructions TEXT,
    substitution_options JSONB, -- Array of ingredient substitutions
    
    -- Tags
    tags JSONB, -- ['quick', 'budget', 'kid-friendly', 'meal-prep', 'one-pot', etc.]
    
    -- Dietary Attributes
    is_vegan BOOLEAN DEFAULT false,
    is_vegetarian BOOLEAN DEFAULT true,
    is_gluten_free BOOLEAN DEFAULT false,
    is_dairy_free BOOLEAN DEFAULT false,
    is_nut_free BOOLEAN DEFAULT false,
    
    -- Metadata
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, -- NULL for system recipes
    is_system_recipe BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ENHANCED NUTRITION PLANS
-- ============================================

-- Enhanced Nutrition Plans (replaces/enhances existing nutrition_plans)
ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS nutrition_approach VARCHAR(50); -- 'macro_tracking', 'meal_plan', 'portion_control', 'hybrid'
ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS meal_frequency INTEGER; -- Number of meals per day
ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS meal_distribution JSONB; -- How macros are distributed across meals
ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS calculation_method VARCHAR(50); -- 'mifflin_st_jeor', 'quick_method', 'manual'
ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS activity_multiplier DECIMAL(4, 2);
ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS bmr DECIMAL(8, 2); -- Basal Metabolic Rate
ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS tdee DECIMAL(8, 2); -- Total Daily Energy Expenditure
ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS goal_adjustment DECIMAL(8, 2); -- Calorie adjustment for goal
ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50); -- 'fat_loss', 'muscle_gain', 'maintenance', 'performance'
ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS rate_of_change VARCHAR(50); -- 'aggressive', 'moderate', 'conservative'

-- Meal Plan Structure (detailed meal plans)
CREATE TABLE IF NOT EXISTS meal_plan_meals (
    id SERIAL PRIMARY KEY,
    nutrition_plan_id INTEGER NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL, -- 1-7 for weekly plans
    meal_number INTEGER NOT NULL, -- 1, 2, 3, 4, etc.
    meal_name VARCHAR(255), -- 'Breakfast', 'Lunch', 'Dinner', 'Snack', etc.
    meal_time VARCHAR(50), -- '7:00 AM', '12:30 PM', etc.
    
    -- Target macros for this meal
    target_calories DECIMAL(8, 2),
    target_protein DECIMAL(8, 2),
    target_carbs DECIMAL(8, 2),
    target_fats DECIMAL(8, 2),
    
    -- Meal content
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL, -- If using a recipe
    custom_meal JSONB, -- Custom meal structure if not using recipe
    alternative_options JSONB, -- Array of alternative meal options
    
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Meal Plan Foods (foods within a meal)
CREATE TABLE IF NOT EXISTS meal_plan_foods (
    id SERIAL PRIMARY KEY,
    meal_plan_meal_id INTEGER NOT NULL REFERENCES meal_plan_meals(id) ON DELETE CASCADE,
    food_id INTEGER REFERENCES foods(id) ON DELETE SET NULL,
    food_name VARCHAR(255) NOT NULL, -- Fallback if food_id is null
    quantity DECIMAL(8, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    
    -- Calculated macros for this food in this meal
    calories DECIMAL(8, 2),
    protein DECIMAL(8, 2),
    carbs DECIMAL(8, 2),
    fats DECIMAL(8, 2),
    
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- NUTRITION TEMPLATES
-- ============================================

-- Nutrition Plan Templates (pre-built nutrition plans)
CREATE TABLE IF NOT EXISTS nutrition_plan_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Template Criteria
    target_goal VARCHAR(50), -- 'lose_fat', 'build_muscle', 'maintain', 'performance'
    target_calorie_range JSONB, -- {min: 1500, max: 2500}
    target_experience_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
    dietary_framework VARCHAR(50), -- 'omnivore', 'vegetarian', 'vegan', etc.
    meal_frequency INTEGER, -- 3, 4, 5, 6
    nutrition_approach VARCHAR(50), -- 'macro_tracking', 'meal_plan', 'portion_control'
    
    -- Template Structure
    meal_plan_structure JSONB, -- Structure of the meal plan
    
    is_system_template BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PROGRESS TRACKING ENHANCEMENTS
-- ============================================

-- Enhanced Nutrition Logs (add adherence tracking)
ALTER TABLE nutrition_logs ADD COLUMN IF NOT EXISTS adherence_rating INTEGER; -- 1-5 rating
ALTER TABLE nutrition_logs ADD COLUMN IF NOT EXISTS meal_plan_meal_id INTEGER REFERENCES meal_plan_meals(id) ON DELETE SET NULL; -- Link to meal plan if applicable

-- Nutrition Progress Tracking
CREATE TABLE IF NOT EXISTS nutrition_progress (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nutrition_plan_id INTEGER REFERENCES nutrition_plans(id) ON DELETE SET NULL,
    check_in_date DATE NOT NULL,
    
    -- Metrics
    weight DECIMAL(6, 2),
    body_fat_percentage DECIMAL(5, 2),
    measurements JSONB, -- {waist, hips, chest, arms, thighs}
    
    -- Adherence
    adherence_rate DECIMAL(5, 2), -- Percentage of days following plan
    average_daily_calories DECIMAL(8, 2),
    average_daily_protein DECIMAL(8, 2),
    average_daily_carbs DECIMAL(8, 2),
    average_daily_fats DECIMAL(8, 2),
    
    -- Subjective Metrics
    energy_level INTEGER, -- 1-10
    hunger_level INTEGER, -- 1-10
    mood_rating INTEGER, -- 1-10
    sleep_quality VARCHAR(50),
    
    -- Notes
    notes TEXT,
    trainer_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_client_nutrition_profiles_client_id ON client_nutrition_profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_client_nutrition_profiles_trainer_id ON client_nutrition_profiles(trainer_id);
CREATE INDEX IF NOT EXISTS idx_foods_category ON foods(category);
CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes(name);
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_nutrition_plan_id ON meal_plan_meals(nutrition_plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_day_number ON meal_plan_meals(day_number);
CREATE INDEX IF NOT EXISTS idx_meal_plan_foods_meal_plan_meal_id ON meal_plan_foods(meal_plan_meal_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_progress_client_id ON nutrition_progress(client_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_progress_check_in_date ON nutrition_progress(check_in_date);

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS update_client_nutrition_profiles_updated_at ON client_nutrition_profiles;
CREATE TRIGGER update_client_nutrition_profiles_updated_at BEFORE UPDATE ON client_nutrition_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_foods_updated_at ON foods;
CREATE TRIGGER update_foods_updated_at BEFORE UPDATE ON foods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_recipes_updated_at ON recipes;
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_nutrition_plan_templates_updated_at ON nutrition_plan_templates;
CREATE TRIGGER update_nutrition_plan_templates_updated_at BEFORE UPDATE ON nutrition_plan_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_nutrition_progress_updated_at ON nutrition_progress;
CREATE TRIGGER update_nutrition_progress_updated_at BEFORE UPDATE ON nutrition_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

