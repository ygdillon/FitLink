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
    // trainer_id references trainers(user_id), and trainers.user_id = users.id for the trainer
    // So we need to match clients.trainer_id to the trainer's user.id
    const result = await pool.query(
      `SELECT c.id, c.user_id, u.name, u.email, c.start_date, c.status, c.onboarding_completed,
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

    console.log(`[DEBUG] Trainer ${req.user.id} (${req.user.email}) fetching clients, found ${result.rows.length} clients`)
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
    const trainerId = req.user.id

    console.log(`[DEBUG] Fetching client profile: clientId=${clientId}, trainerId=${trainerId}`)

    // Get client basic info
    const clientResult = await pool.query(
      `SELECT c.*, u.name, u.email, u.created_at as account_created
       FROM clients c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1 AND c.trainer_id = $2`,
      [clientId, trainerId]
    )

    console.log(`[DEBUG] Client query result: ${clientResult.rows.length} rows found`)

    if (clientResult.rows.length === 0) {
      // Check if client exists but doesn't belong to this trainer
      const checkClient = await pool.query(
        'SELECT c.id, c.trainer_id FROM clients c WHERE c.id = $1',
        [clientId]
      )
      if (checkClient.rows.length > 0) {
        console.log(`[DEBUG] Client exists but trainer_id=${checkClient.rows[0].trainer_id} doesn't match trainerId=${trainerId}`)
        return res.status(403).json({ message: 'Client not found or access denied' })
      }
      console.log(`[DEBUG] Client with id=${clientId} does not exist`)
      return res.status(404).json({ message: 'Client not found' })
    }

    const client = clientResult.rows[0]

    // Get custom metrics
    const metricsResult = await pool.query(
      'SELECT * FROM custom_metrics WHERE client_id = $1 ORDER BY created_at DESC',
      [client.user_id]
    )

    // Get progress entries
    const progressResult = await pool.query(
      `SELECT 
         id, 
         date, 
         weight, 
         body_fat, 
         measurements, 
         notes,
         photos,
         'progress' as entry_type,
         created_at
       FROM progress_entries 
       WHERE client_id = $1`,
      [client.user_id]
    )

    // Get check-ins
    const checkInsResult = await pool.query(
      `SELECT 
         id,
         check_in_date as date,
         workout_completed,
         diet_stuck_to,
         workout_rating,
         workout_duration,
         sleep_hours,
         sleep_quality,
         energy_level,
         pain_experienced,
         pain_location,
         pain_intensity,
         progress_photo as photos,
         notes,
         trainer_response,
         'checkin' as entry_type,
         created_at
       FROM daily_check_ins 
       WHERE client_id = $1 AND status = 'completed'`,
      [client.user_id]
    )

    // Combine and sort by date (most recent first)
    const combinedProgress = [
      ...progressResult.rows.map(row => ({
        ...row,
        entry_type: 'progress'
      })),
      ...checkInsResult.rows.map(row => ({
        ...row,
        entry_type: 'checkin'
      }))
    ].sort((a, b) => {
      const dateA = new Date(a.date)
      const dateB = new Date(b.date)
      return dateB - dateA // Most recent first
    })

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
      recent_progress: combinedProgress,
      check_ins: checkInsResult.rows, // Keep separate for backward compatibility
      workouts: workoutsResult.rows
    })
  } catch (error) {
    console.error('Error fetching client profile:', error)
    console.error('Error stack:', error.stack)
    // If it's a database error related to the client not existing, return 404
    if (error.code === '23503' || error.message?.includes('does not exist')) {
      return res.status(404).json({ message: 'Client not found' })
    }
    res.status(500).json({ message: 'Failed to fetch client profile', error: error.message })
  }
})

// Get client's assigned workouts
router.get('/clients/:clientId/workouts', async (req, res) => {
  try {
    const { clientId } = req.params

    // Verify client belongs to trainer
    const clientCheck = await pool.query(
      'SELECT user_id FROM clients WHERE id = $1 AND trainer_id = $2',
      [clientId, req.user.id]
    )

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    const clientUserId = clientCheck.rows[0].user_id

    // Get assigned workouts
    const result = await pool.query(
      `SELECT wa.*, w.name as workout_name, w.description, w.category
       FROM workout_assignments wa
       JOIN workouts w ON wa.workout_id = w.id
       WHERE wa.client_id = $1
       ORDER BY wa.assigned_date DESC`,
      [clientUserId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching client workouts:', error)
    res.status(500).json({ message: 'Failed to fetch client workouts' })
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

    // Verify client belongs to trainer
    const clientCheck = await pool.query(
      'SELECT id FROM clients WHERE id = $1 AND trainer_id = $2',
      [clientId, req.user.id]
    )

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    // Build dynamic update query for partial updates
    const updates = []
    const values = []
    let paramCount = 1

    if (onboardingData.height !== undefined) {
      updates.push(`height = $${paramCount++}`)
      values.push(onboardingData.height)
    }
    if (onboardingData.weight !== undefined) {
      updates.push(`weight = $${paramCount++}`)
      values.push(onboardingData.weight)
    }
    if (onboardingData.gender !== undefined) {
      updates.push(`gender = $${paramCount++}`)
      values.push(onboardingData.gender)
    }
    if (onboardingData.age !== undefined) {
      updates.push(`age = $${paramCount++}`)
      values.push(onboardingData.age)
    }
    if (onboardingData.previous_experience !== undefined) {
      updates.push(`previous_experience = $${paramCount++}`)
      values.push(onboardingData.previous_experience)
    }
    if (onboardingData.average_daily_eating !== undefined) {
      updates.push(`average_daily_eating = $${paramCount++}`)
      values.push(onboardingData.average_daily_eating)
    }
    if (onboardingData.primary_goal !== undefined) {
      updates.push(`primary_goal = $${paramCount++}`)
      values.push(onboardingData.primary_goal)
    }
    if (onboardingData.goal_target !== undefined) {
      updates.push(`goal_target = $${paramCount++}`)
      values.push(onboardingData.goal_target)
    }
    if (onboardingData.goal_timeframe !== undefined) {
      updates.push(`goal_timeframe = $${paramCount++}`)
      values.push(onboardingData.goal_timeframe)
    }
    if (onboardingData.secondary_goals !== undefined) {
      updates.push(`secondary_goals = $${paramCount++}`)
      values.push(onboardingData.secondary_goals ? JSON.stringify(onboardingData.secondary_goals) : null)
    }
    if (onboardingData.barriers !== undefined) {
      updates.push(`barriers = $${paramCount++}`)
      values.push(onboardingData.barriers)
    }
    if (onboardingData.training_preference !== undefined) {
      updates.push(`training_preference = $${paramCount++}`)
      values.push(onboardingData.training_preference)
    }
    if (onboardingData.communication_preference !== undefined) {
      updates.push(`communication_preference = $${paramCount++}`)
      values.push(onboardingData.communication_preference)
    }

    // Always update onboarding_data and updated_at
    updates.push(`onboarding_data = $${paramCount++}`)
    values.push(JSON.stringify(onboardingData))
    updates.push(`updated_at = CURRENT_TIMESTAMP`)

    // Add WHERE clause parameters
    values.push(clientId, req.user.id)

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' })
    }

    await pool.query(
      `UPDATE clients 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND trainer_id = $${paramCount + 1}`,
      values
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
      `SELECT w.id, w.name, w.description, w.category, w.is_template, w.created_at,
              (SELECT COUNT(*) FROM workout_exercises we WHERE we.workout_id = w.id) as exercise_count
       FROM workouts w
       WHERE w.trainer_id = $1
       ORDER BY w.created_at DESC`,
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
    const { name, description, category, is_template, exercises } = req.body

    if (!name || !exercises || exercises.length === 0) {
      return res.status(400).json({ message: 'Name and exercises are required' })
    }

    // Start transaction
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Insert workout
      const workoutResult = await client.query(
        'INSERT INTO workouts (trainer_id, name, description, category, is_template) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [req.user.id, name, description, category || null, is_template || false]
      )

      const workoutId = workoutResult.rows[0].id

      // Insert exercises with order
      for (let i = 0; i < exercises.length; i++) {
        const exercise = exercises[i]
        await client.query(
          `INSERT INTO workout_exercises (workout_id, exercise_name, sets, reps, weight, rest, notes, order_index)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            workoutId,
            exercise.name,
            exercise.sets || null,
            exercise.reps || null,
            exercise.weight || null,
            exercise.rest || null,
            exercise.notes || null,
            i
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

// Assign workout to client
router.post('/workouts/:workoutId/assign', async (req, res) => {
  try {
    const { workoutId } = req.params
    const { clientId, assignedDate, dueDate, notes } = req.body

    if (!clientId || !assignedDate) {
      return res.status(400).json({ message: 'Client ID and assigned date are required' })
    }

    // Verify workout belongs to trainer
    const workoutCheck = await pool.query(
      'SELECT id FROM workouts WHERE id = $1 AND trainer_id = $2',
      [workoutId, req.user.id]
    )

    if (workoutCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Workout not found' })
    }

    // Verify client belongs to trainer
    const clientCheck = await pool.query(
      'SELECT user_id FROM clients WHERE user_id = $1 AND trainer_id = $2',
      [clientId, req.user.id]
    )

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found or not assigned to you' })
    }

    // Insert workout assignment
    const result = await pool.query(
      `INSERT INTO workout_assignments (workout_id, client_id, assigned_date, due_date, status)
       VALUES ($1, $2, $3, $4, 'assigned')
       RETURNING *`,
      [workoutId, clientId, assignedDate, dueDate || null]
    )

    res.status(201).json({
      message: 'Workout assigned successfully',
      assignment: result.rows[0]
    })
  } catch (error) {
    console.error('Error assigning workout:', error)
    res.status(500).json({ message: 'Failed to assign workout' })
  }
})

// Get upcoming sessions for trainer
router.get('/sessions/upcoming', async (req, res) => {
  try {
    // Get upcoming workout assignments as sessions
    const result = await pool.query(
      `SELECT wa.id, wa.assigned_date as date, wa.due_date, wa.status,
              w.name as workout_name, w.description,
              u.name as client_name, u.id as client_id
       FROM workout_assignments wa
       JOIN workouts w ON wa.workout_id = w.id
       JOIN users u ON wa.client_id = u.id
       JOIN clients c ON c.user_id = u.id
       WHERE c.trainer_id = $1
         AND wa.assigned_date >= CURRENT_DATE
         AND wa.status IN ('assigned', 'in_progress')
       ORDER BY wa.assigned_date ASC
       LIMIT 10`,
      [req.user.id]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching upcoming sessions:', error)
    res.status(500).json({ message: 'Failed to fetch upcoming sessions' })
  }
})

// ========== NUTRITION ROUTES ==========

// Get nutrition goals for a client
router.get('/clients/:clientId/nutrition/goals', async (req, res) => {
  try {
    const { clientId } = req.params

    // Verify client belongs to trainer
    const clientCheck = await pool.query(
      'SELECT user_id FROM clients WHERE user_id = $1 AND trainer_id = $2',
      [clientId, req.user.id]
    )

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    const result = await pool.query(
      'SELECT * FROM nutrition_goals WHERE client_id = $1',
      [clientId]
    )

    res.json(result.rows[0] || null)
  } catch (error) {
    console.error('Error fetching nutrition goals:', error)
    res.status(500).json({ message: 'Failed to fetch nutrition goals' })
  }
})

// Create or update nutrition goals
router.post('/clients/:clientId/nutrition/goals', async (req, res) => {
  try {
    const { clientId } = req.params
    const { target_calories, target_protein, target_carbs, target_fats, water_intake_goal, notes } = req.body

    // Verify client belongs to trainer
    const clientCheck = await pool.query(
      'SELECT user_id FROM clients WHERE user_id = $1 AND trainer_id = $2',
      [clientId, req.user.id]
    )

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    // Check if goals exist
    const existing = await pool.query(
      'SELECT id FROM nutrition_goals WHERE client_id = $1',
      [clientId]
    )

    if (existing.rows.length > 0) {
      // Update existing
      const result = await pool.query(
        `UPDATE nutrition_goals 
         SET target_calories = $1, target_protein = $2, target_carbs = $3, 
             target_fats = $4, water_intake_goal = $5, notes = $6, updated_at = CURRENT_TIMESTAMP
         WHERE client_id = $7
         RETURNING *`,
        [target_calories, target_protein, target_carbs, target_fats, water_intake_goal, notes, clientId]
      )
      res.json(result.rows[0])
    } else {
      // Create new
      const result = await pool.query(
        `INSERT INTO nutrition_goals 
         (client_id, target_calories, target_protein, target_carbs, target_fats, water_intake_goal, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [clientId, target_calories, target_protein, target_carbs, target_fats, water_intake_goal, notes]
      )
      res.status(201).json(result.rows[0])
    }
  } catch (error) {
    console.error('Error saving nutrition goals:', error)
    res.status(500).json({ message: 'Failed to save nutrition goals' })
  }
})

// Get nutrition plans for a client
router.get('/clients/:clientId/nutrition/plans', async (req, res) => {
  try {
    const { clientId } = req.params

    // Verify client belongs to trainer
    const clientCheck = await pool.query(
      'SELECT user_id FROM clients WHERE user_id = $1 AND trainer_id = $2',
      [clientId, req.user.id]
    )

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    const result = await pool.query(
      'SELECT * FROM nutrition_plans WHERE client_id = $1 ORDER BY created_at DESC',
      [clientId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching nutrition plans:', error)
    res.status(500).json({ message: 'Failed to fetch nutrition plans' })
  }
})

// Create nutrition plan
router.post('/clients/:clientId/nutrition/plans', async (req, res) => {
  try {
    const { clientId } = req.params
    const { plan_name, daily_calories, daily_protein, daily_carbs, daily_fats, start_date, end_date, notes } = req.body

    // Verify client belongs to trainer
    const clientCheck = await pool.query(
      'SELECT user_id FROM clients WHERE user_id = $1 AND trainer_id = $2',
      [clientId, req.user.id]
    )

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    const result = await pool.query(
      `INSERT INTO nutrition_plans 
       (client_id, trainer_id, plan_name, daily_calories, daily_protein, daily_carbs, daily_fats, start_date, end_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [clientId, req.user.id, plan_name, daily_calories, daily_protein, daily_carbs, daily_fats, start_date, end_date || null, notes]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating nutrition plan:', error)
    res.status(500).json({ message: 'Failed to create nutrition plan' })
  }
})

// Get nutrition logs for a client
router.get('/clients/:clientId/nutrition/logs', async (req, res) => {
  try {
    const { clientId } = req.params

    // Verify client belongs to trainer
    const clientCheck = await pool.query(
      'SELECT user_id FROM clients WHERE user_id = $1 AND trainer_id = $2',
      [clientId, req.user.id]
    )

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    const result = await pool.query(
      'SELECT * FROM nutrition_logs WHERE client_id = $1 ORDER BY log_date DESC, created_at DESC',
      [clientId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching nutrition logs:', error)
    res.status(500).json({ message: 'Failed to fetch nutrition logs' })
  }
})

// Create nutrition log entry
router.post('/clients/:clientId/nutrition/logs', async (req, res) => {
  try {
    const { clientId } = req.params
    const { log_date, meal_type, food_name, quantity, unit, calories, protein, carbs, fats, notes } = req.body

    // Verify client belongs to trainer
    const clientCheck = await pool.query(
      'SELECT user_id FROM clients WHERE user_id = $1 AND trainer_id = $2',
      [clientId, req.user.id]
    )

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    const result = await pool.query(
      `INSERT INTO nutrition_logs 
       (client_id, log_date, meal_type, food_name, quantity, unit, calories, protein, carbs, fats, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [clientId, log_date, meal_type, food_name, quantity, unit, calories, protein, carbs, fats, notes]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating nutrition log:', error)
    res.status(500).json({ message: 'Failed to create nutrition log' })
  }
})

// ========== TRAINER REQUEST MANAGEMENT ==========

// Get unread request count
router.get('/requests/unread-count', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM trainer_requests
       WHERE trainer_id = $1 AND status = 'pending' AND (is_read = false OR is_read IS NULL)`,
      [req.user.id]
    )
    
    res.json({ count: parseInt(result.rows[0].count) })
  } catch (error) {
    console.error('Error fetching unread request count:', error)
    res.status(500).json({ message: 'Failed to fetch unread request count' })
  }
})

// Mark requests as read
router.put('/requests/mark-read', async (req, res) => {
  try {
    await pool.query(
      `UPDATE trainer_requests
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE trainer_id = $1 AND status = 'pending' AND (is_read = false OR is_read IS NULL)`,
      [req.user.id]
    )
    
    res.json({ message: 'Requests marked as read' })
  } catch (error) {
    console.error('Error marking requests as read:', error)
    res.status(500).json({ message: 'Failed to mark requests as read' })
  }
})

// Get all pending trainer requests
router.get('/requests', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tr.*, u.name as client_name, u.email as client_email,
              c.height, c.weight, c.gender, c.age, c.location,
              c.previous_experience, c.activity_level, c.available_dates,
              c.primary_goal, c.goal_target, c.goal_timeframe, c.secondary_goals,
              c.nutrition_habits, c.nutrition_experience, c.average_daily_eating,
              c.injuries, c.sleep_hours, c.stress_level, c.lifestyle_activity,
              c.psychological_barriers, c.mindset, c.motivation_why,
              c.training_preference, c.communication_preference, c.barriers,
              c.onboarding_data
       FROM trainer_requests tr
       JOIN users u ON tr.client_id = u.id
       LEFT JOIN clients c ON tr.client_id = c.user_id
       WHERE tr.trainer_id = $1 AND tr.status = 'pending'
       ORDER BY tr.created_at DESC`,
      [req.user.id]
    )

    const requests = result.rows.map(row => {
      // Parse JSONB fields
      let secondaryGoals = row.secondary_goals
      if (secondaryGoals) {
        secondaryGoals = typeof secondaryGoals === 'string' ? JSON.parse(secondaryGoals) : secondaryGoals
      }
      
      let availableDates = row.available_dates
      if (availableDates) {
        availableDates = typeof availableDates === 'string' ? JSON.parse(availableDates) : availableDates
      }
      
      let onboardingData = row.onboarding_data
      if (onboardingData) {
        onboardingData = typeof onboardingData === 'string' ? JSON.parse(onboardingData) : onboardingData
      }

      return {
        id: row.id,
        clientId: row.client_id,
        clientName: row.client_name,
        clientEmail: row.client_email,
        status: row.status,
        message: row.message,
        createdAt: row.created_at,
        // Basic Info
        height: row.height,
        weight: row.weight,
        gender: row.gender,
        age: row.age,
        location: row.location,
        // Workout Experience
        previousExperience: row.previous_experience,
        activityLevel: row.activity_level,
        availableDates: availableDates,
        // Goals
        primaryGoal: row.primary_goal,
        goalTarget: row.goal_target,
        goalTimeframe: row.goal_timeframe,
        secondaryGoals: secondaryGoals,
        // Nutrition
        nutritionHabits: row.nutrition_habits,
        nutritionExperience: row.nutrition_experience,
        averageDailyEating: row.average_daily_eating,
        // Health & Lifestyle
        injuries: row.injuries,
        sleepHours: row.sleep_hours,
        stressLevel: row.stress_level,
        lifestyleActivity: row.lifestyle_activity,
        // Psychological
        psychologicalBarriers: row.psychological_barriers,
        mindset: row.mindset,
        motivationWhy: row.motivation_why,
        // Preferences
        trainingPreference: row.training_preference,
        communicationPreference: row.communication_preference,
        barriers: row.barriers,
        // Full onboarding data
        onboardingData: onboardingData
      }
    })

    res.json(requests)
  } catch (error) {
    console.error('Error fetching trainer requests:', error)
    res.status(500).json({ message: 'Failed to fetch trainer requests' })
  }
})

// Get all requests (pending, approved, rejected)
router.get('/requests/all', async (req, res) => {
  try {
    const { status } = req.query
    let query = `SELECT tr.*, u.name as client_name, u.email as client_email,
                        c.height, c.weight, c.gender, c.age, c.location,
                        c.previous_experience, c.activity_level, c.available_dates,
                        c.primary_goal, c.goal_target, c.goal_timeframe, c.secondary_goals,
                        c.nutrition_habits, c.nutrition_experience, c.average_daily_eating,
                        c.injuries, c.sleep_hours, c.stress_level, c.lifestyle_activity,
                        c.psychological_barriers, c.mindset, c.motivation_why,
                        c.training_preference, c.communication_preference, c.barriers,
                        c.onboarding_data
                 FROM trainer_requests tr
                 JOIN users u ON tr.client_id = u.id
                 LEFT JOIN clients c ON tr.client_id = c.user_id
                 WHERE tr.trainer_id = $1`
    const params = [req.user.id]

    if (status) {
      query += ' AND tr.status = $2'
      params.push(status)
    }

    query += ' ORDER BY tr.created_at DESC'

    const result = await pool.query(query, params)

    const requests = result.rows.map(row => {
      // Parse JSONB fields
      let secondaryGoals = row.secondary_goals
      if (secondaryGoals) {
        secondaryGoals = typeof secondaryGoals === 'string' ? JSON.parse(secondaryGoals) : secondaryGoals
      }
      
      let availableDates = row.available_dates
      if (availableDates) {
        availableDates = typeof availableDates === 'string' ? JSON.parse(availableDates) : availableDates
      }
      
      let onboardingData = row.onboarding_data
      if (onboardingData) {
        onboardingData = typeof onboardingData === 'string' ? JSON.parse(onboardingData) : onboardingData
      }

      return {
        id: row.id,
        clientId: row.client_id,
        clientName: row.client_name,
        clientEmail: row.client_email,
        status: row.status,
        message: row.message,
        trainerResponse: row.trainer_response,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        // Basic Info
        height: row.height,
        weight: row.weight,
        gender: row.gender,
        age: row.age,
        location: row.location,
        // Workout Experience
        previousExperience: row.previous_experience,
        activityLevel: row.activity_level,
        availableDates: availableDates,
        // Goals
        primaryGoal: row.primary_goal,
        goalTarget: row.goal_target,
        goalTimeframe: row.goal_timeframe,
        secondaryGoals: secondaryGoals,
        // Nutrition
        nutritionHabits: row.nutrition_habits,
        nutritionExperience: row.nutrition_experience,
        averageDailyEating: row.average_daily_eating,
        // Health & Lifestyle
        injuries: row.injuries,
        sleepHours: row.sleep_hours,
        stressLevel: row.stress_level,
        lifestyleActivity: row.lifestyle_activity,
        // Psychological
        psychologicalBarriers: row.psychological_barriers,
        mindset: row.mindset,
        motivationWhy: row.motivation_why,
        // Preferences
        trainingPreference: row.training_preference,
        communicationPreference: row.communication_preference,
        barriers: row.barriers,
        // Full onboarding data
        onboardingData: onboardingData
      }
    })

    res.json(requests)
  } catch (error) {
    console.error('Error fetching all trainer requests:', error)
    res.status(500).json({ message: 'Failed to fetch trainer requests' })
  }
})

// Approve a trainer request
router.post('/requests/:requestId/approve', async (req, res) => {
  try {
    const { requestId } = req.params
    const { trainerResponse } = req.body

    // Get the request
    const requestResult = await pool.query(
      'SELECT * FROM trainer_requests WHERE id = $1 AND trainer_id = $2',
      [requestId, req.user.id]
    )

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Request not found' })
    }

    const request = requestResult.rows[0]

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is not pending' })
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Update request status
      await client.query(
        `UPDATE trainer_requests 
         SET status = 'approved', trainer_response = $1, updated_at = NOW()
         WHERE id = $2`,
        [trainerResponse || null, requestId]
      )

      // Check if client already has a trainer
      const existingClient = await client.query(
        'SELECT trainer_id FROM clients WHERE user_id = $1',
        [request.client_id]
      )

      if (existingClient.rows.length > 0 && existingClient.rows[0].trainer_id) {
        // Client already has a trainer, disconnect them first
        const oldTrainerId = existingClient.rows[0].trainer_id
        await client.query(
          'UPDATE clients SET trainer_id = $1 WHERE user_id = $2',
          [req.user.id, request.client_id]
        )

        // Decrease old trainer's active client count
        await client.query(
          `UPDATE trainers 
           SET active_clients = GREATEST(COALESCE(active_clients, 0) - 1, 0)
           WHERE user_id = $1`,
          [oldTrainerId]
        )
      } else {
        // Update or create client record
        if (existingClient.rows.length > 0) {
          await client.query(
            'UPDATE clients SET trainer_id = $1, start_date = COALESCE(start_date, CURRENT_DATE) WHERE user_id = $2',
            [req.user.id, request.client_id]
          )
        } else {
          await client.query(
            'INSERT INTO clients (user_id, trainer_id, start_date) VALUES ($1, $2, CURRENT_DATE)',
            [request.client_id, req.user.id]
          )
        }
      }

      // Update trainer's client count
      await client.query(
        `UPDATE trainers 
         SET total_clients = COALESCE(total_clients, 0) + 1,
             active_clients = COALESCE(active_clients, 0) + 1
         WHERE user_id = $1`,
        [req.user.id]
      )

      await client.query('COMMIT')

      res.json({ 
        message: 'Request approved successfully. Client has been connected.',
        requestId 
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error approving request:', error)
    res.status(500).json({ message: 'Failed to approve request' })
  }
})

// Reject a trainer request
router.post('/requests/:requestId/reject', async (req, res) => {
  try {
    const { requestId } = req.params
    const { trainerResponse } = req.body

    // Get the request
    const requestResult = await pool.query(
      'SELECT * FROM trainer_requests WHERE id = $1 AND trainer_id = $2',
      [requestId, req.user.id]
    )

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Request not found' })
    }

    if (requestResult.rows[0].status !== 'pending') {
      return res.status(400).json({ message: 'Request is not pending' })
    }

    // Update request status
    await pool.query(
      `UPDATE trainer_requests 
       SET status = 'rejected', trainer_response = $1, updated_at = NOW()
       WHERE id = $2`,
      [trainerResponse || null, requestId]
    )

    res.json({ 
      message: 'Request rejected',
      requestId 
    })
  } catch (error) {
    console.error('Error rejecting request:', error)
    res.status(500).json({ message: 'Failed to reject request' })
  }
})

export default router
