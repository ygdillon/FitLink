import express from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { pool } from '../config/database.js'

const router = express.Router()

// All routes require authentication and trainer role
router.use(authenticate)
router.use(requireRole(['trainer']))

// Get trainer's clients with full details
router.get('/clients', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, u.name, u.email, c.start_date, c.status, c.onboarding_completed,
              c.primary_goal, c.goal_target, c.training_preference,
              (SELECT COUNT(*) FROM daily_check_ins dci 
               WHERE dci.client_id = c.user_id 
               AND dci.check_in_date = CURRENT_DATE 
               AND dci.status = 'completed') as checked_in_today
       FROM clients c
       JOIN users u ON c.user_id = u.id
       WHERE c.trainer_id = $1
       ORDER BY c.start_date DESC`,
      [req.user.id]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching clients:', error)
    res.status(500).json({ message: 'Failed to fetch clients' })
  }
})

// Get single client with full profile
router.get('/clients/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params

    // Get client basic info
    const clientResult = await pool.query(
      `SELECT c.*, u.name, u.email, u.created_at as account_created
       FROM clients c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1 AND c.trainer_id = $2`,
      [clientId, req.user.id]
    )

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    const client = clientResult.rows[0]

    // Get custom metrics
    const metricsResult = await pool.query(
      'SELECT * FROM custom_metrics WHERE client_id = $1 ORDER BY created_at DESC',
      [client.user_id]
    )

    // Get recent progress entries
    const progressResult = await pool.query(
      `SELECT * FROM progress_entries 
       WHERE client_id = $1 
       ORDER BY date DESC 
       LIMIT 10`,
      [client.user_id]
    )

    // Get recent check-ins
    const checkInsResult = await pool.query(
      `SELECT * FROM daily_check_ins 
       WHERE client_id = $1 
       ORDER BY check_in_date DESC 
       LIMIT 30`,
      [client.user_id]
    )

    // Get workout assignments
    const workoutsResult = await pool.query(
      `SELECT wa.*, w.name as workout_name, w.description
       FROM workout_assignments wa
       JOIN workouts w ON wa.workout_id = w.id
       WHERE wa.client_id = $1
       ORDER BY wa.assigned_date DESC`,
      [client.user_id]
    )

    res.json({
      ...client,
      custom_metrics: metricsResult.rows,
      recent_progress: progressResult.rows,
      check_ins: checkInsResult.rows,
      workouts: workoutsResult.rows
    })
  } catch (error) {
    console.error('Error fetching client profile:', error)
    res.status(500).json({ message: 'Failed to fetch client profile' })
  }
})

// Add new client (trainer invites client)
router.post('/clients', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      height,
      weight,
      gender,
      age,
      previous_experience,
      average_daily_eating,
      primary_goal,
      goal_target,
      goal_timeframe,
      secondary_goals,
      barriers,
      training_preference,
      communication_preference,
      onboarding_data
    } = req.body

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' })
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      )

      let userId
      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id
        // Update existing user's role if needed
        await client.query(
          'UPDATE users SET role = $1 WHERE id = $2',
          ['client', userId]
        )
      } else {
        // Create new user (with temporary password if not provided)
        const tempPassword = password || Math.random().toString(36).slice(-8)
        const bcrypt = (await import('bcryptjs')).default
        const hashedPassword = await bcrypt.hash(tempPassword, 10)

        const userResult = await client.query(
          'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
          [name, email, hashedPassword, 'client']
        )
        userId = userResult.rows[0].id
      }

      // Create or update client profile
      const clientCheck = await client.query(
        'SELECT id FROM clients WHERE user_id = $1',
        [userId]
      )

      if (clientCheck.rows.length > 0) {
        // Update existing client
        await client.query(
          `UPDATE clients 
           SET trainer_id = $1, height = $2, weight = $3, gender = $4, age = $5,
               previous_experience = $6, average_daily_eating = $7, primary_goal = $8,
               goal_target = $9, goal_timeframe = $10, secondary_goals = $11,
               barriers = $12, training_preference = $13, communication_preference = $14,
               onboarding_data = $15, onboarding_completed = $16, start_date = COALESCE(start_date, CURRENT_DATE)
           WHERE user_id = $17`,
          [
            req.user.id, height, weight, gender, age,
            previous_experience, average_daily_eating, primary_goal,
            goal_target, goal_timeframe, secondary_goals ? JSON.stringify(secondary_goals) : null,
            barriers, training_preference, communication_preference,
            onboarding_data ? JSON.stringify(onboarding_data) : null, true, userId
          ]
        )
      } else {
        // Create new client
        await client.query(
          `INSERT INTO clients (
            user_id, trainer_id, height, weight, gender, age,
            previous_experience, average_daily_eating, primary_goal,
            goal_target, goal_timeframe, secondary_goals, barriers,
            training_preference, communication_preference, onboarding_data,
            onboarding_completed, start_date, goals
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_DATE, $18)`,
          [
            userId, req.user.id, height, weight, gender, age,
            previous_experience, average_daily_eating, primary_goal,
            goal_target, goal_timeframe, secondary_goals ? JSON.stringify(secondary_goals) : null,
            barriers, training_preference, communication_preference,
            onboarding_data ? JSON.stringify(onboarding_data) : null, true,
            primary_goal ? JSON.stringify([primary_goal]) : null
          ]
        )
      }

      await client.query('COMMIT')

      res.status(201).json({
        message: 'Client added successfully',
        clientId: userId
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error adding client:', error)
    res.status(500).json({ message: 'Failed to add client', error: error.message })
  }
})

// Update client onboarding data
router.put('/clients/:clientId/onboarding', async (req, res) => {
  try {
    const { clientId } = req.params
    const onboardingData = req.body

    await pool.query(
      `UPDATE clients 
       SET height = $1, weight = $2, gender = $3, age = $4,
           previous_experience = $5, average_daily_eating = $6, primary_goal = $7,
           goal_target = $8, goal_timeframe = $9, secondary_goals = $10,
           barriers = $11, training_preference = $12, communication_preference = $13,
           onboarding_data = $14, onboarding_completed = true
       WHERE id = $15 AND trainer_id = $16`,
      [
        onboardingData.height,
        onboardingData.weight,
        onboardingData.gender,
        onboardingData.age,
        onboardingData.previous_experience,
        onboardingData.average_daily_eating,
        onboardingData.primary_goal,
        onboardingData.goal_target,
        onboardingData.goal_timeframe,
        onboardingData.secondary_goals ? JSON.stringify(onboardingData.secondary_goals) : null,
        onboardingData.barriers,
        onboardingData.training_preference,
        onboardingData.communication_preference,
        JSON.stringify(onboardingData),
        clientId,
        req.user.id
      ]
    )

    res.json({ message: 'Client onboarding updated successfully' })
  } catch (error) {
    console.error('Error updating client onboarding:', error)
    res.status(500).json({ message: 'Failed to update client onboarding' })
  }
})

// Add custom metric for client
router.post('/clients/:clientId/metrics', async (req, res) => {
  try {
    const { clientId } = req.params
    const { metric_name, metric_type, unit, target_value, current_value } = req.body

    // Verify client belongs to trainer
    const clientCheck = await pool.query(
      'SELECT user_id FROM clients WHERE id = $1 AND trainer_id = $2',
      [clientId, req.user.id]
    )

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    const result = await pool.query(
      `INSERT INTO custom_metrics (client_id, metric_name, metric_type, unit, target_value, current_value)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [clientCheck.rows[0].user_id, metric_name, metric_type, unit, target_value, current_value]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error adding custom metric:', error)
    res.status(500).json({ message: 'Failed to add custom metric' })
  }
})

// Get client's daily check-ins
router.get('/clients/:clientId/check-ins', async (req, res) => {
  try {
    const { clientId } = req.params
    const { startDate, endDate } = req.query

    // Verify client belongs to trainer
    const clientCheck = await pool.query(
      'SELECT user_id FROM clients WHERE id = $1 AND trainer_id = $2',
      [clientId, req.user.id]
    )

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    let query = 'SELECT * FROM daily_check_ins WHERE client_id = $1'
    const params = [clientCheck.rows[0].user_id]

    if (startDate && endDate) {
      query += ' AND check_in_date BETWEEN $2 AND $3'
      params.push(startDate, endDate)
    }

    query += ' ORDER BY check_in_date DESC LIMIT 90'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching check-ins:', error)
    res.status(500).json({ message: 'Failed to fetch check-ins' })
  }
})

// Respond to client check-in
router.post('/clients/:clientId/check-ins/:checkInId/respond', async (req, res) => {
  try {
    const { clientId, checkInId } = req.params
    const { trainer_response } = req.body

    // Verify client belongs to trainer
    const clientCheck = await pool.query(
      'SELECT user_id FROM clients WHERE id = $1 AND trainer_id = $2',
      [clientId, req.user.id]
    )

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    await pool.query(
      'UPDATE daily_check_ins SET trainer_response = $1 WHERE id = $2 AND client_id = $3',
      [trainer_response, checkInId, clientCheck.rows[0].user_id]
    )

    res.json({ message: 'Response added successfully' })
  } catch (error) {
    console.error('Error responding to check-in:', error)
    res.status(500).json({ message: 'Failed to respond to check-in' })
  }
})

// Get trainer's workouts
router.get('/workouts', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, created_at
       FROM workouts
       WHERE trainer_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching workouts:', error)
    res.status(500).json({ message: 'Failed to fetch workouts' })
  }
})

// Create workout
router.post('/workouts', async (req, res) => {
  try {
    const { name, description, exercises } = req.body

    if (!name || !exercises || exercises.length === 0) {
      return res.status(400).json({ message: 'Name and exercises are required' })
    }

    // Start transaction
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Insert workout
      const workoutResult = await client.query(
        'INSERT INTO workouts (trainer_id, name, description) VALUES ($1, $2, $3) RETURNING id',
        [req.user.id, name, description]
      )

      const workoutId = workoutResult.rows[0].id

      // Insert exercises
      for (const exercise of exercises) {
        await client.query(
          `INSERT INTO workout_exercises (workout_id, exercise_name, sets, reps, weight, rest, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            workoutId,
            exercise.name,
            exercise.sets || null,
            exercise.reps || null,
            exercise.weight || null,
            exercise.rest || null,
            exercise.notes || null
          ]
        )
      }

      await client.query('COMMIT')

      res.status(201).json({
        message: 'Workout created successfully',
        workoutId
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error creating workout:', error)
    res.status(500).json({ message: 'Failed to create workout' })
  }
})

export default router
