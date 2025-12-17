-- Migration: Add comprehensive client profile fields for self-registration

-- Add missing fields for comprehensive client profile
ALTER TABLE clients ADD COLUMN IF NOT EXISTS activity_level VARCHAR(50); -- sedentary, light, moderate, active, very_active
ALTER TABLE clients ADD COLUMN IF NOT EXISTS available_dates JSONB; -- Array of available days/times
ALTER TABLE clients ADD COLUMN IF NOT EXISTS location VARCHAR(255); -- City, State, or address
ALTER TABLE clients ADD COLUMN IF NOT EXISTS nutrition_habits TEXT; -- Current eating patterns
ALTER TABLE clients ADD COLUMN IF NOT EXISTS nutrition_experience TEXT; -- Experience with dieting
ALTER TABLE clients ADD COLUMN IF NOT EXISTS injuries TEXT; -- Any injuries or limitations
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sleep_hours INTEGER; -- Average hours of sleep per night
ALTER TABLE clients ADD COLUMN IF NOT EXISTS stress_level VARCHAR(50); -- low, moderate, high
ALTER TABLE clients ADD COLUMN IF NOT EXISTS lifestyle_activity TEXT; -- Daily activity level description
ALTER TABLE clients ADD COLUMN IF NOT EXISTS psychological_barriers TEXT; -- Mental barriers to fitness
ALTER TABLE clients ADD COLUMN IF NOT EXISTS mindset TEXT; -- Current mindset about fitness
ALTER TABLE clients ADD COLUMN IF NOT EXISTS motivation_why TEXT; -- Why they want to get fit

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_clients_onboarding_completed ON clients(onboarding_completed);

