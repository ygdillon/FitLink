import express from 'express'
import { authenticate } from '../middleware/auth.js'
import { pool } from '../config/database.js'

const router = express.Router()

router.use(authenticate)

// Get profile
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.profile_image,
              t.bio, t.certifications, t.specialties, t.hourly_rate, t.phone_number,
              t.fitness_goals, t.client_age_ranges, t.location
       FROM users u
       LEFT JOIN trainers t ON u.id = t.user_id
       WHERE u.id = $1`,
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    const user = result.rows[0]
    if (user.certifications) {
      user.certifications = Array.isArray(user.certifications)
        ? user.certifications
        : JSON.parse(user.certifications || '[]')
    }
    if (user.specialties) {
      user.specialties = Array.isArray(user.specialties)
        ? user.specialties
        : JSON.parse(user.specialties || '[]')
    }
    if (user.fitness_goals) {
      user.fitness_goals = Array.isArray(user.fitness_goals)
        ? user.fitness_goals
        : JSON.parse(user.fitness_goals || '[]')
    }
    if (user.client_age_ranges) {
      user.client_age_ranges = Array.isArray(user.client_age_ranges)
        ? user.client_age_ranges
        : JSON.parse(user.client_age_ranges || '[]')
    }

    res.json(user)
  } catch (error) {
    console.error('Error fetching profile:', error)
    res.status(500).json({ message: 'Failed to fetch profile' })
  }
})

// Update profile
router.put('/', async (req, res) => {
  try {
    const { name, email, bio, certifications, specialties, hourly_rate, phone_number, profile_image, fitness_goals, client_age_ranges, location } = req.body

    // Update user
    await pool.query(
      'UPDATE users SET name = $1, email = $2, profile_image = COALESCE($4, profile_image) WHERE id = $3',
      [name, email, req.user.id, profile_image || null]
    )

    // Update trainer profile if user is a trainer
    if (req.user.role === 'trainer') {
      await pool.query(
        `UPDATE trainers 
         SET bio = $1, certifications = $2, specialties = $3, hourly_rate = $4, phone_number = $5,
             fitness_goals = $6, client_age_ranges = $7, location = $8
         WHERE user_id = $9`,
        [
          bio || null,
          certifications ? JSON.stringify(certifications) : null,
          specialties ? JSON.stringify(specialties) : null,
          hourly_rate ? parseFloat(hourly_rate) : null,
          phone_number || null,
          fitness_goals ? JSON.stringify(fitness_goals) : null,
          client_age_ranges ? JSON.stringify(client_age_ranges) : null,
          location || null,
          req.user.id
        ]
      )
    }

    res.json({ message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Error updating profile:', error)
    res.status(500).json({ message: 'Failed to update profile' })
  }
})

export default router

