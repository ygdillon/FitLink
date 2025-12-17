-- Scheduling System Tables

-- Sessions table (scheduled training sessions)
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workout_id INTEGER REFERENCES workouts(id) ON DELETE SET NULL,
    session_date DATE NOT NULL,
    session_time TIME NOT NULL,
    duration INTEGER DEFAULT 60, -- in minutes
    session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('in_person', 'online', 'hybrid')),
    location TEXT, -- For in-person sessions
    meeting_link TEXT, -- For online sessions (Zoom, Google Meet, etc.)
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
    notes TEXT,
    client_notes TEXT, -- Notes from client
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trainer availability (recurring availability slots)
CREATE TABLE IF NOT EXISTS trainer_availability (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(trainer_id, day_of_week, start_time)
);

-- Session cancellations/reschedules
CREATE TABLE IF NOT EXISTS session_changes (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('cancelled', 'rescheduled')),
    original_date DATE NOT NULL,
    original_time TIME NOT NULL,
    new_date DATE,
    new_time TIME,
    reason TEXT,
    requested_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_trainer_id ON sessions(trainer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_client_id ON sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_trainer_availability_trainer_id ON trainer_availability(trainer_id);
CREATE INDEX IF NOT EXISTS idx_session_changes_session_id ON session_changes(session_id);

-- Trigger to update updated_at
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trainer_availability_updated_at BEFORE UPDATE ON trainer_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

