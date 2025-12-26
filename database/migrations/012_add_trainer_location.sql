-- Migration: Add location field to trainers table
-- Allows trainers to specify their location for better client matching

ALTER TABLE trainers ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- Add index for location searches
CREATE INDEX IF NOT EXISTS idx_trainers_location ON trainers(location);

