import express from 'express'
import { authenticate } from '../middleware/auth.js'
import { pool } from '../config/database.js'

const router = express.Router()

// Get workout by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params

    // Get workout
    const workoutResult = await pool.query(
      'SELECT id, trainer_id, name, description, created_at FROM workouts WHERE id = $1',
      [id]
    )

    if (workoutResult.rows.length === 0) {
      return res.status(404).json({ message: 'Workout not found' })
    }

    const workout = workoutResult.rows[0]

    // Get exercises
    const exercisesResult = await pool.query(
      `SELECT exercise_name as name, sets, reps, weight, rest, notes
       FROM workout_exercises
       WHERE workout_id = $1
       ORDER BY id`,
      [id]
    )

    workout.exercises = exercisesResult.rows

    res.json(workout)
  } catch (error) {
    console.error('Error fetching workout:', error)
    res.status(500).json({ message: 'Failed to fetch workout' })
  }
})

// Complete workout (client only)
router.post('/:id/complete', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Check if user is a client
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Only clients can complete workouts' })
    }

    // Check if workout is assigned to this client
    const assignmentResult = await pool.query(
      'SELECT id FROM workout_assignments WHERE workout_id = $1 AND client_id = $2',
      [id, userId]
    )

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Workout not assigned to you' })
    }

    // Update assignment status
    await pool.query(
      `UPDATE workout_assignments 
       SET status = 'completed', completed_date = NOW()
       WHERE workout_id = $1 AND client_id = $2`,
      [id, userId]
    )

    // Create workout log
    await pool.query(
      `INSERT INTO workout_logs (client_id, workout_id, completed_date)
       VALUES ($1, $2, NOW())`,
      [userId, id]
    )

    res.json({ message: 'Workout marked as complete' })
  } catch (error) {
    console.error('Error completing workout:', error)
    res.status(500).json({ message: 'Failed to complete workout' })
  }
})

export default router

