# Trainr - Personal Trainer App

A comprehensive personal trainer application built with a hybrid Web2/Web3 architecture, connecting trainers with clients for workout management, progress tracking, and communication. **Zero platform fees** - trainers receive 100% of payments through peer-to-peer transactions.

Trainr connects personal trainers with clients through a hybrid Web2/Web3 platform. Trainers create custom workouts, manage multiple clients, and track real-time progress. Clients access assigned workouts, log metrics, and communicate directly. Blockchain-verified reputation ensures trust.

## 🏗️ Architecture

- **Frontend**: React
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Payments**: Stripe Connect (P2P - Zero platform fees)
- **Blockchain**: Aptos (for reputation, reviews, verification, and payment escrow)

## 📁 Project Structure

```
personalTrainer App/
├── frontend/          # React application
├── backend/           # Node.js API server
├── database/          # PostgreSQL schemas and migrations
├── blockchain/        # Aptos smart contracts and integration
└── PROJECT_CANVAS.md  # Project planning document
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14.0
- npm or yarn

### Installation

1. Install all dependencies:
```bash
npm run install:all
```

2. Set up environment variables:
- Copy `.env.example` files in `frontend/` and `backend/`
- Configure database connection, API keys, etc.

3. Set up database:
```bash
cd database
npm run migrate
```

4. Start development servers:
```bash
npm run dev
```

This will start both frontend (typically on port 3000) and backend (typically on port 5000).

## 📝 Development

- Frontend runs on: http://localhost:3000
- Backend API runs on: http://localhost:5000

## 🔐 Environment Variables

See `.env.example` files in `frontend/` and `backend/` directories for required environment variables.

## 📚 Documentation

See `PROJECT_CANVAS.md` for detailed project planning and architecture decisions.
