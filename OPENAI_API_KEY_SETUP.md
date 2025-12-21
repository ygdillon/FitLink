# How to Get and Configure OpenAI API Key

## Step 1: Get Your OpenAI API Key

### 1.1 Create an OpenAI Account
1. Go to **https://platform.openai.com/**
2. Click **"Sign up"** (or **"Log in"** if you already have an account)
3. Complete the registration process
   - You can sign up with:
     - Email and password
     - Google account
     - Microsoft account

### 1.2 Add Payment Method (Required)
1. Once logged in, click on your **profile icon** (top right)
2. Select **"Billing"** or **"Settings" → "Billing"**
3. Click **"Add payment method"**
4. Enter your credit card information
   - **Note:** OpenAI requires a payment method to use the API, even for free tier
   - You'll get $5 in free credits to start
   - GPT-4 costs approximately $0.03-0.10 per workout generation

### 1.3 Create an API Key
1. Navigate to **"API Keys"** section:
   - Click your **profile icon** → **"API Keys"**
   - Or go directly to: **https://platform.openai.com/api-keys**
2. Click **"+ Create new secret key"** button
3. Give it a name (e.g., "FitLink Workout Generator")
4. Click **"Create secret key"**
5. **IMPORTANT:** Copy the key immediately - you won't be able to see it again!
   - It will look like: `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - If you lose it, you'll need to create a new one

### 1.4 Set Usage Limits (Optional but Recommended)
1. Go to **"Settings" → "Limits"** or **"Usage Limits"**
2. Set a **monthly spending limit** (e.g., $50/month)
3. This prevents unexpected charges

## Step 2: Add API Key to Your Project

### 2.1 Locate Your .env File
Your `.env` file should be in the `backend` folder:
```
/Users/yanisdillon/Documents/Yanis Dillon/Blockchain/personalTrainer App/backend/.env
```

### 2.2 Create or Edit .env File

**Option A: If .env file doesn't exist:**
1. Navigate to the `backend` folder in your project
2. Create a new file named `.env` (with the dot at the beginning)
3. Copy the contents from `.env.example` if it exists
4. Add your API key

**Option B: If .env file already exists:**
1. Open the `.env` file in a text editor
2. Add or update the `OPENAI_API_KEY` line

### 2.3 Add the API Key
Add this line to your `.env` file:
```env
OPENAI_API_KEY=sk-proj-your-actual-api-key-here
```

**Important Notes:**
- Replace `sk-proj-your-actual-api-key-here` with your actual API key
- **Never** include quotes around the key
- **Never** commit the `.env` file to git (it should be in `.gitignore`)
- The `.env` file should look something like this:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=personal_trainer_app
DB_USER=postgres
DB_PASSWORD=your_db_password

# JWT Secret
JWT_SECRET=your_jwt_secret

# Server Port
PORT=5001

# Stripe (if configured)
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
FRONTEND_URL=http://localhost:3001

# OpenAI API Key
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 3: Verify the Setup

### 3.1 Restart Your Backend Server
After adding the API key, restart your backend server:
```bash
# Stop the current server (Ctrl+C)
# Then restart it
cd backend
npm run dev
```

### 3.2 Test the AI Generator
1. Start your frontend and backend servers
2. Log in as a trainer
3. Navigate to **Workouts** → **Create Workout** → **AI Generator** tab
4. Select a client and try generating a workout
5. If it works, you'll see a generated workout!
6. If you see an error about API key, double-check:
   - The key is correct in `.env`
   - No extra spaces or quotes
   - Server was restarted after adding the key

## Troubleshooting

### Error: "AI service authentication failed"
- **Check:** API key is correct in `.env` file
- **Check:** No quotes around the key
- **Check:** Server was restarted after adding the key
- **Check:** API key hasn't been revoked in OpenAI dashboard

### Error: "Insufficient quota"
- **Check:** You have credits in your OpenAI account
- **Check:** Your payment method is valid
- **Solution:** Add credits or update payment method at https://platform.openai.com/

### Error: "Rate limit exceeded"
- **Solution:** You're making too many requests too quickly
- **Solution:** Wait a few seconds and try again
- **Solution:** Consider implementing rate limiting in production

### Can't find .env file
- **Check:** You're in the `backend` folder
- **Check:** File might be hidden (starts with a dot)
- **Solution:** Create a new `.env` file in the `backend` folder

## Security Best Practices

1. **Never commit .env to git**
   - Check that `.env` is in `.gitignore`
   - Use `.env.example` for documentation (without real keys)

2. **Keep your API key secret**
   - Don't share it publicly
   - Don't include it in screenshots
   - Rotate it if exposed

3. **Set usage limits**
   - Set monthly spending limits in OpenAI dashboard
   - Monitor usage regularly

4. **Use environment variables in production**
   - For production, use secure environment variable management
   - Don't hardcode keys in your code

## Cost Information

- **GPT-4 Pricing:** ~$0.03-0.10 per workout generation
- **Free Credits:** $5 when you first sign up
- **Monitoring:** Check usage at https://platform.openai.com/usage

## Need Help?

- **OpenAI Support:** https://help.openai.com/
- **API Documentation:** https://platform.openai.com/docs
- **Check API Status:** https://status.openai.com/

