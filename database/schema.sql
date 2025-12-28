-- Personal Trainer App Database Schema
-- Based on CampusCuts architecture patterns

-- Users table (core user data)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('trainer', 'client')),
    profile_image VARCHAR(255),
    blockchain_address VARCHAR(255),
    verification_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trainers table (trainer-specific data)
CREATE TABLE IF NOT EXISTS trainers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    certifications JSONB,
    specialties JSONB,
    hourly_rate DECIMAL(10, 2),
    total_clients INTEGER DEFAULT 0,
    active_clients INTEGER DEFAULT 0,
    blockchain_reputation_score DECIMAL(5, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients table (client-specific data)
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trainer_id INTEGER REFERENCES trainers(user_id) ON DELETE SET NULL,
    goals JSONB,
    start_date DATE,
    subscription_status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Progress entries (client progress tracking)
CREATE TABLE IF NOT EXISTS progress_entries (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weight DECIMAL(5, 2),
    body_fat DECIMAL(5, 2),
    measurements JSONB,
    photos JSONB,
    notes TEXT,
    blockchain_milestone_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages (communication between trainers and clients)
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_status BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews (blockchain-verified reviews)
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blockchain_hash VARCHAR(255) UNIQUE,
    verified_status BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_trainers_user_id ON trainers(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_trainer_id ON clients(trainer_id);
CREATE INDEX IF NOT EXISTS idx_progress_entries_client_id ON progress_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_progress_entries_date ON progress_entries(date);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_reviews_trainer_id ON reviews(trainer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON reviews(client_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trainers_updated_at ON trainers;
CREATE TRIGGER update_trainers_updated_at BEFORE UPDATE ON trainers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- Subscriptions table (recurring payments) - Created before payments since payments references it
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    billing_cycle VARCHAR(50) NOT NULL CHECK (billing_cycle IN ('weekly', 'monthly', 'yearly')),
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),
    stripe_connect_account_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid')),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table (P2P payment records) - Created after subscriptions since it references subscriptions
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('subscription', 'one-time', 'escrow')),
    stripe_payment_intent_id VARCHAR(255),
    stripe_connect_account_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
    billing_cycle VARCHAR(50),
    blockchain_escrow_hash VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trainer Stripe Connect accounts (for P2P payments)
CREATE TABLE IF NOT EXISTS trainer_stripe_accounts (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_account_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_account_type VARCHAR(50) DEFAULT 'express',
    onboarding_completed BOOLEAN DEFAULT false,
    charges_enabled BOOLEAN DEFAULT false,
    payouts_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_trainer_id ON payments(trainer_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trainer_id ON subscriptions(trainer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_client_id ON subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_trainer_stripe_accounts_trainer_id ON trainer_stripe_accounts(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_stripe_accounts_stripe_account_id ON trainer_stripe_accounts(stripe_account_id);

-- Triggers for payment tables
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trainer_stripe_accounts_updated_at ON trainer_stripe_accounts;
CREATE TRIGGER update_trainer_stripe_accounts_updated_at BEFORE UPDATE ON trainer_stripe_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

