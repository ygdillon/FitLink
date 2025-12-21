# Quick Guide: Adding OpenAI API Key

## 🚀 Quick Steps

### Step 1: Get Your API Key (5 minutes)

1. **Go to OpenAI Platform:**
   - Visit: https://platform.openai.com/
   - Sign up or log in

2. **Add Payment Method:**
   - Click your profile icon (top right) → **"Billing"**
   - Add a credit card (required, but you get $5 free credits)

3. **Create API Key:**
   - Go to: https://platform.openai.com/api-keys
   - Click **"+ Create new secret key"**
   - Name it: "Trainr"
   - **Copy the key immediately!** (It looks like: `sk-proj-abc123...`)

### Step 2: Add to Your Project (2 minutes)

1. **Open your `.env` file:**
   - Location: `backend/.env`
   - Open it in any text editor (VS Code, TextEdit, etc.)

2. **Add this line at the end:**
   ```env
   OPENAI_API_KEY=sk-proj-paste-your-key-here
   ```
   
   **Important:** 
   - Replace `sk-proj-paste-your-key-here` with your actual key
   - No quotes, no spaces
   - Just paste the key directly

3. **Save the file**

4. **Restart your backend server:**
   ```bash
   # Stop the server (Ctrl+C if running)
   # Then restart:
   cd backend
   npm run dev
   ```

### Step 3: Test It!

1. Go to your app: http://localhost:3001
2. Log in as a trainer
3. Navigate to: **Workouts** → **Create Workout** → **AI Generator** tab
4. Select a client and click **"Generate Workout"**
5. If it works, you'll see a personalized workout! 🎉

## 📝 Example .env File

Your `backend/.env` file should look something like this:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=personal_trainer_app
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret

# Server
PORT=5001

# Stripe (if you have it)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
FRONTEND_URL=http://localhost:3001

# OpenAI API Key (ADD THIS LINE)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## ⚠️ Common Mistakes

❌ **Don't do this:**
```env
OPENAI_API_KEY="sk-proj-..."  # No quotes!
OPENAI_API_KEY = sk-proj-...  # No spaces around =
```

✅ **Do this:**
```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 🔒 Security Reminder

- ✅ Your `.env` file is already in `.gitignore` (safe from git)
- ✅ Never share your API key publicly
- ✅ Set usage limits in OpenAI dashboard to prevent unexpected charges

## 💰 Cost Info

- **Free credits:** $5 when you sign up
- **Per workout:** ~$0.03-0.10
- **Set limits:** Go to OpenAI dashboard → Settings → Limits

## 🆘 Need Help?

If you see errors:
1. **"AI service authentication failed"** → Check your API key is correct
2. **"Insufficient quota"** → Add credits to your OpenAI account
3. **"Rate limit exceeded"** → Wait a few seconds and try again

For more details, see: `OPENAI_API_KEY_SETUP.md`

