-- Migration: Add nutrition tracking for clients

-- Create nutrition plans table
CREATE TABLE IF NOT EXISTS nutrition_plans (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trainer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_name VARCHAR(255) NOT NULL,
    daily_calories INTEGER,
    daily_protein DECIMAL(6, 2), -- in grams
    daily_carbs DECIMAL(6, 2), -- in grams
    daily_fats DECIMAL(6, 2), -- in grams
    meal_plan JSONB, -- Structured meal plan with meals and foods
    notes TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create nutrition logs table (daily food intake tracking)
CREATE TABLE IF NOT EXISTS nutrition_logs (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    meal_type VARCHAR(50), -- breakfast, lunch, dinner, snack
    food_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(6, 2),
    unit VARCHAR(50), -- grams, oz, cups, etc.
    calories DECIMAL(6, 2),
    protein DECIMAL(6, 2),
    carbs DECIMAL(6, 2),
    fats DECIMAL(6, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create nutrition goals table (macro targets)
CREATE TABLE IF NOT EXISTS nutrition_goals (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_calories INTEGER,
    target_protein DECIMAL(6, 2),
    target_carbs DECIMAL(6, 2),
    target_fats DECIMAL(6, 2),
    water_intake_goal DECIMAL(6, 2), -- in liters or oz
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_client_id ON nutrition_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_trainer_id ON nutrition_plans(trainer_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_client_id ON nutrition_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_date ON nutrition_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_nutrition_goals_client_id ON nutrition_goals(client_id);

-- Add triggers for updated_at
CREATE TRIGGER update_nutrition_plans_updated_at BEFORE UPDATE ON nutrition_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nutrition_logs_updated_at BEFORE UPDATE ON nutrition_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nutrition_goals_updated_at BEFORE UPDATE ON nutrition_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

