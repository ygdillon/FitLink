-- Migration: Add read status to trainer_requests table

-- Add is_read column to trainer_requests
ALTER TABLE trainer_requests ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Add read_at timestamp
ALTER TABLE trainer_requests ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;

-- Create index for faster queries on unread requests
CREATE INDEX IF NOT EXISTS idx_trainer_requests_unread ON trainer_requests(trainer_id, is_read) WHERE is_read = false;

