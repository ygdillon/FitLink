# AI Workout Generator Setup

## Overview
The AI Workout Generator uses OpenAI's GPT-4 to create personalized workouts based on client profiles, goals, and preferences.

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install openai
```

### 2. Configure OpenAI API Key
Add your OpenAI API key to the backend `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

**How to get an OpenAI API key:**
1. Go to https://platform.openai.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new secret key
5. Copy the key and add it to your `.env` file

### 3. Usage

#### For Trainers:
1. Navigate to **Workouts** → **Create Workout** tab
2. Click on the **AI Generator** sub-tab
3. Select a client from the dropdown
4. Configure workout preferences:
   - Duration (15-120 minutes)
   - Intensity (Low, Moderate, High, Very High)
   - Focus Area (Full Body, Upper Body, Lower Body, Core, Cardio, Strength, Flexibility)
   - Available Equipment (Full Gym, Home, Bodyweight, Dumbbells, Resistance Bands)
   - Additional notes (optional)
5. Click **Generate Workout**
6. Review the AI-generated workout
7. Click **Save Workout** to add it to your library

## Features

### Current Implementation
- ✅ Client profile analysis (goals, experience, injuries)
- ✅ Personalized workout generation
- ✅ Equipment-aware exercise selection
- ✅ Injury considerations
- ✅ Workout customization options
- ✅ Save to workout library

### Future Enhancements
- Workout customization with AI
- Exercise alternatives based on equipment
- Progress-based recommendations
- Weekly program generation
- Progressive overload suggestions

## API Endpoints

### Generate Workout
```
POST /api/trainer/workouts/ai/generate
Body: {
  clientId: number,
  workoutPreferences: {
    duration: number,
    intensity: string,
    focus: string,
    equipment: string,
    notes: string
  }
}
```

### Customize Workout
```
POST /api/trainer/workouts/ai/customize
Body: {
  workoutId: number,
  clientId: number,
  modifications: string
}
```

## Cost Considerations

- **Model Used:** GPT-4
- **Estimated Cost:** ~$0.03-0.10 per workout generation
- **Recommendations:**
  - Monitor API usage in OpenAI dashboard
  - Consider rate limiting for production
  - Cache common workout templates
  - Use GPT-3.5-turbo for lower costs (less accurate)

## Error Handling

The system handles:
- Missing API key (shows configuration error)
- API authentication failures
- Invalid client data
- Network errors
- Malformed AI responses

## Security

- API key stored in environment variables (never in code)
- Trainer authentication required
- Client data validation
- Rate limiting recommended for production




