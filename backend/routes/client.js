import express from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { pool } from '../config/database.js'

const router = express.Router()

// All routes require authentication and client role
router.use(authenticate)
router.use(requireRole(['client']))


// Daily check-in
router.post('/check-in', async (req, res) => {
  try {
    const { 
      workout_completed, 
      diet_stuck_to, 
      workout_rating, 
      notes,
      workout_duration,
      sleep_hours,
      sleep_quality,
      energy_level,
      pain_experienced,
      pain_location,
      pain_intensity,
      progress_photo
    } = req.body
    const today = new Date().toISOString().split('T')[0]

    // Validate workout_rating if workout was completed
    if (workout_completed === true && workout_rating !== null) {
      if (workout_rating < 1 || workout_rating > 10) {
        return res.status(400).json({ message: 'Workout rating must be between 1 and 10' })
      }
    }

    // Validate sleep_quality if provided
    if (sleep_quality !== null && sleep_quality !== undefined) {
      if (sleep_quality < 1 || sleep_quality > 10) {
        return res.status(400).json({ message: 'Sleep quality must be between 1 and 10' })
      }
    }

    // Validate energy_level if provided
    if (energy_level !== null && energy_level !== undefined) {
      if (energy_level < 1 || energy_level > 10) {
        return res.status(400).json({ message: 'Energy level must be between 1 and 10' })
      }
    }

    // Validate pain_intensity if pain is experienced
    if (pain_experienced === true && pain_intensity !== null && pain_intensity !== undefined) {
      if (pain_intensity < 1 || pain_intensity > 10) {
        return res.status(400).json({ message: 'Pain intensity must be between 1 and 10' })
      }
    }

    // Check if check-in already exists for today
    const existing = await pool.query(
      'SELECT id FROM daily_check_ins WHERE client_id = $1 AND check_in_date = $2',
      [req.user.id, today]
    )

    let checkInResult
    if (existing.rows.length > 0) {
      // Update existing check-in
      const result = await pool.query(
        `UPDATE daily_check_ins 
         SET workout_completed = $1, 
             diet_stuck_to = $2, 
             workout_rating = $3, 
             notes = $4,
             workout_duration = $5,
             sleep_hours = $6,
             sleep_quality = $7,
             energy_level = $8,
             pain_experienced = $9,
             pain_location = $10,
             pain_intensity = $11,
             progress_photo = $12,
             status = 'completed', 
             updated_at = NOW()
         WHERE id = $13
         RETURNING *`,
        [
          workout_completed, 
          diet_stuck_to, 
          workout_rating || null, 
          notes || null,
          workout_duration || null,
          sleep_hours || null,
          sleep_quality || null,
          energy_level || null,
          pain_experienced || false,
          pain_location || null,
          pain_intensity || null,
          progress_photo || null,
          existing.rows[0].id
        ]
      )
      checkInResult = result.rows[0]
      res.json(checkInResult)
    } else {
      // Create new check-in
      const result = await pool.query(
        `INSERT INTO daily_check_ins (
          client_id, check_in_date, workout_completed, diet_stuck_to, workout_rating, notes, 
          workout_duration, sleep_hours, sleep_quality, energy_level,
          pain_experienced, pain_location, pain_intensity, progress_photo, status
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'completed')
         RETURNING *`,
        [
          req.user.id, 
          today, 
          workout_completed, 
          diet_stuck_to, 
          workout_rating || null, 
          notes || null,
          workout_duration || null,
          sleep_hours || null,
          sleep_quality || null,
          energy_level || null,
          pain_experienced || false,
          pain_location || null,
          pain_intensity || null,
          progress_photo || null
        ]
      )
      checkInResult = result.rows[0]
      res.status(201).json(checkInResult)
    }

    // Create alerts for trainer if needed
    try {
      // Get client's trainer
      const clientInfo = await pool.query(
        'SELECT trainer_id, name FROM clients c JOIN users u ON c.user_id = u.id WHERE c.user_id = $1',
        [req.user.id]
      )

      if (clientInfo.rows.length > 0 && clientInfo.rows[0].trainer_id) {
        const trainerId = clientInfo.rows[0].trainer_id
        const clientName = clientInfo.rows[0].name

        // Alert for low workout rating (rating <= 4)
        if (workout_rating !== null && workout_rating <= 4) {
          await pool.query(
            `INSERT INTO trainer_alerts (trainer_id, client_id, alert_type, title, message, severity, related_checkin_id, metadata)
             VALUES ($1, $2, 'low_rating', $3, $4, 'high', $5, $6)`,
            [
              trainerId,
              req.user.id,
              `Low Workout Rating from ${clientName}`,
              `${clientName} rated their workout ${workout_rating}/10. This may indicate they're struggling or need support.`,
              checkInResult.id,
              JSON.stringify({ rating: workout_rating, workout_completed: workout_completed })
            ]
          )
        }

        // Alert for pain report
        if (pain_experienced === true) {
          const painMessage = pain_location 
            ? `${clientName} reported pain in ${pain_location} (intensity: ${pain_intensity || 'N/A'}/10).`
            : `${clientName} reported experiencing pain during their workout.`
          
          await pool.query(
            `INSERT INTO trainer_alerts (trainer_id, client_id, alert_type, title, message, severity, related_checkin_id, metadata)
             VALUES ($1, $2, 'pain_report', $3, $4, 'urgent', $5, $6)`,
            [
              trainerId,
              req.user.id,
              `Pain Report from ${clientName}`,
              painMessage,
              checkInResult.id,
              JSON.stringify({ 
                pain_location: pain_location, 
                pain_intensity: pain_intensity,
                workout_completed: workout_completed
              })
            ]
          )
        }
      }
    } catch (alertError) {
      // Don't fail the check-in if alert creation fails
      console.error('Error creating alert:', alertError)
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

// Get all progress entries and check-ins combined
router.get('/progress', async (req, res) => {
  try {
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
      [req.user.id]
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
      [req.user.id]
    )

    // Combine and sort by date (most recent first)
    const combined = [
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

    res.json(combined)
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

// ========== NUTRITION ROUTES FOR CLIENTS ==========

// Get nutrition goals
router.get('/nutrition/goals', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM nutrition_goals WHERE client_id = $1',
      [req.user.id]
    )

    res.json(result.rows[0] || null)
  } catch (error) {
    console.error('Error fetching nutrition goals:', error)
    res.status(500).json({ message: 'Failed to fetch nutrition goals' })
  }
})

// Get nutrition logs
router.get('/nutrition/logs', async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    let query = 'SELECT * FROM nutrition_logs WHERE client_id = $1'
    const params = [req.user.id]

    if (startDate && endDate) {
      query += ' AND log_date BETWEEN $2 AND $3'
      params.push(startDate, endDate)
    }

    query += ' ORDER BY log_date DESC, created_at DESC LIMIT 100'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching nutrition logs:', error)
    res.status(500).json({ message: 'Failed to fetch nutrition logs' })
  }
})

// Create nutrition log entry
router.post('/nutrition/logs', async (req, res) => {
  try {
    const { log_date, meal_type, food_name, quantity, unit, calories, protein, carbs, fats, notes } = req.body

    const result = await pool.query(
      `INSERT INTO nutrition_logs 
       (client_id, log_date, meal_type, food_name, quantity, unit, calories, protein, carbs, fats, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [req.user.id, log_date, meal_type, food_name, quantity, unit, calories, protein, carbs, fats, notes]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating nutrition log:', error)
    res.status(500).json({ message: 'Failed to create nutrition log' })
  }
})

// ========== TRAINER MANAGEMENT ROUTES ==========

// Get current trainer
router.get('/trainer', async (req, res) => {
  try {
    // Get client's trainer_id
    const clientResult = await pool.query(
      'SELECT trainer_id FROM clients WHERE user_id = $1',
      [req.user.id]
    )

    if (clientResult.rows.length === 0 || !clientResult.rows[0].trainer_id) {
      return res.status(404).json({ message: 'No trainer assigned' })
    }

    const trainerId = clientResult.rows[0].trainer_id

    // Get trainer info
    const trainerResult = await pool.query(
      `SELECT t.*, u.name, u.email, u.profile_image
       FROM trainers t
       JOIN users u ON t.user_id = u.id
       WHERE t.user_id = $1`,
      [trainerId]
    )

    if (trainerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Trainer not found' })
    }

    const trainer = trainerResult.rows[0]
    
    // Parse JSONB fields
    if (trainer.specialties) {
      trainer.specialties = typeof trainer.specialties === 'string' 
        ? JSON.parse(trainer.specialties) 
        : trainer.specialties
    }
    if (trainer.certifications) {
      trainer.certifications = typeof trainer.certifications === 'string'
        ? JSON.parse(trainer.certifications)
        : trainer.certifications
    }

    res.json({
      id: trainer.user_id,
      name: trainer.name,
      email: trainer.email,
      phoneNumber: trainer.phone_number,
      bio: trainer.bio,
      specialties: trainer.specialties,
      certifications: trainer.certifications,
      hourly_rate: trainer.hourly_rate,
      total_clients: trainer.total_clients,
      active_clients: trainer.active_clients,
      profile_image: trainer.profile_image
    })
  } catch (error) {
    console.error('Error fetching trainer:', error)
    res.status(500).json({ message: 'Failed to fetch trainer' })
  }
})

// Search for trainers
router.get('/trainers/search', async (req, res) => {
  console.log('[TRAINER SEARCH] ===== ENDPOINT HIT =====')
  console.log('[TRAINER SEARCH] Request received at:', new Date().toISOString())
  console.log('[TRAINER SEARCH] User ID:', req.user?.id)
  console.log('[TRAINER SEARCH] User role:', req.user?.role)
  try {
    const { q, specialties, fitness_goals, client_age_ranges, special_needs, location } = req.query

    console.log('[TRAINER SEARCH] Request query params:', req.query)

    // If no filters, just get all trainers
    const hasFilters = (q && q.trim().length > 0) || 
                      (location && location.trim().length > 0) ||
                      (specialties && (Array.isArray(specialties) ? specialties.length > 0 : true)) ||
                      (fitness_goals && (Array.isArray(fitness_goals) ? fitness_goals.length > 0 : true)) ||
                      (client_age_ranges && (Array.isArray(client_age_ranges) ? client_age_ranges.length > 0 : true)) ||
                      (special_needs && (Array.isArray(special_needs) ? special_needs.length > 0 : true))

    if (!hasFilters) {
      // First, let's check if there are any trainers at all
      console.log('[TRAINER SEARCH] Checking trainer counts...')
      const trainerCountCheck = await pool.query('SELECT COUNT(*) as count FROM trainers')
      const userTrainerCountCheck = await pool.query(
        `SELECT COUNT(*) as count FROM users u 
         WHERE u.role = 'trainer' AND EXISTS (SELECT 1 FROM trainers t WHERE t.user_id = u.id)`
      )
      console.log('[TRAINER SEARCH] Total trainers in trainers table:', trainerCountCheck.rows[0].count)
      console.log('[TRAINER SEARCH] Total trainers with matching users:', userTrainerCountCheck.rows[0].count)
      
      // Also check all users with trainer role
      const allTrainerUsers = await pool.query(
        `SELECT u.id, u.name, u.email, u.role, t.user_id as trainer_user_id
         FROM users u
         LEFT JOIN trainers t ON u.id = t.user_id
         WHERE u.role = 'trainer'
         LIMIT 10`
      )
      console.log('[TRAINER SEARCH] All users with trainer role:', allTrainerUsers.rows)
      
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
        console.log('[TRAINER SEARCH] Column check - fitness_goals:', hasFitnessGoals, 'client_age_ranges:', hasClientAgeRanges, 'location:', hasLocation)
      } catch (error) {
        console.log('[TRAINER SEARCH] Error checking columns, assuming they don\'t exist:', error.message)
        // Default to false if check fails
      }
      
      // Build query with only existing columns (explicitly list base columns to avoid t.* issues)
      let selectColumns = 't.id, t.user_id, t.bio, t.certifications, t.specialties, t.hourly_rate, t.phone_number, t.total_clients, t.active_clients, t.blockchain_reputation_score, t.created_at, t.updated_at, u.name, u.email, u.profile_image'
      if (hasFitnessGoals) selectColumns += ', t.fitness_goals'
      if (hasClientAgeRanges) selectColumns += ', t.client_age_ranges'
      if (hasLocation) selectColumns += ', t.location'
      
      const allTrainersQuery = `
        SELECT DISTINCT ${selectColumns}
       FROM trainers t
       JOIN users u ON t.user_id = u.id
       ORDER BY u.name ASC
        LIMIT 50
      `
      console.log('[TRAINER SEARCH] Executing query:', allTrainersQuery)
      const result = await pool.query(allTrainersQuery)
      console.log('[TRAINER SEARCH] Query result rows:', result.rows.length)
      if (result.rows.length > 0) {
        console.log('[TRAINER SEARCH] First trainer:', {
          user_id: result.rows[0].user_id,
          name: result.rows[0].name,
          email: result.rows[0].email
        })
      }
      
      if (result.rows.length === 0 && parseInt(trainerCountCheck.rows[0].count) > 0) {
        console.log('[TRAINER SEARCH] WARNING: Trainers exist but JOIN returned no results. Checking data...')
        // Try a LEFT JOIN to see what's happening
        const debugQuery = await pool.query(`
          SELECT t.user_id, u.id as user_table_id, u.name, u.email, u.role
          FROM trainers t
          LEFT JOIN users u ON t.user_id = u.id
          LIMIT 5
        `)
        console.log('[TRAINER SEARCH] Debug query results:', debugQuery.rows)
      }

    const trainers = result.rows.map(trainer => {
      // Parse JSONB fields
      let specialties = trainer.specialties
      if (specialties) {
        specialties = typeof specialties === 'string' 
          ? JSON.parse(specialties) 
          : specialties
      }
      let certifications = trainer.certifications
      if (certifications) {
        certifications = typeof certifications === 'string'
          ? JSON.parse(certifications)
          : certifications
      }
        let fitnessGoals = trainer.fitness_goals
        if (fitnessGoals) {
          fitnessGoals = typeof fitnessGoals === 'string'
            ? JSON.parse(fitnessGoals)
            : fitnessGoals
        }
        let clientAgeRanges = trainer.client_age_ranges
        if (clientAgeRanges) {
          clientAgeRanges = typeof clientAgeRanges === 'string'
            ? JSON.parse(clientAgeRanges)
            : clientAgeRanges
        }

      return {
        id: trainer.user_id,
        name: trainer.name,
        email: trainer.email,
        phoneNumber: trainer.phone_number,
        bio: trainer.bio,
        specialties: specialties,
        certifications: certifications,
          fitness_goals: fitnessGoals,
          client_age_ranges: clientAgeRanges,
        hourly_rate: trainer.hourly_rate,
        total_clients: trainer.total_clients,
        active_clients: trainer.active_clients,
          profile_image: trainer.profile_image,
          location: trainer.location
      }
    })

      console.log('[TRAINER SEARCH] Returning', trainers.length, 'trainers')
      return res.json(trainers)
    }

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
      console.log('[TRAINER SEARCH] Column check - fitness_goals:', hasFitnessGoals, 'client_age_ranges:', hasClientAgeRanges, 'location:', hasLocation)
    } catch (error) {
      console.log('[TRAINER SEARCH] Error checking columns, assuming they don\'t exist:', error.message)
      // Default to false if check fails
    }
    
    // Build query with only existing columns (explicitly list base columns to avoid t.* issues)
    let selectColumns = 't.id, t.user_id, t.bio, t.certifications, t.specialties, t.hourly_rate, t.phone_number, t.total_clients, t.active_clients, t.blockchain_reputation_score, t.created_at, t.updated_at, u.name, u.email, u.profile_image'
    if (hasFitnessGoals) selectColumns += ', t.fitness_goals'
    if (hasClientAgeRanges) selectColumns += ', t.client_age_ranges'
    if (hasLocation) selectColumns += ', t.location'
    
    let query = `
      SELECT DISTINCT ${selectColumns}
      FROM trainers t
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `
    const params = []
    let paramCount = 1

    // Text search (name, email, bio, specialties, location if exists)
    if (q && q.trim().length > 0) {
      const searchTerm = `%${q.trim()}%`
      let searchConditions = [
        `u.name ILIKE $${paramCount}`,
        `u.email ILIKE $${paramCount}`,
        `t.bio ILIKE $${paramCount}`,
        `t.specialties::text ILIKE $${paramCount}`
      ]
      if (hasLocation) {
        searchConditions.push(`t.location ILIKE $${paramCount}`)
      }
      query += ` AND (${searchConditions.join(' OR ')})`
      params.push(searchTerm)
      paramCount++
    }

    // Filter by location (only if column exists)
    if (location && location.trim().length > 0 && hasLocation) {
      const locationTerm = `%${location.trim()}%`
      query += ` AND t.location ILIKE $${paramCount}`
      params.push(locationTerm)
      paramCount++
    }

    // Filter by specialties
    if (specialties) {
      const specialtyList = Array.isArray(specialties) ? specialties : [specialties]
      const specialtyParams = []
      specialtyList.forEach((spec, i) => {
        specialtyParams.push(`$${paramCount + i}`)
        params.push(`%${spec}%`)
      })
      query += ` AND (t.specialties::text ILIKE ANY(ARRAY[${specialtyParams.join(', ')}]))`
      paramCount += specialtyList.length
    }

    // Filter by fitness goals (only if column exists)
    if (fitness_goals && hasFitnessGoals) {
      const goalsList = Array.isArray(fitness_goals) ? fitness_goals : [fitness_goals]
      const goalParams = []
      goalsList.forEach((goal, i) => {
        goalParams.push(`$${paramCount + i}`)
        params.push(`%${goal}%`)
      })
      query += ` AND (t.fitness_goals::text ILIKE ANY(ARRAY[${goalParams.join(', ')}]))`
      paramCount += goalsList.length
    }

    // Filter by client age ranges (only if column exists)
    if (client_age_ranges && hasClientAgeRanges) {
      const ageList = Array.isArray(client_age_ranges) ? client_age_ranges : [client_age_ranges]
      const ageParams = []
      ageList.forEach((age, i) => {
        ageParams.push(`$${paramCount + i}`)
        params.push(`%${age}%`)
      })
      query += ` AND (t.client_age_ranges::text ILIKE ANY(ARRAY[${ageParams.join(', ')}]))`
      paramCount += ageList.length
    }

    // Filter by special needs (injuries, etc.) - search in bio and specialties
    if (special_needs) {
      const needsList = Array.isArray(special_needs) ? special_needs : [special_needs]
      const needsConditions = []
      needsList.forEach((need, i) => {
        needsConditions.push(`(t.bio ILIKE $${paramCount} OR t.specialties::text ILIKE $${paramCount + 1})`)
        params.push(`%${need}%`)
        params.push(`%${need}%`)
        paramCount += 2
      })
      query += ` AND (${needsConditions.join(' OR ')})`
    }

    query += ` ORDER BY u.name ASC LIMIT 50`

    console.log('[TRAINER SEARCH] Query:', query)
    console.log('[TRAINER SEARCH] Params:', params)
    
    const result = await pool.query(query, params)
    
    console.log('[TRAINER SEARCH] Found trainers:', result.rows.length)

    const trainers = result.rows.map(trainer => {
      // Parse JSONB fields
      let specialties = trainer.specialties
      if (specialties) {
        specialties = typeof specialties === 'string' 
          ? JSON.parse(specialties) 
          : specialties
      }
      let certifications = trainer.certifications
      if (certifications) {
        certifications = typeof certifications === 'string'
          ? JSON.parse(certifications)
          : certifications
      }
      let fitnessGoals = trainer.fitness_goals || null
      if (fitnessGoals) {
        fitnessGoals = typeof fitnessGoals === 'string'
          ? JSON.parse(fitnessGoals)
          : fitnessGoals
      }
      let clientAgeRanges = trainer.client_age_ranges || null
      if (clientAgeRanges) {
        clientAgeRanges = typeof clientAgeRanges === 'string'
          ? JSON.parse(clientAgeRanges)
          : clientAgeRanges
      }

      return {
        id: trainer.user_id,
        name: trainer.name,
        email: trainer.email,
        phoneNumber: trainer.phone_number,
        bio: trainer.bio,
        specialties: specialties,
        certifications: certifications,
        fitness_goals: fitnessGoals,
        client_age_ranges: clientAgeRanges,
        hourly_rate: trainer.hourly_rate,
        total_clients: trainer.total_clients,
        active_clients: trainer.active_clients,
        profile_image: trainer.profile_image,
        location: trainer.location
      }
    })

    console.log('[TRAINER SEARCH] Returning', trainers.length, 'trainers')
    res.json(trainers)
  } catch (error) {
    console.error('Error searching trainers:', error)
    console.error('Error details:', error.message, error.stack)
    res.status(500).json({ message: 'Failed to search trainers', error: error.message })
  }
})

// Request to connect with a trainer
router.post('/trainer/request', async (req, res) => {
  try {
    const { trainerId, message } = req.body

    if (!trainerId) {
      return res.status(400).json({ message: 'Trainer ID is required' })
    }

    // Check if onboarding is completed
    const onboardingCheck = await pool.query(
      'SELECT onboarding_completed FROM clients WHERE user_id = $1',
      [req.user.id]
    )

    if (onboardingCheck.rows.length === 0 || !onboardingCheck.rows[0].onboarding_completed) {
      return res.status(403).json({ 
        message: 'Please complete your profile before requesting a trainer',
        requires_onboarding: true
      })
    }

    // Verify trainer exists
    const trainerCheck = await pool.query(
      'SELECT user_id FROM trainers WHERE user_id = $1',
      [trainerId]
    )

    if (trainerCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Trainer not found' })
    }

    // Check if client already has this trainer
    const existingClient = await pool.query(
      'SELECT trainer_id FROM clients WHERE user_id = $1',
      [req.user.id]
    )

    if (existingClient.rows.length > 0 && existingClient.rows[0].trainer_id === trainerId) {
      return res.status(400).json({ message: 'You are already connected with this trainer' })
    }

    // Check if there's already a pending request
    const existingRequest = await pool.query(
      `SELECT id, status FROM trainer_requests 
       WHERE client_id = $1 AND trainer_id = $2 AND status = 'pending'`,
      [req.user.id, trainerId]
    )

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ message: 'You already have a pending request with this trainer' })
    }

    // Ensure client record exists
    const clientCheck = await pool.query(
      'SELECT id FROM clients WHERE user_id = $1',
      [req.user.id]
    )

    if (clientCheck.rows.length === 0) {
      await pool.query(
        'INSERT INTO clients (user_id, start_date) VALUES ($1, CURRENT_DATE)',
        [req.user.id]
      )
    }

    // Create trainer request
    const result = await pool.query(
      `INSERT INTO trainer_requests (client_id, trainer_id, status, message)
       VALUES ($1, $2, 'pending', $3)
       RETURNING *`,
      [req.user.id, trainerId, message || null]
    )

    res.status(201).json({ 
      message: 'Trainer request sent successfully! The trainer will review your request.',
      request: result.rows[0]
    })
  } catch (error) {
    console.error('Error requesting trainer:', error)
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ message: 'You already have a pending request with this trainer' })
    }
    res.status(500).json({ message: 'Failed to send trainer request' })
  }
})

// Get client's pending requests
router.get('/trainer/requests', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tr.*, u.name as trainer_name, u.email as trainer_email, t.bio, t.specialties
       FROM trainer_requests tr
       JOIN users u ON tr.trainer_id = u.id
       LEFT JOIN trainers t ON tr.trainer_id = t.user_id
       WHERE tr.client_id = $1
       ORDER BY tr.created_at DESC`,
      [req.user.id]
    )

    const requests = result.rows.map(row => ({
      id: row.id,
      trainerId: row.trainer_id,
      trainerName: row.trainer_name,
      trainerEmail: row.trainer_email,
      status: row.status,
      message: row.message,
      trainerResponse: row.trainer_response,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      bio: row.bio,
      specialties: row.specialties ? (typeof row.specialties === 'string' ? JSON.parse(row.specialties) : row.specialties) : null
    }))

    res.json(requests)
  } catch (error) {
    console.error('Error fetching trainer requests:', error)
    res.status(500).json({ message: 'Failed to fetch trainer requests' })
  }
})

// Get client's own profile
router.get('/profile', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.name, u.email
       FROM clients c
       JOIN users u ON c.user_id = u.id
       WHERE c.user_id = $1`,
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Client profile not found' })
    }

    const client = result.rows[0]
    
    // Parse JSONB fields
    if (client.goals) {
      client.goals = typeof client.goals === 'string' ? JSON.parse(client.goals) : client.goals
    }
    if (client.secondary_goals) {
      client.secondary_goals = typeof client.secondary_goals === 'string' ? JSON.parse(client.secondary_goals) : client.secondary_goals
    }
    if (client.available_dates) {
      client.available_dates = typeof client.available_dates === 'string' ? JSON.parse(client.available_dates) : client.available_dates
    }
    if (client.onboarding_data) {
      client.onboarding_data = typeof client.onboarding_data === 'string' ? JSON.parse(client.onboarding_data) : client.onboarding_data
    }

    res.json(client)
  } catch (error) {
    console.error('Error fetching client profile:', error)
    res.status(500).json({ message: 'Failed to fetch client profile' })
  }
})

// Update client's own profile/onboarding
router.put('/profile', async (req, res) => {
  try {
    const profileData = req.body

    // Check if client record exists
    const clientCheck = await pool.query(
      'SELECT id FROM clients WHERE user_id = $1',
      [req.user.id]
    )

    let clientId
    if (clientCheck.rows.length === 0) {
      // Create client record
      const result = await pool.query(
        'INSERT INTO clients (user_id, start_date) VALUES ($1, CURRENT_DATE) RETURNING id',
        [req.user.id]
      )
      clientId = result.rows[0].id
    } else {
      clientId = clientCheck.rows[0].id
    }

    // Build update query
    const updates = []
    const values = []
    let paramCount = 1

    const fields = [
      'height', 'weight', 'gender', 'age', 'previous_experience',
      'average_daily_eating', 'primary_goal', 'goal_target', 'goal_timeframe',
      'secondary_goals', 'barriers', 'training_preference', 'communication_preference',
      'activity_level', 'available_dates', 'location', 'nutrition_habits',
      'nutrition_experience', 'injuries', 'sleep_hours', 'stress_level',
      'lifestyle_activity', 'psychological_barriers', 'mindset', 'motivation_why'
    ]

    fields.forEach(field => {
      if (profileData[field] !== undefined) {
        if (field === 'secondary_goals' || field === 'available_dates') {
          updates.push(`${field} = $${paramCount++}`)
          values.push(profileData[field] ? JSON.stringify(profileData[field]) : null)
        } else {
          updates.push(`${field} = $${paramCount++}`)
          values.push(profileData[field])
        }
      }
    })

    // Always update onboarding_data and onboarding_completed
    updates.push(`onboarding_data = $${paramCount++}`)
    values.push(JSON.stringify(profileData))
    updates.push(`onboarding_completed = $${paramCount++}`)
    values.push(true)
    updates.push(`updated_at = CURRENT_TIMESTAMP`)

    values.push(clientId)

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' })
    }

    await pool.query(
      `UPDATE clients 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}`,
      values
    )

    res.json({ 
      message: 'Profile updated successfully',
      onboarding_completed: true
    })
  } catch (error) {
    console.error('Error updating client profile:', error)
    res.status(500).json({ message: 'Failed to update profile' })
  }
})

// Check if onboarding is completed
router.get('/profile/onboarding-status', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT onboarding_completed FROM clients WHERE user_id = $1',
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.json({ onboarding_completed: false })
    }

    res.json({ onboarding_completed: result.rows[0].onboarding_completed || false })
  } catch (error) {
    console.error('Error checking onboarding status:', error)
    res.status(500).json({ message: 'Failed to check onboarding status' })
  }
})

// Disconnect from trainer
router.delete('/trainer', async (req, res) => {
  try {
    // Get current trainer
    const clientResult = await pool.query(
      'SELECT trainer_id FROM clients WHERE user_id = $1',
      [req.user.id]
    )

    if (clientResult.rows.length === 0 || !clientResult.rows[0].trainer_id) {
      return res.status(404).json({ message: 'No trainer assigned' })
    }

    const trainerId = clientResult.rows[0].trainer_id

    // Delete ALL trainer requests between this client and trainer
    // This erases all previous request history
    await pool.query(
      'DELETE FROM trainer_requests WHERE client_id = $1 AND trainer_id = $2',
      [req.user.id, trainerId]
    )

    // Remove trainer from client
    await pool.query(
      'UPDATE clients SET trainer_id = NULL WHERE user_id = $1',
      [req.user.id]
    )

    // Decrease trainer's active client count
    await pool.query(
      `UPDATE trainers 
       SET active_clients = GREATEST(COALESCE(active_clients, 0) - 1, 0)
       WHERE user_id = $1`,
      [trainerId]
    )

    res.json({ message: 'Disconnected from trainer successfully' })
  } catch (error) {
    console.error('Error disconnecting trainer:', error)
    res.status(500).json({ message: 'Failed to disconnect from trainer' })
  }
})

export default router
