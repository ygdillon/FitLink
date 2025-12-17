-- Migration: Add phone number to trainers table

-- Add phone_number column to trainers table
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Add index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_trainers_phone ON trainers(phone_number) WHERE phone_number IS NOT NULL;

