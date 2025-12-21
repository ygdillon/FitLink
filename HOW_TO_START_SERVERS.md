# How to Start Frontend and Backend Servers

## 🚀 Quick Start

### Start Backend Server
```bash
cd backend
npm run dev
```

### Start Frontend Server (in a new terminal)
```bash
cd frontend
npm run dev
```

## 📋 Detailed Instructions

### Step 1: Start Backend Server

1. **Open Terminal**
2. **Navigate to backend folder:**
   ```bash
   cd "/Users/yanisdillon/Documents/Yanis Dillon/Blockchain/personalTrainer App/backend"
   ```
3. **Start the server:**
   ```bash
   npm run dev
   ```
4. **You should see:**
   ```
   Server running on port 5001
   Connected to PostgreSQL database
   ```
5. **Keep this terminal open** - the server needs to keep running

### Step 2: Start Frontend Server (New Terminal Window)

1. **Open a NEW Terminal window/tab** (keep backend running)
2. **Navigate to frontend folder:**
   ```bash
   cd "/Users/yanisdillon/Documents/Yanis Dillon/Blockchain/personalTrainer App/frontend"
   ```
3. **Start the frontend:**
   ```bash
   npm run dev
   ```
4. **You should see:**
   ```
   VITE v5.x.x  ready in xxx ms
   ➜  Local:   http://localhost:3001/
   ```
5. **The app will automatically open** in your browser, or go to: http://localhost:3001

## 🖥️ Using Two Terminal Windows

You need **TWO terminal windows** running simultaneously:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
# Keep this running!
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
# Keep this running!
```

## 🔧 Alternative: Using Root Package.json Scripts

If you're in the root folder, you can also use:

```bash
# From root directory
npm run dev:backend    # Starts backend
npm run dev:frontend   # Starts frontend (in new terminal)
```

## ✅ Verify Everything is Running

1. **Backend:** Should show "Server running on port 5001"
2. **Frontend:** Should show "Local: http://localhost:3001"
3. **Browser:** Open http://localhost:3001 and you should see the login page

## 🛑 How to Stop Servers

- Press `Ctrl+C` in each terminal window
- Or close the terminal windows

## 🐛 Troubleshooting

### Port Already in Use
If you see "Port 5001 (or 3001) is already in use":
- Another instance might be running
- Find and kill the process:
  ```bash
  # For port 5001 (backend)
  lsof -ti:5001 | xargs kill -9
  
  # For port 3001 (frontend)
  lsof -ti:3001 | xargs kill -9
  ```

### "Command not found: npm"
- Make sure Node.js is installed
- Check: `node --version` and `npm --version`

### Dependencies Not Installed
If you see module errors:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## 📝 Quick Reference

| Server | Port | Command | Location |
|--------|------|---------|----------|
| Backend | 5001 | `npm run dev` | `backend/` folder |
| Frontend | 3001 | `npm run dev` | `frontend/` folder |

## 🎯 After Starting

1. Both servers should be running
2. Open browser to: http://localhost:3001
3. Log in as trainer or client
4. Test the AI workout generator!

