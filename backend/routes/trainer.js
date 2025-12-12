import express from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { pool } from '../config/database.js'

const router = express.Router()

// All routes require authentication and trainer role
router.use(authenticate)
router.use(requireRole(['trainer']))

// Get trainer's clients
router.get('/clients', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, u.name, u.email, c.start_date, c.status
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

