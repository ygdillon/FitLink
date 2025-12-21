import express from 'express'
import { pool } from '../config/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import OpenAI from 'openai'

const router = express.Router()

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Generate workout using AI based on client profile
router.post('/generate', authenticate, requireRole(['trainer']), async (req, res) => {
  try {
    const { clientId, workoutPreferences } = req.body

    if (!clientId) {
      return res.status(400).json({ message: 'Client ID is required' })
    }

    // Fetch client profile data
    const clientResult = await pool.query(
      `SELECT 
        c.*, 
        u.name as client_name,
        u.email as client_email
       FROM clients c
       JOIN users u ON c.user_id = u.id
       WHERE c.user_id = $1 AND c.trainer_id = $2`,
      [clientId, req.user.id]
    )

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found or not assigned to you' })
    }

    const client = clientResult.rows[0]

    // Parse JSONB fields
    let secondaryGoals = client.secondary_goals
    if (secondaryGoals && typeof secondaryGoals === 'string') {
      secondaryGoals = JSON.parse(secondaryGoals)
    }

    let availableDates = client.available_dates
    if (availableDates && typeof availableDates === 'string') {
      availableDates = JSON.parse(availableDates)
    }

    // Get recent workout performance
    const workoutHistory = await pool.query(
      `SELECT 
        w.name,
        wa.status,
        wa.completed_date,
        wl.duration
       FROM workout_assignments wa
       JOIN workouts w ON wa.workout_id = w.id
       LEFT JOIN workout_logs wl ON wl.workout_id = w.id AND wl.client_id = $1
       WHERE wa.client_id = $1
       ORDER BY wa.assigned_date DESC
       LIMIT 5`,
      [clientId]
    )

    // Build AI prompt
    const prompt = buildWorkoutPrompt(client, workoutHistory.rows, workoutPreferences)

    // Call OpenAI API - Use gpt-3.5-turbo for wider access, or gpt-4 if available
    const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
    
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert personal trainer with deep knowledge of exercise science, injury prevention, and program design. Generate workout plans in valid JSON format only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const aiResponse = JSON.parse(completion.choices[0].message.content)

    // Validate and structure the response
    const workout = {
      name: aiResponse.name || 'AI Generated Workout',
      description: aiResponse.description || '',
      category: aiResponse.category || 'General',
      exercises: aiResponse.exercises || [],
      ai_generated: true,
      ai_metadata: {
        client_id: clientId,
        generated_at: new Date().toISOString(),
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        preferences: workoutPreferences
      }
    }

    res.json(workout)
  } catch (error) {
    console.error('Error generating AI workout:', error)
    
    // Handle specific OpenAI API errors
    if (error.status === 401 || error.code === 'invalid_api_key') {
      return res.status(500).json({ 
        message: 'AI service authentication failed. Please check your API key configuration.',
        error: 'OPENAI_AUTH_ERROR',
        details: 'Your OpenAI API key is invalid or missing.'
      })
    }

    if (error.status === 429 || error.code === 'insufficient_quota' || error.type === 'insufficient_quota') {
      return res.status(429).json({ 
        message: 'OpenAI API quota exceeded. Please add credits to your account.',
        error: 'INSUFFICIENT_QUOTA',
        details: 'Your OpenAI account has run out of credits. Visit https://platform.openai.com/account/billing to add credits.',
        helpUrl: 'https://platform.openai.com/account/billing'
      })
    }

    if (error.status === 404 || error.code === 'model_not_found') {
      return res.status(500).json({ 
        message: 'AI model not available. Please check your OpenAI account access.',
        error: 'MODEL_NOT_FOUND',
        details: 'The requested AI model is not available with your current API key.'
      })
    }

    res.status(500).json({ 
      message: 'Failed to generate workout',
      error: error.message || 'UNKNOWN_ERROR',
      details: 'An unexpected error occurred while generating the workout.'
    })
  }
})

// Customize existing workout with AI
router.post('/customize', authenticate, requireRole(['trainer']), async (req, res) => {
  try {
    const { workoutId, clientId, modifications } = req.body

    if (!workoutId || !clientId) {
      return res.status(400).json({ message: 'Workout ID and Client ID are required' })
    }

    // Fetch workout
    const workoutResult = await pool.query(
      `SELECT w.*, 
        json_agg(
          json_build_object(
            'id', we.id,
            'name', we.exercise_name,
            'sets', we.sets,
            'reps', we.reps,
            'weight', we.weight,
            'rest', we.rest,
            'notes', we.notes,
            'order', we.order_index
          ) ORDER BY we.order_index
        ) as exercises
       FROM workouts w
       LEFT JOIN workout_exercises we ON w.id = we.workout_id
       WHERE w.id = $1 AND w.trainer_id = $2
       GROUP BY w.id`,
      [workoutId, req.user.id]
    )

    if (workoutResult.rows.length === 0) {
      return res.status(404).json({ message: 'Workout not found' })
    }

    const workout = workoutResult.rows[0]

    // Fetch client profile
    const clientResult = await pool.query(
      `SELECT c.*, u.name as client_name
       FROM clients c
       JOIN users u ON c.user_id = u.id
       WHERE c.user_id = $1 AND c.trainer_id = $2`,
      [clientId, req.user.id]
    )

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    const client = clientResult.rows[0]

    // Build customization prompt
    const prompt = buildCustomizationPrompt(workout, client, modifications)

    // Call OpenAI API - Use gpt-3.5-turbo for wider access, or gpt-4 if available
    const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
    
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert personal trainer. Modify workouts based on client needs, injuries, and preferences. Return valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const aiResponse = JSON.parse(completion.choices[0].message.content)

    res.json({
      ...workout,
      exercises: aiResponse.exercises || workout.exercises,
      modifications: aiResponse.modifications || modifications
    })
  } catch (error) {
    console.error('Error customizing workout:', error)
    res.status(500).json({ message: 'Failed to customize workout', error: error.message })
  }
})

// Helper function to build workout generation prompt
function buildWorkoutPrompt(client, workoutHistory, preferences = {}) {
  const {
    duration = 60,
    intensity = 'moderate',
    focus = 'full body',
    equipment = 'gym',
    notes = ''
  } = preferences

  let prompt = `Generate a personalized workout plan for the following client:

CLIENT PROFILE:
- Name: ${client.client_name}
- Age: ${client.age || 'Not specified'}
- Gender: ${client.gender || 'Not specified'}
- Height: ${client.height || 'Not specified'}
- Weight: ${client.weight || 'Not specified'}
- Experience Level: ${client.previous_experience || 'Not specified'}
- Activity Level: ${client.activity_level || 'Not specified'}

GOALS:
- Primary Goal: ${client.primary_goal || 'Not specified'}
- Goal Target: ${client.goal_target || 'Not specified'}
- Goal Timeframe: ${client.goal_timeframe || 'Not specified'}
- Secondary Goals: ${client.secondary_goals ? JSON.stringify(client.secondary_goals) : 'None'}

HEALTH & LIMITATIONS:
- Injuries: ${client.injuries || 'None reported'}
- Sleep: ${client.sleep_hours || 'Not specified'} hours per night
- Stress Level: ${client.stress_level || 'Not specified'}

PREFERENCES:
- Training Preference: ${client.training_preference || 'Not specified'}
- Available Equipment: ${equipment}
- Workout Duration: ${duration} minutes
- Intensity: ${intensity}
- Focus Area: ${focus}
${notes ? `- Additional Notes: ${notes}` : ''}

RECENT WORKOUT HISTORY:
${workoutHistory.length > 0 
  ? workoutHistory.map(w => `- ${w.name}: ${w.status} (${w.completed_date ? 'Completed' : 'Not completed'})`).join('\n')
  : 'No previous workouts'
}

Generate a workout plan that:
1. Aligns with the client's goals and experience level
2. Respects any injuries or limitations
3. Uses appropriate equipment (${equipment})
4. Fits within ${duration} minutes
5. Matches ${intensity} intensity level
6. Focuses on ${focus}
7. Includes proper warm-up and cool-down
8. Provides clear exercise instructions and form cues

Return the response in this exact JSON format:
{
  "name": "Workout Name",
  "description": "Brief description of the workout and its benefits",
  "category": "Strength/Cardio/HIIT/Flexibility/Full Body/Upper Body/Lower Body/Core",
  "exercises": [
    {
      "name": "Exercise Name",
      "sets": 3,
      "reps": "10-12",
      "weight": "bodyweight or suggested weight",
      "rest": "60 seconds",
      "notes": "Form cues, modifications, and tips"
    }
  ]
}`

  return prompt
}

// Helper function to build customization prompt
function buildCustomizationPrompt(workout, client, modifications) {
  return `Modify the following workout for a client with these characteristics:

CURRENT WORKOUT:
${workout.name}
${workout.description || ''}
Exercises:
${JSON.stringify(workout.exercises, null, 2)}

CLIENT PROFILE:
- Experience: ${client.previous_experience || 'Not specified'}
- Injuries: ${client.injuries || 'None'}
- Goals: ${client.primary_goal || 'Not specified'}

MODIFICATIONS REQUESTED:
${modifications || 'General customization based on client profile'}

Please modify the workout to:
1. Accommodate any injuries or limitations
2. Match the client's experience level
3. Align with their goals
4. Apply the requested modifications

Return the modified workout in the same JSON format as the original.`
}

export default router

