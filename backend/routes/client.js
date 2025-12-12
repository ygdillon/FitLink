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

