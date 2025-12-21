-- Migration: Add trainer alerts system
-- Alerts for low ratings, pain reports, and other important notifications

CREATE TABLE IF NOT EXISTS trainer_alerts (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('low_rating', 'pain_report', 'missed_checkin', 'consistency_drop', 'positive_trend')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT false,
    related_checkin_id INTEGER REFERENCES daily_check_ins(id) ON DELETE SET NULL,
    metadata JSONB, -- Store additional data like rating value, pain location, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trainer_alerts_trainer_id ON trainer_alerts(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_alerts_client_id ON trainer_alerts(client_id);
CREATE INDEX IF NOT EXISTS idx_trainer_alerts_is_read ON trainer_alerts(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_trainer_alerts_created_at ON trainer_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trainer_alerts_alert_type ON trainer_alerts(alert_type);

