# Setup Guide

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14.0
- npm or yarn

## Installation Steps

### 1. Install Dependencies

```bash
npm run install:all
```

This will install dependencies for the root, frontend, and backend.

### 2. Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE personal_trainer_app;
```

2. Set up environment variables for the backend:
Create `backend/.env` with:
```
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=personal_trainer_app
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=7d
APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com
APTOS_FAUCET_URL=https://faucet.testnet.aptoslabs.com
```

3. Run database migrations:
```bash
cd backend
npm run migrate
```

### 3. Frontend Setup

Create `frontend/.env` (optional, defaults work for development):
```
VITE_API_URL=http://localhost:5000/api
```

### 4. Start Development Servers

From the root directory:
```bash
npm run dev
```

This will start:
- Frontend on http://localhost:3000
- Backend API on http://localhost:5000

## Project Structure

```
personalTrainer App/
├── frontend/          # React application (Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   └── services/
├── backend/          # Node.js/Express API
│   ├── config/
│   ├── middleware/
│   └── routes/
├── database/         # PostgreSQL schemas
│   └── schema.sql
└── blockchain/       # Aptos integration
    └── aptos.js
```

## Testing the Setup

1. Register a new user (trainer or client)
2. Login with your credentials
3. Create a workout (as trainer)
4. View assigned workouts (as client)
5. Track progress (as client)

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check database credentials in `backend/.env`
- Verify database exists: `psql -l`

### Port Already in Use
- Change `PORT` in `backend/.env`
- Update `vite.config.js` proxy target if backend port changes

### Module Not Found Errors
- Run `npm run install:all` again
- Delete `node_modules` and reinstall

## Next Steps

- Review `PROJECT_CANVAS.md` for feature roadmap
- Integrate professional trainer feedback
- Set up blockchain smart contracts
- Configure Stripe for payments (optional)

