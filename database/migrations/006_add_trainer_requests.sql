-- Migration: Add trainer requests table for request/approval system

-- Create trainer_requests table
CREATE TABLE IF NOT EXISTS trainer_requests (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trainer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    message TEXT, -- Optional message from client
    trainer_response TEXT, -- Optional response from trainer
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, trainer_id, status) -- Prevent duplicate pending requests
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_trainer_requests_trainer ON trainer_requests(trainer_id, status);
CREATE INDEX IF NOT EXISTS idx_trainer_requests_client ON trainer_requests(client_id, status);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trainer_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trainer_requests_updated_at
    BEFORE UPDATE ON trainer_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_trainer_requests_updated_at();

