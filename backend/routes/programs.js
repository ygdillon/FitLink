import express from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { pool } from '../config/database.js'

const router = express.Router()

router.use(authenticate)

// Create a new program (trainer only) - MUST be before /:id route
router.post('/', requireRole(['trainer']), async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { name, description, split_type, duration_weeks, client_id, is_template, workouts } = req.body

    // Create program
    const programResult = await client.query(
      `INSERT INTO programs (trainer_id, client_id, name, description, split_type, duration_weeks, is_template)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.id, client_id || null, name, description || null, split_type || null, duration_weeks || 4, is_template || false]
    )

    const program = programResult.rows[0]

    // Add workouts if provided
    if (workouts && Array.isArray(workouts)) {
      for (const workout of workouts) {
        const { workout_name, day_number, week_number, exercises } = workout

        const workoutResult = await client.query(
          `INSERT INTO program_workouts (program_id, workout_name, day_number, week_number, order_index)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [program.id, workout_name, day_number || 1, week_number || 1, workout.order_index || 0]
        )

        const programWorkout = workoutResult.rows[0]

        // Add exercises if provided
        if (exercises && Array.isArray(exercises)) {
          for (let i = 0; i < exercises.length; i++) {
            const exercise = exercises[i]
            await client.query(
              `INSERT INTO program_workout_exercises 
               (program_workout_id, exercise_name, exercise_type, sets, reps, weight, duration, rest, tempo, notes, order_index)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [
                programWorkout.id,
                exercise.exercise_name || '',
                exercise.exercise_type || null,
                exercise.sets || null,
                exercise.reps || null,
                exercise.weight || null,
                exercise.duration || null,
                exercise.rest || null,
                exercise.tempo || null,
                exercise.notes || null,
                exercise.order_index !== undefined ? exercise.order_index : i
              ]
            )
          }
        }
      }
    }

    await client.query('COMMIT')

    // Fetch the complete program to return
    const completeProgram = await pool.query(
      `SELECT p.*,
              json_agg(
                json_build_object(
                  'id', pw.id,
                  'workout_name', pw.workout_name,
                  'day_number', pw.day_number,
                  'week_number', pw.week_number,
                  'order_index', pw.order_index,
                  'exercises', (
                    SELECT json_agg(
                      json_build_object(
                        'id', pwe.id,
                        'exercise_name', pwe.exercise_name,
                        'exercise_type', pwe.exercise_type,
                        'sets', pwe.sets,
                        'reps', pwe.reps,
                        'weight', pwe.weight,
                        'duration', pwe.duration,
                        'rest', pwe.rest,
                        'tempo', pwe.tempo,
                        'notes', pwe.notes,
                        'order_index', pwe.order_index
                      ) ORDER BY pwe.order_index
                    )
                    FROM program_workout_exercises pwe
                    WHERE pwe.program_workout_id = pw.id
                  )
                ) ORDER BY pw.week_number, pw.day_number, pw.order_index
              ) as workouts
       FROM programs p
       LEFT JOIN program_workouts pw ON p.id = pw.program_id
       WHERE p.id = $1
       GROUP BY p.id`,
      [program.id]
    )

    res.status(201).json(completeProgram.rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error creating program:', error)
    res.status(500).json({ message: 'Failed to create program', error: error.message })
  } finally {
    client.release()
  }
})

// Get all programs for a trainer (templates and assigned) - MUST be before /:id
router.get('/trainer', requireRole(['trainer']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, 
              COUNT(DISTINCT pw.id) as workout_count,
              COUNT(DISTINCT pa.client_id) as assigned_clients_count
       FROM programs p
       LEFT JOIN program_workouts pw ON p.id = pw.program_id
       LEFT JOIN program_assignments pa ON p.id = pa.program_id AND pa.status = 'active'
       WHERE p.trainer_id = $1
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [req.user.id]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching trainer programs:', error)
    res.status(500).json({ message: 'Failed to fetch programs' })
  }
})

// Get programs assigned to a client - MUST be before /:id
router.get('/client/assigned', requireRole(['client']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, 
              u.name as trainer_name,
              pa.assigned_date,
              pa.start_date,
              pa.status as assignment_status
       FROM program_assignments pa
       JOIN programs p ON pa.program_id = p.id
       JOIN users u ON p.trainer_id = u.id
       WHERE pa.client_id = $1 AND pa.status = 'active'
       ORDER BY pa.assigned_date DESC`,
      [req.user.id]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching client programs:', error)
    res.status(500).json({ message: 'Failed to fetch programs' })
  }
})

// Get programs assigned to a specific client (for trainer view) - MUST be before /:id
router.get('/client/:clientId/assigned', requireRole(['trainer']), async (req, res) => {
  try {
    const { clientId } = req.params

    console.log(`[DEBUG] Fetching programs for client table id: ${clientId}, trainer: ${req.user.id}`)

    // Verify client belongs to trainer and get user_id
    const clientCheck = await pool.query(
      'SELECT user_id FROM clients WHERE id = $1 AND trainer_id = $2',
      [clientId, req.user.id]
    )

    if (clientCheck.rows.length === 0) {
      console.log(`[DEBUG] Client not found or doesn't belong to trainer`)
      return res.status(404).json({ message: 'Client not found' })
    }

    const clientUserId = clientCheck.rows[0].user_id
    console.log(`[DEBUG] Client user_id: ${clientUserId}`)

    // Get programs assigned to this client
    const result = await pool.query(
      `SELECT p.*, 
              COALESCE(COUNT(DISTINCT pw.id), 0) as workout_count,
              pa.assigned_date,
              pa.start_date,
              pa.status as assignment_status
       FROM program_assignments pa
       JOIN programs p ON pa.program_id = p.id
       LEFT JOIN program_workouts pw ON p.id = pw.program_id
       WHERE pa.client_id = $1 AND pa.status = 'active'
       GROUP BY p.id, pa.assigned_date, pa.start_date, pa.status
       ORDER BY pa.assigned_date DESC`,
      [clientUserId]
    )

    console.log(`[DEBUG] Found ${result.rows.length} assigned programs`)
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching client programs:', error)
    res.status(500).json({ message: 'Failed to fetch programs', error: error.message })
  }
})

// Get a specific program with all workouts and exercises
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Get program
    const programResult = await pool.query(
      `SELECT p.*, 
              u.name as trainer_name,
              c.name as client_name
       FROM programs p
       LEFT JOIN users u ON p.trainer_id = u.id
       LEFT JOIN users c ON p.client_id = c.id
       WHERE p.id = $1`,
      [id]
    )

    if (programResult.rows.length === 0) {
      return res.status(404).json({ message: 'Program not found' })
    }

    const program = programResult.rows[0]

    // Get week names for this program
    const weeksResult = await pool.query(
      `SELECT week_number, week_name 
       FROM program_weeks 
       WHERE program_id = $1 
       ORDER BY week_number`,
      [id]
    )
    
    const weekNames = {}
    weeksResult.rows.forEach(row => {
      weekNames[row.week_number] = row.week_name
    })
    program.week_names = weekNames

    // Get all workouts for this program, ordered by week and day
    const workoutsResult = await pool.query(
      `SELECT pw.*,
              json_agg(
                json_build_object(
                  'id', pwe.id,
                  'exercise_name', pwe.exercise_name,
                  'exercise_type', pwe.exercise_type,
                  'sets', pwe.sets,
                  'reps', pwe.reps,
                  'weight', pwe.weight,
                  'duration', pwe.duration,
                  'rest', pwe.rest,
                  'tempo', pwe.tempo,
                  'notes', pwe.notes,
                  'order_index', pwe.order_index
                ) ORDER BY pwe.order_index
              ) as exercises
       FROM program_workouts pw
       LEFT JOIN program_workout_exercises pwe ON pw.id = pwe.program_workout_id
       WHERE pw.program_id = $1
       GROUP BY pw.id
       ORDER BY pw.week_number, pw.day_number, pw.order_index`,
      [id]
    )

    program.workouts = workoutsResult.rows.map(w => ({
      ...w,
      exercises: w.exercises[0] ? w.exercises : []
    }))

    res.json(program)
  } catch (error) {
    console.error('Error fetching program:', error)
    res.status(500).json({ message: 'Failed to fetch program' })
  }
})

// Update week name for a program - MUST be before /:id route
router.put('/:id/week/:weekNumber/name', requireRole(['trainer']), async (req, res) => {
  try {
    const { id, weekNumber } = req.params
    const { week_name } = req.body

    // Verify program belongs to trainer
    const programCheck = await pool.query(
      'SELECT trainer_id FROM programs WHERE id = $1',
      [id]
    )

    if (programCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Program not found' })
    }

    if (programCheck.rows[0].trainer_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this program' })
    }

    // Insert or update week name
    const result = await pool.query(
      `INSERT INTO program_weeks (program_id, week_number, week_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (program_id, week_number)
       DO UPDATE SET week_name = EXCLUDED.week_name, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [id, weekNumber, week_name || null]
    )

    res.json({ message: 'Week name updated successfully', week: result.rows[0] })
  } catch (error) {
    console.error('Error updating week name:', error)
    res.status(500).json({ message: 'Failed to update week name', error: error.message })
  }
})

// Update a program
router.put('/:id', requireRole(['trainer']), async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { id } = req.params
    const { name, description, split_type, duration_weeks, workouts } = req.body

    // Verify program belongs to trainer
    const programCheck = await client.query(
      'SELECT trainer_id FROM programs WHERE id = $1',
      [id]
    )

    if (programCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Program not found' })
    }

    if (programCheck.rows[0].trainer_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this program' })
    }

    // Update program
    await client.query(
      `UPDATE programs 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           split_type = COALESCE($3, split_type),
           duration_weeks = COALESCE($4, duration_weeks),
           start_date = COALESCE($5, start_date),
           end_date = COALESCE($6, end_date),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [name, description, split_type, duration_weeks, start_date || null, end_date || null, id]
    )

    // If workouts are provided, update them
    if (workouts && Array.isArray(workouts)) {
      // Validate workouts before processing
      for (const workout of workouts) {
        if (!workout.workout_name || workout.workout_name.trim() === '') {
          await client.query('ROLLBACK')
          return res.status(400).json({ 
            message: 'Workout name is required for all workouts',
            error: 'Missing workout_name'
          })
        }
      }

      // Delete existing workouts and exercises
      await client.query(
        `DELETE FROM program_workout_exercises 
         WHERE program_workout_id IN (
           SELECT id FROM program_workouts WHERE program_id = $1
         )`,
        [id]
      )
      await client.query('DELETE FROM program_workouts WHERE program_id = $1', [id])

      // Add new workouts
      for (const workout of workouts) {
        const { workout_name, day_number, week_number, exercises } = workout

        const workoutResult = await client.query(
          `INSERT INTO program_workouts (program_id, workout_name, day_number, week_number, order_index)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [id, workout_name.trim(), day_number || 1, week_number || 1, workout.order_index || 0]
        )

        const programWorkout = workoutResult.rows[0]

        // Add exercises
        if (exercises && Array.isArray(exercises)) {
          for (let i = 0; i < exercises.length; i++) {
            const exercise = exercises[i]
            // Skip exercises without names
            if (!exercise.exercise_name || exercise.exercise_name.trim() === '') {
              continue
            }
            await client.query(
              `INSERT INTO program_workout_exercises 
               (program_workout_id, exercise_name, exercise_type, sets, reps, weight, duration, rest, tempo, notes, order_index)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [
                programWorkout.id,
                exercise.exercise_name.trim(),
                exercise.exercise_type || null,
                exercise.sets || null,
                exercise.reps || null,
                exercise.weight || null,
                exercise.duration || null,
                exercise.rest || null,
                exercise.tempo || null,
                exercise.notes || null,
                exercise.order_index !== undefined ? exercise.order_index : i
              ]
            )
          }
        }
      }
    }

    await client.query('COMMIT')

    // Fetch updated program
    const programData = await pool.query(
      `SELECT p.*,
              json_agg(
                json_build_object(
                  'id', pw.id,
                  'workout_name', pw.workout_name,
                  'day_number', pw.day_number,
                  'week_number', pw.week_number,
                  'order_index', pw.order_index,
                  'exercises', (
                    SELECT json_agg(
                      json_build_object(
                        'id', pwe.id,
                        'exercise_name', pwe.exercise_name,
                        'exercise_type', pwe.exercise_type,
                        'sets', pwe.sets,
                        'reps', pwe.reps,
                        'weight', pwe.weight,
                        'duration', pwe.duration,
                        'rest', pwe.rest,
                        'tempo', pwe.tempo,
                        'notes', pwe.notes,
                        'order_index', pwe.order_index
                      ) ORDER BY pwe.order_index
                    )
                    FROM program_workout_exercises pwe
                    WHERE pwe.program_workout_id = pw.id
                  )
                ) ORDER BY pw.week_number, pw.day_number, pw.order_index
              ) as workouts
       FROM programs p
       LEFT JOIN program_workouts pw ON p.id = pw.program_id
       WHERE p.id = $1
       GROUP BY p.id`,
      [id]
    )

    const updatedProgram = programData.rows[0]
    
    // Get week names
    const weeksResult = await pool.query(
      `SELECT week_number, week_name 
       FROM program_weeks 
       WHERE program_id = $1 
       ORDER BY week_number`,
      [id]
    )
    
    const weekNames = {}
    weeksResult.rows.forEach(row => {
      weekNames[row.week_number] = row.week_name
    })
    updatedProgram.week_names = weekNames

    res.json(updatedProgram)
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error updating program:', error)
    res.status(500).json({ message: 'Failed to update program', error: error.message })
  } finally {
    client.release()
  }
})

// Delete a program
router.delete('/:id', requireRole(['trainer']), async (req, res) => {
  try {
    const { id } = req.params

    // Verify program belongs to trainer
    const programCheck = await pool.query(
      'SELECT trainer_id FROM programs WHERE id = $1',
      [id]
    )

    if (programCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Program not found' })
    }

    if (programCheck.rows[0].trainer_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this program' })
    }

    // Delete program (cascade will handle related records)
    await pool.query('DELETE FROM programs WHERE id = $1', [id])

    res.json({ message: 'Program deleted successfully' })
  } catch (error) {
    console.error('Error deleting program:', error)
    res.status(500).json({ message: 'Failed to delete program' })
  }
})

// Helper function to calculate session date from program start date, week, and day
function calculateSessionDate(startDate, weekNumber, dayNumber) {
  const start = new Date(startDate)
  // Get the day of week for the start date (0 = Sunday, 1 = Monday, etc.)
  const startDayOfWeek = start.getDay()
  // Convert to Monday = 1, Sunday = 7 format
  const startDay = startDayOfWeek === 0 ? 7 : startDayOfWeek
  
  // Calculate days to add: (week - 1) * 7 + (day - startDay)
  const daysToAdd = (weekNumber - 1) * 7 + (dayNumber - startDay)
  const sessionDate = new Date(start)
  sessionDate.setDate(start.getDate() + daysToAdd)
  
  return sessionDate.toISOString().split('T')[0] // Return as YYYY-MM-DD
}

// Assign program to client and auto-create sessions
router.post('/:id/assign', requireRole(['trainer']), async (req, res) => {
  const dbClient = await pool.connect()
  try {
    await dbClient.query('BEGIN')
    
    const { id } = req.params
    const { client_id, start_date } = req.body

    console.log(`[DEBUG] Assigning program ${id} to client_id ${client_id} by trainer ${req.user.id}`)

    // Verify program belongs to trainer
    const programCheck = await dbClient.query(
      'SELECT trainer_id, is_template, name FROM programs WHERE id = $1',
      [id]
    )

    if (programCheck.rows.length === 0) {
      await dbClient.query('ROLLBACK')
      return res.status(404).json({ message: 'Program not found' })
    }

    if (programCheck.rows[0].trainer_id !== req.user.id) {
      await dbClient.query('ROLLBACK')
      return res.status(403).json({ message: 'Not authorized to assign this program' })
    }

    // Verify client_id is a valid user_id
    const clientUserCheck = await dbClient.query(
      'SELECT id FROM users WHERE id = $1',
      [client_id]
    )

    if (clientUserCheck.rows.length === 0) {
      await dbClient.query('ROLLBACK')
      return res.status(400).json({ message: 'Invalid client_id' })
    }

    // Determine start date (use provided or default to today)
    const programStartDate = start_date || new Date().toISOString().split('T')[0]

    // Insert or update assignment
    const assignmentResult = await dbClient.query(
      `INSERT INTO program_assignments (program_id, client_id, assigned_date, start_date, status)
       VALUES ($1, $2, CURRENT_DATE, $3, 'active')
       ON CONFLICT (program_id, client_id) 
       DO UPDATE SET start_date = COALESCE(EXCLUDED.start_date, program_assignments.start_date),
                     status = 'active',
                     updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [id, client_id, programStartDate]
    )

    console.log(`[DEBUG] Assignment successful:`, assignmentResult.rows[0])

    // Get trainer default session preferences including day-specific overrides
    const trainerPrefs = await dbClient.query(
      `SELECT 
        COALESCE(default_session_time, '18:00:00'::TIME) as default_session_time,
        COALESCE(default_session_duration, 60) as default_duration,
        COALESCE(default_session_type, 'in_person') as session_type,
        default_session_location as location,
        day_specific_session_times,
        day_specific_session_durations
       FROM trainers 
       WHERE user_id = $1`,
      [req.user.id]
    )

    const trainerData = trainerPrefs.rows[0] || {
      default_session_time: '18:00:00',
      default_duration: 60,
      session_type: 'in_person',
      location: null,
      day_specific_session_times: null,
      day_specific_session_durations: null
    }

    // Helper function to get session time for a specific day (1=Monday, 7=Sunday)
    const getSessionTimeForDay = (dayNumber) => {
      if (trainerData.day_specific_session_times && trainerData.day_specific_session_times[dayNumber.toString()]) {
        return trainerData.day_specific_session_times[dayNumber.toString()]
      }
      return trainerData.default_session_time
    }

    // Helper function to get session duration for a specific day
    const getSessionDurationForDay = (dayNumber) => {
      if (trainerData.day_specific_session_durations && trainerData.day_specific_session_durations[dayNumber.toString()]) {
        return parseInt(trainerData.day_specific_session_durations[dayNumber.toString()])
      }
      return trainerData.default_duration
    }

    // Fetch all workouts from the program
    const workoutsResult = await dbClient.query(
      `SELECT id, workout_name, week_number, day_number, order_index
       FROM program_workouts
       WHERE program_id = $1
       ORDER BY week_number, day_number, order_index`,
      [id]
    )

    const workouts = workoutsResult.rows
    let sessionsCreated = 0
    let conflictsDetected = 0

    // Create sessions for each workout
    for (const workout of workouts) {
      try {
        // Calculate actual session date
        const sessionDate = calculateSessionDate(programStartDate, workout.week_number, workout.day_number)
        
        // Get day-specific session time and duration (day_number is 1=Monday, 7=Sunday)
        const sessionTime = getSessionTimeForDay(workout.day_number)
        const sessionDuration = getSessionDurationForDay(workout.day_number)
        
        // Check for conflicts (optional - warn but don't block)
        const conflictCheck = await dbClient.query(
          `SELECT id FROM sessions 
           WHERE trainer_id = $1 
           AND session_date = $2 
           AND session_time = $3 
           AND status NOT IN ('cancelled', 'completed')`,
          [req.user.id, sessionDate, sessionTime]
        )

        if (conflictCheck.rows.length > 0) {
          console.log(`[WARN] Conflict detected for ${sessionDate} at ${sessionTime}`)
          conflictsDetected++
          // Continue anyway - trainer can reschedule later
        }

        // Create session (check if it already exists to avoid duplicates)
        const existingSession = await dbClient.query(
          `SELECT id FROM sessions 
           WHERE trainer_id = $1 
           AND client_id = $2 
           AND program_workout_id = $3 
           AND session_date = $4`,
          [req.user.id, client_id, workout.id, sessionDate]
        )

        if (existingSession.rows.length === 0) {
          await dbClient.query(
            `INSERT INTO sessions (
              trainer_id, client_id, program_id, program_workout_id,
              session_date, session_time, duration, session_type, location, status, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled', $10)`,
            [
              req.user.id,
              client_id,
              id,
              workout.id,
              sessionDate,
              sessionTime,
              sessionDuration,
              trainerData.session_type,
              trainerData.location,
              `From ${programCheck.rows[0].name} - Week ${workout.week_number}, Day ${workout.day_number}`
            ]
          )
          sessionsCreated++
        } else {
          console.log(`[INFO] Session already exists for workout ${workout.id} on ${sessionDate}`)
        }
      } catch (error) {
        console.error(`Error creating session for workout ${workout.id}:`, error)
        // Continue with other workouts even if one fails
      }
    }

    await dbClient.query('COMMIT')

    console.log(`[DEBUG] Created ${sessionsCreated} sessions, ${conflictsDetected} conflicts detected`)

    res.json({ 
      message: 'Program assigned successfully',
      sessionsCreated,
      conflictsDetected,
      totalWorkouts: workouts.length
    })
  } catch (error) {
    await dbClient.query('ROLLBACK')
    console.error('Error assigning program:', error)
    res.status(500).json({ message: 'Failed to assign program', error: error.message })
  } finally {
    dbClient.release()
  }
})

// Get assigned clients for a program (trainer only)
router.get('/:id/assigned-clients', requireRole(['trainer']), async (req, res) => {
  try {
    const { id } = req.params

    // Verify program belongs to trainer
    const programCheck = await pool.query(
      'SELECT trainer_id FROM programs WHERE id = $1',
      [id]
    )

    if (programCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Program not found' })
    }

    if (programCheck.rows[0].trainer_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    // Get assigned clients
    const result = await pool.query(
      `SELECT 
        pa.client_id,
        u.id,
        u.name,
        u.email,
        c.id as client_table_id
       FROM program_assignments pa
       JOIN users u ON pa.client_id = u.id
       LEFT JOIN clients c ON u.id = c.user_id
       WHERE pa.program_id = $1 AND pa.status = 'active'
       ORDER BY u.name`,
      [id]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching assigned clients:', error)
    res.status(500).json({ message: 'Failed to fetch assigned clients', error: error.message })
  }
})

// Create sessions from program workout (trainer only)
router.post('/:id/workout/:workoutId/create-sessions', requireRole(['trainer']), async (req, res) => {
  const dbClient = await pool.connect()
  try {
    await dbClient.query('BEGIN')
    
    const { id: programId, workoutId } = req.params
    const { 
      sessionDate, 
      sessionTime, 
      duration, 
      sessionType, 
      location, 
      meetingLink,
      repeat,
      repeatPattern,
      repeatEndDate,
      clientIds
    } = req.body

    // Verify program and workout belong to trainer
    const programCheck = await dbClient.query(
      'SELECT trainer_id, start_date, name FROM programs WHERE id = $1',
      [programId]
    )

    if (programCheck.rows.length === 0) {
      await dbClient.query('ROLLBACK')
      return res.status(404).json({ message: 'Program not found' })
    }

    if (programCheck.rows[0].trainer_id !== req.user.id) {
      await dbClient.query('ROLLBACK')
      return res.status(403).json({ message: 'Not authorized' })
    }

    const workoutCheck = await dbClient.query(
      'SELECT id, week_number, day_number FROM program_workouts WHERE id = $1 AND program_id = $2',
      [workoutId, programId]
    )

    if (workoutCheck.rows.length === 0) {
      await dbClient.query('ROLLBACK')
      return res.status(404).json({ message: 'Workout not found' })
    }

    const workout = workoutCheck.rows[0]
    const programStartDate = programCheck.rows[0].start_date

    if (!programStartDate) {
      await dbClient.query('ROLLBACK')
      return res.status(400).json({ message: 'Program start date is required to create sessions' })
    }

    // Generate session dates
    let sessionDates = [sessionDate]
    
    if (repeat && repeatEndDate) {
      const start = new Date(sessionDate)
      const end = new Date(repeatEndDate)
      const dates = []
      let current = new Date(start)
      
      while (current <= end) {
        dates.push(new Date(current).toISOString().split('T')[0])
        
        if (repeatPattern === 'weekly') {
          current.setDate(current.getDate() + 7)
        } else if (repeatPattern === 'biweekly') {
          current.setDate(current.getDate() + 14)
        } else if (repeatPattern === 'monthly') {
          current.setMonth(current.getMonth() + 1)
        } else {
          current.setDate(current.getDate() + 7) // Default to weekly
        }
      }
      
      sessionDates = dates
    }

    // Get trainer defaults for day-specific times
    const trainerPrefs = await dbClient.query(
      `SELECT 
        COALESCE(default_session_time, '18:00:00'::TIME) as default_session_time,
        COALESCE(default_session_duration, 60) as default_duration,
        day_specific_session_times,
        day_specific_session_durations
       FROM trainers 
       WHERE user_id = $1`,
      [req.user.id]
    )

    const trainerData = trainerPrefs.rows[0] || {
      default_session_time: '18:00:00',
      default_duration: 60,
      day_specific_session_times: null,
      day_specific_session_durations: null
    }

    // Get session time for this day (use provided or day-specific or default)
    const getSessionTime = () => {
      if (sessionTime) return sessionTime
      if (trainerData.day_specific_session_times?.[workout.day_number.toString()]) {
        return trainerData.day_specific_session_times[workout.day_number.toString()]
      }
      return trainerData.default_session_time
    }

    const getSessionDuration = () => {
      if (duration) return duration
      if (trainerData.day_specific_session_durations?.[workout.day_number.toString()]) {
        return parseInt(trainerData.day_specific_session_durations[workout.day_number.toString()])
      }
      return trainerData.default_duration
    }

    const finalSessionTime = getSessionTime()
    const finalDuration = getSessionDuration()

    let sessionsCreated = 0
    const createdSessions = []

    // Create sessions for each client and date
    for (const clientId of clientIds) {
      for (const date of sessionDates) {
        // Check if session already exists
        const existing = await dbClient.query(
          `SELECT id FROM sessions 
           WHERE trainer_id = $1 
           AND client_id = $2 
           AND program_workout_id = $3 
           AND session_date = $4`,
          [req.user.id, clientId, workoutId, date]
        )

        if (existing.rows.length === 0) {
          const result = await dbClient.query(
            `INSERT INTO sessions (
              trainer_id, client_id, program_id, program_workout_id,
              session_date, session_time, duration, session_type, location, meeting_link, status, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'scheduled', $11)
            RETURNING id`,
            [
              req.user.id,
              clientId,
              programId,
              workoutId,
              date,
              finalSessionTime,
              finalDuration,
              sessionType || 'in_person',
              location || null,
              meetingLink || null,
              `From ${programCheck.rows[0].name || 'Program'} - Week ${workout.week_number}, Day ${workout.day_number}`
            ]
          )
          sessionsCreated++
          createdSessions.push(result.rows[0])
        }
      }
    }

    await dbClient.query('COMMIT')

    res.json({
      message: 'Sessions created successfully',
      sessionsCreated,
      totalSessions: sessionDates.length * clientIds.length
    })
  } catch (error) {
    await dbClient.query('ROLLBACK')
    console.error('Error creating sessions:', error)
    res.status(500).json({ message: 'Failed to create sessions', error: error.message })
  } finally {
    dbClient.release()
  }
})

// Complete a program workout (client only)
router.post('/workout/:workoutId/complete', requireRole(['client']), async (req, res) => {
  try {
    const { workoutId } = req.params
    const { exercises_completed, notes, duration } = req.body

    // Verify workout exists and client has access
    const workoutCheck = await pool.query(
      `SELECT pw.id, p.client_id, pa.client_id as assigned_client_id
       FROM program_workouts pw
       JOIN programs p ON pw.program_id = p.id
       LEFT JOIN program_assignments pa ON p.id = pa.program_id AND pa.status = 'active'
       WHERE pw.id = $1 AND (p.client_id = $2 OR pa.client_id = $2)`,
      [workoutId, req.user.id]
    )

    if (workoutCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Workout not found or not assigned to you' })
    }

    // Record completion
    await pool.query(
      `INSERT INTO program_workout_completions 
       (program_workout_id, client_id, completed_date, exercises_completed, notes, duration)
       VALUES ($1, $2, CURRENT_DATE, $3, $4, $5)`,
      [workoutId, req.user.id, JSON.stringify(exercises_completed || {}), notes || null, duration || null]
    )

    res.json({ message: 'Workout completed successfully' })
  } catch (error) {
    console.error('Error completing workout:', error)
    res.status(500).json({ message: 'Failed to complete workout', error: error.message })
  }
})

// Get all program templates
router.get('/templates/all', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pt.*,
              COUNT(DISTINCT tw.id) as workout_count
       FROM program_templates pt
       LEFT JOIN template_workouts tw ON pt.id = tw.template_id
       WHERE pt.is_system_template = true OR pt.created_by = $1
       GROUP BY pt.id
       ORDER BY pt.is_system_template DESC, pt.created_at DESC`,
      [req.user.id]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching templates:', error)
    res.status(500).json({ message: 'Failed to fetch templates' })
  }
})

// Get a specific template with workouts
router.get('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params

    const templateResult = await pool.query(
      `SELECT * FROM program_templates WHERE id = $1`,
      [id]
    )

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ message: 'Template not found' })
    }

    const template = templateResult.rows[0]

    // Get workouts
    const workoutsResult = await pool.query(
      `SELECT tw.*,
              json_agg(
                json_build_object(
                  'id', twe.id,
                  'exercise_id', twe.exercise_id,
                  'exercise_name', twe.exercise_name,
                  'exercise_type', twe.exercise_type,
                  'sets', twe.sets,
                  'reps', twe.reps,
                  'weight', twe.weight,
                  'duration', twe.duration,
                  'rest', twe.rest,
                  'tempo', twe.tempo,
                  'rpe', twe.rpe,
                  'notes', twe.notes,
                  'order_index', twe.order_index
                ) ORDER BY twe.order_index
              ) as exercises
       FROM template_workouts tw
       LEFT JOIN template_workout_exercises twe ON tw.id = twe.template_workout_id
       WHERE tw.template_id = $1
       GROUP BY tw.id
       ORDER BY tw.week_number, tw.day_number, tw.order_index`,
      [id]
    )

    template.workouts = workoutsResult.rows.map(w => ({
      ...w,
      exercises: w.exercises[0] ? w.exercises : []
    }))

    res.json(template)
  } catch (error) {
    console.error('Error fetching template:', error)
    res.status(500).json({ message: 'Failed to fetch template' })
  }
})

// Get exercises (searchable/filterable)
router.get('/exercises/search', async (req, res) => {
  try {
    const { search, muscle_group, movement_pattern, equipment, difficulty } = req.query

    let query = 'SELECT * FROM exercises WHERE 1=1'
    const params = []
    let paramCount = 1

    if (search) {
      query += ` AND name ILIKE $${paramCount++}`
      params.push(`%${search}%`)
    }

    if (muscle_group) {
      query += ` AND primary_muscle_group = $${paramCount++}`
      params.push(muscle_group)
    }

    if (movement_pattern) {
      query += ` AND movement_pattern = $${paramCount++}`
      params.push(movement_pattern)
    }

    if (equipment) {
      query += ` AND equipment_required = $${paramCount++}`
      params.push(equipment)
    }

    if (difficulty) {
      query += ` AND difficulty_level = $${paramCount++}`
      params.push(difficulty)
    }

    query += ' ORDER BY name LIMIT 100'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Error searching exercises:', error)
    res.status(500).json({ message: 'Failed to search exercises' })
  }
})

// Get exercise alternatives/substitutions
router.get('/exercises/:exerciseName/substitutions', async (req, res) => {
  try {
    const { exerciseName } = req.params
    const { equipment, difficulty } = req.query

    // First, get the exercise
    const exerciseResult = await pool.query(
      `SELECT * FROM exercises WHERE name = $1`,
      [exerciseName]
    )

    if (exerciseResult.rows.length === 0) {
      return res.status(404).json({ message: 'Exercise not found' })
    }

    const exercise = exerciseResult.rows[0]

    // Find alternatives with same movement pattern
    let query = `
      SELECT * FROM exercises 
      WHERE movement_pattern = $1 
        AND id != $2
        AND difficulty_level <= $3
    `
    const params = [exercise.movement_pattern, exercise.id, exercise.difficulty_level === 'beginner' ? 'beginner' : exercise.difficulty_level === 'intermediate' ? 'intermediate' : 'advanced']
    let paramCount = 4

    if (equipment) {
      query += ` AND equipment_required = $${paramCount++}`
      params.push(equipment)
    }

    query += ' ORDER BY difficulty_level, name LIMIT 10'

    const alternatives = await pool.query(query, params)

    res.json({
      original: exercise,
      alternatives: alternatives.rows
    })
  } catch (error) {
    console.error('Error finding substitutions:', error)
    res.status(500).json({ message: 'Failed to find substitutions' })
  }
})

// Recommend program template for a client
router.post('/recommend', requireRole(['trainer']), async (req, res) => {
  try {
    const { client_id } = req.body

    // Get client profile
    const clientResult = await pool.query(
      `SELECT c.*, u.name, u.email
       FROM clients c
       JOIN users u ON c.user_id = u.id
       WHERE c.user_id = $1`,
      [client_id]
    )

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    const client = clientResult.rows[0]

    // Map client data to template criteria
    const experienceLevel = client.training_experience || 'beginner'
    const goal = client.primary_goal || 'general_fitness'
    const daysPerWeek = client.training_days_per_week || 3
    const equipment = client.equipment_access || 'full_gym'
    const sessionDuration = client.session_duration_minutes || 60

    // Score templates based on match
    const templatesResult = await pool.query(
      `SELECT pt.*,
              COUNT(DISTINCT tw.id) as workout_count
       FROM program_templates pt
       LEFT JOIN template_workouts tw ON pt.id = tw.template_id
       WHERE pt.is_system_template = true
       GROUP BY pt.id`
    )

    const scoredTemplates = templatesResult.rows.map(template => {
      let score = 0

      // Experience level match (high weight)
      if (template.target_experience_level === experienceLevel || template.target_experience_level === 'all') {
        score += 10
      } else if (
        (experienceLevel === 'beginner' && template.target_experience_level === 'intermediate') ||
        (experienceLevel === 'intermediate' && template.target_experience_level === 'advanced')
      ) {
        score += 5
      }

      // Goal match (high weight)
      if (template.target_goal === goal) {
        score += 10
      }

      // Days per week match
      if (template.target_days_per_week === daysPerWeek) {
        score += 8
      } else if (Math.abs(template.target_days_per_week - daysPerWeek) <= 1) {
        score += 4
      }

      // Equipment match
      if (template.target_equipment === equipment) {
        score += 8
      } else if (
        (equipment === 'full_gym' && template.target_equipment !== 'bodyweight_only') ||
        (equipment === 'dumbbells_only' && ['dumbbells_only', 'home_gym', 'full_gym'].includes(template.target_equipment))
      ) {
        score += 4
      }

      // Session duration match
      if (template.target_session_duration === sessionDuration) {
        score += 5
      } else if (Math.abs(template.target_session_duration - sessionDuration) <= 15) {
        score += 2
      }

      return { ...template, match_score: score }
    })

    // Sort by score and return top 3
    const recommendations = scoredTemplates
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 3)

    res.json({
      client_profile: {
        experience_level: experienceLevel,
        goal: goal,
        days_per_week: daysPerWeek,
        equipment: equipment,
        session_duration: sessionDuration
      },
      recommendations
    })
  } catch (error) {
    console.error('Error recommending programs:', error)
    res.status(500).json({ message: 'Failed to recommend programs', error: error.message })
  }
})

// Create program from template
router.post('/from-template/:templateId', requireRole(['trainer']), async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { templateId } = req.params
    const { client_id, name, description, customizations } = req.body

    // Get template
    const templateResult = await client.query(
      `SELECT * FROM program_templates WHERE id = $1`,
      [templateId]
    )

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ message: 'Template not found' })
    }

    const template = templateResult.rows[0]

    // Create program from template
    const programResult = await client.query(
      `INSERT INTO programs (trainer_id, client_id, name, description, split_type, duration_weeks, is_template)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user.id,
        client_id || null,
        name || template.name,
        description || template.description,
        template.split_type,
        template.duration_weeks,
        false
      ]
    )

    const program = programResult.rows[0]

    // Get template workouts
    const templateWorkoutsResult = await client.query(
      `SELECT tw.*,
              json_agg(
                json_build_object(
                  'exercise_id', twe.exercise_id,
                  'exercise_name', twe.exercise_name,
                  'exercise_type', twe.exercise_type,
                  'sets', twe.sets,
                  'reps', twe.reps,
                  'weight', twe.weight,
                  'duration', twe.duration,
                  'rest', twe.rest,
                  'tempo', twe.tempo,
                  'rpe', twe.rpe,
                  'notes', twe.notes,
                  'order_index', twe.order_index
                ) ORDER BY twe.order_index
              ) as exercises
       FROM template_workouts tw
       LEFT JOIN template_workout_exercises twe ON tw.id = twe.template_workout_id
       WHERE tw.template_id = $1
       GROUP BY tw.id
       ORDER BY tw.week_number, tw.day_number`,
      [templateId]
    )

    // Create workouts from template
    for (const templateWorkout of templateWorkoutsResult.rows) {
      const workoutResult = await client.query(
        `INSERT INTO program_workouts (program_id, workout_name, day_number, week_number, order_index)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          program.id,
          templateWorkout.workout_name,
          templateWorkout.day_number,
          templateWorkout.week_number,
          templateWorkout.order_index
        ]
      )

      const programWorkout = workoutResult.rows[0]

      // Add exercises
      const exercises = templateWorkout.exercises[0] ? templateWorkout.exercises : []
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i]
        await client.query(
          `INSERT INTO program_workout_exercises 
           (program_workout_id, exercise_name, exercise_type, sets, reps, weight, duration, rest, tempo, notes, order_index)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            programWorkout.id,
            ex.exercise_name,
            ex.exercise_type || 'REGULAR',
            ex.sets,
            ex.reps,
            ex.weight,
            ex.duration,
            ex.rest,
            ex.tempo,
            ex.notes,
            ex.order_index !== undefined ? ex.order_index : i
          ]
        )
      }
    }

    await client.query('COMMIT')

    // Fetch complete program
    const completeProgram = await pool.query(
      `SELECT p.*,
              json_agg(
                json_build_object(
                  'id', pw.id,
                  'workout_name', pw.workout_name,
                  'day_number', pw.day_number,
                  'week_number', pw.week_number,
                  'order_index', pw.order_index,
                  'exercises', (
                    SELECT json_agg(
                      json_build_object(
                        'id', pwe.id,
                        'exercise_name', pwe.exercise_name,
                        'exercise_type', pwe.exercise_type,
                        'sets', pwe.sets,
                        'reps', pwe.reps,
                        'weight', pwe.weight,
                        'duration', pwe.duration,
                        'rest', pwe.rest,
                        'tempo', pwe.tempo,
                        'notes', pwe.notes,
                        'order_index', pwe.order_index
                      ) ORDER BY pwe.order_index
                    )
                    FROM program_workout_exercises pwe
                    WHERE pwe.program_workout_id = pw.id
                  )
                ) ORDER BY pw.week_number, pw.day_number, pw.order_index
              ) as workouts
       FROM programs p
       LEFT JOIN program_workouts pw ON p.id = pw.program_id
       WHERE p.id = $1
       GROUP BY p.id`,
      [program.id]
    )

    res.status(201).json(completeProgram.rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error creating program from template:', error)
    res.status(500).json({ message: 'Failed to create program from template', error: error.message })
  } finally {
    client.release()
  }
})

export default router

