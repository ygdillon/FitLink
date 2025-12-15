import express from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { pool } from '../config/database.js'

const router = express.Router()

// All routes require authentication and client role
router.use(authenticate)
router.use(requireRole(['client']))

// Get client's assigned workouts
router.get('/workouts', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT w.id, w.name, w.description, wa.status, wa.assigned_date, wa.due_date
       FROM workout_assignments wa
       JOIN workouts w ON wa.workout_id = w.id
       WHERE wa.client_id = $1
       ORDER BY wa.assigned_date DESC`,
      [req.user.id]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching workouts:', error)
    res.status(500).json({ message: 'Failed to fetch workouts' })
  }
})

// Daily check-in
router.post('/check-in', async (req, res) => {
  try {
    const { workout_completed, diet_stuck_to, notes } = req.body
    const today = new Date().toISOString().split('T')[0]

    // Check if check-in already exists for today
    const existing = await pool.query(
      'SELECT id FROM daily_check_ins WHERE client_id = $1 AND check_in_date = $2',
      [req.user.id, today]
    )

    if (existing.rows.length > 0) {
      // Update existing check-in
      const result = await pool.query(
        `UPDATE daily_check_ins 
         SET workout_completed = $1, diet_stuck_to = $2, notes = $3, status = 'completed', updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [workout_completed, diet_stuck_to, notes, existing.rows[0].id]
      )
      res.json(result.rows[0])
    } else {
      // Create new check-in
      const result = await pool.query(
        `INSERT INTO daily_check_ins (client_id, check_in_date, workout_completed, diet_stuck_to, notes, status)
         VALUES ($1, $2, $3, $4, $5, 'completed')
         RETURNING *`,
        [req.user.id, today, workout_completed, diet_stuck_to, notes]
      )
      res.status(201).json(result.rows[0])
    }
  } catch (error) {
    console.error('Error creating check-in:', error)
    res.status(500).json({ message: 'Failed to create check-in' })
  }
})

// Get today's check-in status
router.get('/check-in/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const result = await pool.query(
      'SELECT * FROM daily_check_ins WHERE client_id = $1 AND check_in_date = $2',
      [req.user.id, today]
    )

    if (result.rows.length > 0) {
      res.json(result.rows[0])
    } else {
      res.json({ checked_in: false })
    }
  } catch (error) {
    console.error('Error fetching today\'s check-in:', error)
    res.status(500).json({ message: 'Failed to fetch check-in' })
  }
})

// Get recent check-ins
router.get('/check-ins', async (req, res) => {
  try {
    const { limit = 30 } = req.query
    const result = await pool.query(
      `SELECT * FROM daily_check_ins 
       WHERE client_id = $1 
       ORDER BY check_in_date DESC 
       LIMIT $2`,
      [req.user.id, limit]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching check-ins:', error)
    res.status(500).json({ message: 'Failed to fetch check-ins' })
  }
})

// Get recent progress entries
router.get('/progress/recent', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, date, weight, body_fat, notes
       FROM progress_entries
       WHERE client_id = $1
       ORDER BY date DESC
       LIMIT 10`,
      [req.user.id]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching progress:', error)
    res.status(500).json({ message: 'Failed to fetch progress' })
  }
})

// Get all progress entries
router.get('/progress', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, date, weight, body_fat, measurements, notes
       FROM progress_entries
       WHERE client_id = $1
       ORDER BY date DESC`,
      [req.user.id]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching progress:', error)
    res.status(500).json({ message: 'Failed to fetch progress' })
  }
})

// Create progress entry
router.post('/progress', async (req, res) => {
  try {
    const { date, weight, bodyFat, measurements, notes } = req.body

    const result = await pool.query(
      `INSERT INTO progress_entries (client_id, date, weight, body_fat, measurements, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        req.user.id,
        date,
        weight || null,
        bodyFat || null,
        measurements ? JSON.stringify(measurements) : null,
        notes || null
      ]
    )

    res.status(201).json({
      message: 'Progress entry created successfully',
      id: result.rows[0].id
    })
  } catch (error) {
    console.error('Error creating progress entry:', error)
    res.status(500).json({ message: 'Failed to create progress entry' })
  }
})

export default router
