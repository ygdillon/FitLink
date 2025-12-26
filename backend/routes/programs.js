import express from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { pool } from '../config/database.js'

const router = express.Router()

router.use(authenticate)

// Get all programs for a trainer (templates and assigned)
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

// Get programs assigned to a client
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

// Create a new program (trainer only)
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
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [name, description, split_type, duration_weeks, id]
    )

    // If workouts are provided, update them
    if (workouts && Array.isArray(workouts)) {
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
          [id, workout_name, day_number || 1, week_number || 1, workout.order_index || 0]
        )

        const programWorkout = workoutResult.rows[0]

        // Add exercises
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

    // Fetch updated program
    const updatedProgram = await pool.query(
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

    res.json(updatedProgram.rows[0])
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

// Assign program to client
router.post('/:id/assign', requireRole(['trainer']), async (req, res) => {
  try {
    const { id } = req.params
    const { client_id, start_date } = req.body

    // Verify program belongs to trainer
    const programCheck = await pool.query(
      'SELECT trainer_id, is_template FROM programs WHERE id = $1',
      [id]
    )

    if (programCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Program not found' })
    }

    if (programCheck.rows[0].trainer_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to assign this program' })
    }

    // Create a copy of the program for the client
    const templateProgram = programCheck.rows[0]

    // Insert or update assignment
    await pool.query(
      `INSERT INTO program_assignments (program_id, client_id, assigned_date, start_date, status)
       VALUES ($1, $2, CURRENT_DATE, $3, 'active')
       ON CONFLICT (program_id, client_id) 
       DO UPDATE SET start_date = COALESCE(EXCLUDED.start_date, program_assignments.start_date),
                     status = 'active',
                     updated_at = CURRENT_TIMESTAMP`,
      [id, client_id, start_date || null]
    )

    res.json({ message: 'Program assigned successfully' })
  } catch (error) {
    console.error('Error assigning program:', error)
    res.status(500).json({ message: 'Failed to assign program', error: error.message })
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

export default router

