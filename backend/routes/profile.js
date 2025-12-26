import express from 'express'
import { authenticate } from '../middleware/auth.js'
import { pool } from '../config/database.js'

const router = express.Router()

router.use(authenticate)

// Get profile
router.get('/', async (req, res) => {
  try {
    // Check if the new columns exist first
    let hasFitnessGoals = false
    let hasClientAgeRanges = false
    let hasLocation = false
    
    try {
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trainers' 
        AND column_name IN ('fitness_goals', 'client_age_ranges', 'location')
      `)
      const existingColumns = columnCheck.rows.map(r => r.column_name)
      hasFitnessGoals = existingColumns.includes('fitness_goals')
      hasClientAgeRanges = existingColumns.includes('client_age_ranges')
      hasLocation = existingColumns.includes('location')
    } catch (error) {
      // Default to false if check fails
    }
    
    // Build SELECT query with only existing columns
    let selectColumns = 'u.id, u.name, u.email, u.role, u.profile_image, t.bio, t.certifications, t.specialties, t.hourly_rate, t.phone_number'
    if (hasFitnessGoals) selectColumns += ', t.fitness_goals'
    if (hasClientAgeRanges) selectColumns += ', t.client_age_ranges'
    if (hasLocation) selectColumns += ', t.location'
    
    const result = await pool.query(
      `SELECT ${selectColumns}
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
      // Check if the new columns exist first
      let hasFitnessGoals = false
      let hasClientAgeRanges = false
      let hasLocation = false
      
      try {
        const columnCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'trainers' 
          AND column_name IN ('fitness_goals', 'client_age_ranges', 'location')
        `)
        const existingColumns = columnCheck.rows.map(r => r.column_name)
        hasFitnessGoals = existingColumns.includes('fitness_goals')
        hasClientAgeRanges = existingColumns.includes('client_age_ranges')
        hasLocation = existingColumns.includes('location')
      } catch (error) {
        console.log('[PROFILE UPDATE] Error checking columns, assuming they don\'t exist:', error.message)
        // Default to false if check fails
      }
      
      // Build UPDATE query with only existing columns
      const updateFields = []
      const updateValues = []
      let paramCount = 1
      
      updateFields.push(`bio = $${paramCount++}`)
      updateValues.push(bio || null)
      
      updateFields.push(`certifications = $${paramCount++}`)
      updateValues.push(certifications ? JSON.stringify(certifications) : null)
      
      updateFields.push(`specialties = $${paramCount++}`)
      updateValues.push(specialties ? JSON.stringify(specialties) : null)
      
      updateFields.push(`hourly_rate = $${paramCount++}`)
      updateValues.push(hourly_rate ? parseFloat(hourly_rate) : null)
      
      updateFields.push(`phone_number = $${paramCount++}`)
      updateValues.push(phone_number || null)
      
      // Add columns if they don't exist and we have data to save
      if (!hasFitnessGoals && fitness_goals && Array.isArray(fitness_goals) && fitness_goals.length > 0) {
        try {
          await pool.query('ALTER TABLE trainers ADD COLUMN IF NOT EXISTS fitness_goals JSONB')
          hasFitnessGoals = true
          console.log('[PROFILE UPDATE] Added fitness_goals column')
        } catch (error) {
          console.log('[PROFILE UPDATE] Error adding fitness_goals column:', error.message)
        }
      }
      
      if (!hasClientAgeRanges && client_age_ranges && Array.isArray(client_age_ranges) && client_age_ranges.length > 0) {
        try {
          await pool.query('ALTER TABLE trainers ADD COLUMN IF NOT EXISTS client_age_ranges JSONB')
          hasClientAgeRanges = true
          console.log('[PROFILE UPDATE] Added client_age_ranges column')
        } catch (error) {
          console.log('[PROFILE UPDATE] Error adding client_age_ranges column:', error.message)
        }
      }
      
      if (!hasLocation && location && location.trim().length > 0) {
        try {
          await pool.query('ALTER TABLE trainers ADD COLUMN IF NOT EXISTS location VARCHAR(255)')
          hasLocation = true
          console.log('[PROFILE UPDATE] Added location column')
        } catch (error) {
          console.log('[PROFILE UPDATE] Error adding location column:', error.message)
        }
      }
      
      if (hasFitnessGoals) {
        updateFields.push(`fitness_goals = $${paramCount++}`)
        updateValues.push(fitness_goals && Array.isArray(fitness_goals) && fitness_goals.length > 0 ? JSON.stringify(fitness_goals) : null)
      }
      
      if (hasClientAgeRanges) {
        updateFields.push(`client_age_ranges = $${paramCount++}`)
        updateValues.push(client_age_ranges && Array.isArray(client_age_ranges) && client_age_ranges.length > 0 ? JSON.stringify(client_age_ranges) : null)
      }
      
      if (hasLocation) {
        updateFields.push(`location = $${paramCount++}`)
        updateValues.push(location || null)
      }
      
      // Add user_id for WHERE clause
      updateValues.push(req.user.id)
      const whereParam = paramCount
      
      const updateQuery = `
        UPDATE trainers 
        SET ${updateFields.join(', ')}
        WHERE user_id = $${whereParam}
      `
      
      await pool.query(updateQuery, updateValues)
    }

    res.json({ message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Error updating profile:', error)
    res.status(500).json({ message: 'Failed to update profile' })
  }
})

export default router

