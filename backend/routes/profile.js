import express from 'express'
import { authenticate } from '../middleware/auth.js'
import { pool } from '../config/database.js'

const router = express.Router()

router.use(authenticate)

// Get profile
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role,
              t.bio, t.certifications, t.specialties
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

    res.json(user)
  } catch (error) {
    console.error('Error fetching profile:', error)
    res.status(500).json({ message: 'Failed to fetch profile' })
  }
})

// Update profile
router.put('/', async (req, res) => {
  try {
    const { name, email, bio, certifications, specialties } = req.body

    // Update user
    await pool.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3',
      [name, email, req.user.id]
    )

    // Update trainer profile if user is a trainer
    if (req.user.role === 'trainer') {
      await pool.query(
        `UPDATE trainers 
         SET bio = $1, certifications = $2, specialties = $3
         WHERE user_id = $4`,
        [
          bio || null,
          certifications ? JSON.stringify(certifications) : null,
          specialties ? JSON.stringify(specialties) : null,
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

