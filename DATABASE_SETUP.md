# Database Setup Guide

## Issue Fixed
✅ The migration script path has been corrected. The script now correctly finds `database/migrate.js`.

## Current Issue
The migration is failing because PostgreSQL is not running or not configured.

## Setup Steps

### 1. Install PostgreSQL (if not installed)
```bash
# macOS (using Homebrew)
brew install postgresql@14
brew services start postgresql@14

# Or download from: https://www.postgresql.org/download/
```

### 2. Create the Database
```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE personal_trainer_app;

# Exit psql
\q
```

### 3. Configure Environment Variables
Create `backend/.env` file with your database credentials:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=personal_trainer_app
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# JWT
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=7d

# Aptos Blockchain
APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com
APTOS_FAUCET_URL=https://faucet.testnet.aptoslabs.com

# Stripe (optional for MVP)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Frontend URL (for Stripe Connect redirects)
FRONTEND_URL=http://localhost:3000
```

**Important**: Replace `your_postgres_password` with your actual PostgreSQL password.

### 4. Run Migration
Once PostgreSQL is running and `.env` is configured:

```bash
cd backend
npm run migrate
```

### 5. Verify Database Connection
The migration should complete successfully and create all tables. If you see "Database migration completed successfully!", you're all set!

## Troubleshooting

### PostgreSQL not running
```bash
# macOS
brew services start postgresql@14

# Linux
sudo systemctl start postgresql

# Windows
# Start PostgreSQL service from Services panel
```

### Connection refused error
- Check if PostgreSQL is running: `pg_isready`
- Verify your `.env` file has correct credentials
- Check if PostgreSQL is listening on port 5432: `lsof -i:5432`

### Permission denied
- Make sure your PostgreSQL user has permission to create databases
- Try using `postgres` superuser for initial setup

