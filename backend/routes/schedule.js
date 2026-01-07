import express from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { pool } from '../config/database.js'

const router = express.Router()

// All routes require authentication
router.use(authenticate)

// Get trainer's upcoming sessions
router.get('/trainer/upcoming', requireRole(['trainer']), async (req, res) => {
  try {
    const { limit = 100, startDate, endDate } = req.query
    
    let query = `
      SELECT s.*, 
             u.name as client_name, u.email as client_email,
             c.id as client_profile_id
      FROM sessions s
      JOIN users u ON s.client_id = u.id
      LEFT JOIN clients c ON c.user_id = u.id AND c.trainer_id = $1
      WHERE s.trainer_id = $1
        AND s.status IN ('scheduled', 'confirmed')
    `
    const params = [req.user.id]
    
    if (startDate) {
      query += ' AND s.session_date >= $' + (params.length + 1)
      params.push(startDate)
    } else {
      query += ' AND s.session_date >= CURRENT_DATE'
    }
    
    if (endDate) {
      query += ' AND s.session_date <= $' + (params.length + 1)
      params.push(endDate)
    }
    
    query += ' ORDER BY s.session_date ASC, s.session_time ASC'
    
    // Only apply limit if specified and reasonable (max 1000)
    if (limit && parseInt(limit) > 0 && parseInt(limit) <= 1000) {
      query += ' LIMIT $' + (params.length + 1)
      params.push(parseInt(limit))
    }
    
    const result = await pool.query(query, params)
    // Log for debugging
    if (result.rows.length > 0) {
      console.log(`[Schedule API] Fetched ${result.rows.length} sessions for trainer ${req.user.id} (user: ${req.user.email})`)
    } else {
      console.log(`[Schedule API] No sessions found for trainer ${req.user.id} (user: ${req.user.email})`)
    }
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching upcoming sessions:', error)
    res.status(500).json({ message: 'Failed to fetch upcoming sessions' })
  }
})

// Check if client has completed a workout today
router.get('/client/today-completed', requireRole(['client']), async (req, res) => {
  try {
    // Use CURRENT_DATE from database to ensure timezone consistency
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    
    // Check for completed sessions today (using DATE() to handle timestamp comparisons)
    const sessionsResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM sessions
       WHERE client_id = $1
         AND DATE(session_date) = CURRENT_DATE
         AND status = 'completed'`,
      [req.user.id]
    )
    
    const hasCompletedSession = parseInt(sessionsResult.rows[0].count) > 0
    
    // Also check program_workout_completions for today
    const completionsResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM program_workout_completions
       WHERE client_id = $1
         AND DATE(completed_date) = CURRENT_DATE`,
      [req.user.id]
    )
    
    const hasCompletedWorkout = parseInt(completionsResult.rows[0].count) > 0
    
    console.log(`[Today Completed Check] Client ${req.user.id}: sessions=${hasCompletedSession}, workouts=${hasCompletedWorkout}, total=${hasCompletedSession || hasCompletedWorkout}`)
    
    res.json({ 
      hasCompleted: hasCompletedSession || hasCompletedWorkout,
      hasCompletedSession,
      hasCompletedWorkout
    })
  } catch (error) {
    console.error('Error checking today\'s completed workouts:', error)
    res.status(500).json({ message: 'Failed to check completed workouts', hasCompleted: false })
  }
})

// Get client's upcoming sessions
router.get('/client/upcoming', requireRole(['client']), async (req, res) => {
  try {
    console.log(`[Schedule API] Fetching client sessions for user_id: ${req.user.id}, email: ${req.user.email}`)
    
    // First, let's check if there are ANY sessions for this client (for debugging)
    const allSessionsCheck = await pool.query(
      `SELECT id, client_id, session_date, status, program_workout_id 
       FROM sessions 
       WHERE client_id = $1 
       LIMIT 5`,
      [req.user.id]
    )
    console.log(`[Schedule API] Total sessions for client ${req.user.id} (any status/date):`, allSessionsCheck.rows.length)
    if (allSessionsCheck.rows.length > 0) {
      console.log(`[Schedule API] Sample sessions:`, allSessionsCheck.rows.map(s => ({
        id: s.id,
        client_id: s.client_id,
        session_date: s.session_date,
        status: s.status,
        program_workout_id: s.program_workout_id
      })))
    }
    
    const result = await pool.query(
      `SELECT s.*, 
              u.name as trainer_name,
              pw.workout_name,
              p.name as program_name
       FROM sessions s
       JOIN users u ON s.trainer_id = u.id
       LEFT JOIN program_workouts pw ON s.program_workout_id = pw.id
       LEFT JOIN programs p ON s.program_id = p.id
       WHERE s.client_id = $1
         AND s.status IN ('scheduled', 'confirmed')
         AND s.session_date >= CURRENT_DATE
         AND (s.program_id IS NOT NULL OR s.program_workout_id IS NOT NULL)
       ORDER BY s.session_date ASC, s.session_time ASC
       LIMIT 20`,
      [req.user.id]
    )
    console.log(`[Schedule API] Found ${result.rows.length} upcoming program sessions for client ${req.user.id}`)
    if (result.rows.length > 0) {
      console.log(`[Schedule API] First session:`, {
        id: result.rows[0].id,
        session_date: result.rows[0].session_date,
        session_time: result.rows[0].session_time,
        status: result.rows[0].status,
        program_workout_id: result.rows[0].program_workout_id,
        program_id: result.rows[0].program_id,
        workout_name: result.rows[0].workout_name,
        program_name: result.rows[0].program_name
      })
    } else {
      console.log(`[Schedule API] No upcoming program sessions found. Checking why...`)
      // Check if sessions exist but are filtered out
      const filteredCheck = await pool.query(
        `SELECT id, session_date, status, program_id, program_workout_id,
                CASE WHEN status NOT IN ('scheduled', 'confirmed') THEN 'wrong_status' ELSE 'ok' END as status_check,
                CASE WHEN session_date < CURRENT_DATE THEN 'past_date' ELSE 'ok' END as date_check,
                CASE WHEN program_id IS NULL AND program_workout_id IS NULL THEN 'not_from_program' ELSE 'ok' END as program_check
         FROM sessions 
         WHERE client_id = $1 
         LIMIT 10`,
        [req.user.id]
      )
      if (filteredCheck.rows.length > 0) {
        console.log(`[Schedule API] Sessions exist but filtered:`, filteredCheck.rows.map(s => ({
          id: s.id,
          session_date: s.session_date,
          status: s.status,
          program_id: s.program_id,
          program_workout_id: s.program_workout_id,
          status_check: s.status_check,
          date_check: s.date_check,
          program_check: s.program_check
        })))
      }
    }
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching client sessions:', error)
    res.status(500).json({ message: 'Failed to fetch sessions', error: error.message })
  }
})

// Get sessions for a specific client (trainer view)
router.get('/trainer/clients/:clientId/sessions', requireRole(['trainer']), async (req, res) => {
  try {
    const { clientId } = req.params
    const { startDate, endDate } = req.query
    
    // Verify client belongs to trainer
    const clientCheck = await pool.query(
      'SELECT user_id FROM clients WHERE id = $1 AND trainer_id = $2',
      [clientId, req.user.id]
    )
    
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }
    
    const clientUserId = clientCheck.rows[0].user_id
    
    let query = `
      SELECT s.*
      FROM sessions s
      WHERE s.client_id = $1 AND s.trainer_id = $2
    `
    const params = [clientUserId, req.user.id]
    
    if (startDate && endDate) {
      query += ' AND s.session_date BETWEEN $3 AND $4'
      params.push(startDate, endDate)
    }
    
    query += ' ORDER BY s.session_date ASC, s.session_time ASC'
    
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching client sessions:', error)
    res.status(500).json({ message: 'Failed to fetch client sessions' })
  }
})

// Helper function to generate recurring session dates
// Helper function to convert time string (HH:MM) to minutes from midnight
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

// Helper function to check if two time ranges overlap
// Returns true if the new session overlaps with an existing session
function checkTimeOverlap(newStartTime, newDuration, existingStartTime, existingDuration) {
  const newStart = timeToMinutes(newStartTime)
  const newEnd = newStart + (newDuration || 60)
  const existingStart = timeToMinutes(existingStartTime)
  const existingEnd = existingStart + (existingDuration || 60)
  
  // Two ranges overlap if: newStart < existingEnd AND newEnd > existingStart
  return newStart < existingEnd && newEnd > existingStart
}

function generateRecurringDates(startDate, endDate, dayOfWeek, pattern = 'weekly') {
  const dates = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  // Set end date to end of day to include the full day
  end.setHours(23, 59, 59, 999)
  
  // Start from the selected start date (first session)
  let current = new Date(start)
  
  // Generate all dates until end date
  while (current <= end) {
    dates.push(new Date(current))
    
    if (pattern === 'weekly') {
      current.setDate(current.getDate() + 7)
    } else if (pattern === 'biweekly') {
      current.setDate(current.getDate() + 14)
    } else if (pattern === 'monthly') {
      current.setMonth(current.getMonth() + 1)
    } else {
      // Default to weekly if pattern is unknown
      current.setDate(current.getDate() + 7)
    }
  }
  
  return dates
}

// Create a new session (single or recurring)
router.post('/trainer/sessions', requireRole(['trainer']), async (req, res) => {
  try {
    const {
      clientId,
      sessionDate,
      sessionTime,
      duration,
      sessionType,
      location,
      meetingLink,
      notes,
      isRecurring,
      recurringPattern,
      recurringEndDate,
      dayOfWeek
    } = req.body
    
    if (!clientId || !sessionDate || !sessionTime) {
      return res.status(400).json({ message: 'Client ID, date, and time are required' })
    }
    
    // Verify client belongs to trainer
    const clientCheck = await pool.query(
      'SELECT user_id FROM clients WHERE id = $1 AND trainer_id = $2',
      [clientId, req.user.id]
    )
    
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }
    
    const clientUserId = clientCheck.rows[0].user_id
    
    const dbClient = await pool.connect()
    try {
      await dbClient.query('BEGIN')
      
      if (isRecurring && recurringEndDate && dayOfWeek !== undefined) {
        // Create recurring sessions
        const dates = generateRecurringDates(sessionDate, recurringEndDate, dayOfWeek, recurringPattern || 'weekly')
        
        if (dates.length === 0) {
          return res.status(400).json({ message: 'No valid dates found for recurring pattern' })
        }
        
        // Check for conflicts on the first date before creating any sessions
        const firstDateStr = dates[0].toISOString().split('T')[0]
        const sessionDuration = duration || 60
        const existingSessionsFirst = await dbClient.query(
          `SELECT id, session_time, duration, client_id 
           FROM sessions 
           WHERE trainer_id = $1 
             AND session_date = $2 
             AND status IN ('scheduled', 'confirmed')`,
          [req.user.id, firstDateStr]
        )
        
        for (const existing of existingSessionsFirst.rows) {
          if (checkTimeOverlap(sessionTime, sessionDuration, existing.session_time, existing.duration)) {
            await dbClient.query('ROLLBACK')
            const clientInfo = await dbClient.query(
              'SELECT name FROM users WHERE id = $1',
              [existing.client_id]
            )
            const clientName = clientInfo.rows[0]?.name || 'another client'
            return res.status(400).json({ 
              message: `The first session overlaps with an existing session for ${clientName} at ${existing.session_time} on ${firstDateStr}` 
            })
          }
        }
        
        // Create parent session (first one)
        const parentResult = await dbClient.query(
          `INSERT INTO sessions (
            trainer_id, client_id, session_date, session_time,
            duration, session_type, location, meeting_link, notes, status,
            is_recurring, recurring_pattern, recurring_end_date, day_of_week
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled', true, $10, $11, $12)
          RETURNING *`,
          [
            req.user.id,
            clientUserId,
            dates[0].toISOString().split('T')[0],
            sessionTime,
            duration || 60,
            sessionType || 'in_person',
            location || null,
            meetingLink || null,
            notes || null,
            recurringPattern || 'weekly',
            recurringEndDate,
            dayOfWeek
          ]
        )
        
        const parentId = parentResult.rows[0].id
        const createdSessions = [parentResult.rows[0]]
        
        // Create child sessions for remaining dates
        // sessionDuration already declared above on line 226
        const conflictDates = []
        for (let i = 1; i < dates.length; i++) {
          const dateStr = dates[i].toISOString().split('T')[0]
          
          // Check for overlapping time conflicts
          const existingSessions = await dbClient.query(
            `SELECT id, session_time, duration 
             FROM sessions 
             WHERE trainer_id = $1 
               AND session_date = $2 
               AND status IN ('scheduled', 'confirmed')`,
            [req.user.id, dateStr]
          )
          
          // Check if this session overlaps with any existing session
          let hasConflict = false
          for (const existing of existingSessions.rows) {
            if (checkTimeOverlap(sessionTime, sessionDuration, existing.session_time, existing.duration)) {
              hasConflict = true
              conflictDates.push(dateStr)
              break
            }
          }
          
          if (!hasConflict) {
            const childResult = await dbClient.query(
              `INSERT INTO sessions (
                trainer_id, client_id, session_date, session_time,
                duration, session_type, location, meeting_link, notes, status,
                is_recurring, recurring_pattern, recurring_parent_id, day_of_week
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled', true, $10, $11, $12)
              RETURNING *`,
              [
                req.user.id,
                clientUserId,
                dateStr,
                sessionTime,
                duration || 60,
                sessionType || 'in_person',
                location || null,
                meetingLink || null,
                notes || null,
                recurringPattern || 'weekly',
                parentId,
                dayOfWeek
              ]
            )
            createdSessions.push(childResult.rows[0])
          }
        }
        
        await dbClient.query('COMMIT')
        let message = `Created ${createdSessions.length} recurring session${createdSessions.length !== 1 ? 's' : ''}`
        if (conflictDates.length > 0) {
          message += `. ${conflictDates.length} date${conflictDates.length !== 1 ? 's' : ''} skipped due to conflicts: ${conflictDates.slice(0, 3).join(', ')}${conflictDates.length > 3 ? '...' : ''}`
        }
        res.status(201).json({
          message,
          sessions: createdSessions,
          parentId,
          conflicts: conflictDates.length > 0 ? conflictDates : undefined
        })
      } else {
        // Create single session
        // Check for overlapping time conflicts based on start time and duration
        const existingSessions = await dbClient.query(
          `SELECT id, session_time, duration, client_id 
           FROM sessions 
           WHERE trainer_id = $1 
             AND session_date = $2 
             AND status IN ('scheduled', 'confirmed')`,
          [req.user.id, sessionDate]
        )
        
        // Check if new session overlaps with any existing session
        const sessionDuration = duration || 60
        for (const existing of existingSessions.rows) {
          if (checkTimeOverlap(sessionTime, sessionDuration, existing.session_time, existing.duration)) {
          await dbClient.query('ROLLBACK')
            // Get client name for better error message
            const clientInfo = await dbClient.query(
              'SELECT name FROM users WHERE id = $1',
              [existing.client_id]
            )
            const clientName = clientInfo.rows[0]?.name || 'another client'
            return res.status(400).json({ 
              message: `This session overlaps with an existing session for ${clientName} at ${existing.session_time}` 
            })
          }
        }
        
        const result = await dbClient.query(
          `INSERT INTO sessions (
            trainer_id, client_id, session_date, session_time,
            duration, session_type, location, meeting_link, notes, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled')
          RETURNING *`,
          [
            req.user.id,
            clientUserId,
            sessionDate,
            sessionTime,
            duration || 60,
            sessionType || 'in_person',
            location || null,
            meetingLink || null,
            notes || null
          ]
        )
        
        await dbClient.query('COMMIT')
        res.status(201).json(result.rows[0])
      }
    } catch (error) {
      await dbClient.query('ROLLBACK')
      throw error
    } finally {
      dbClient.release()
    }
  } catch (error) {
    console.error('Error creating session:', error)
    res.status(500).json({ message: 'Failed to create session' })
  }
})

// Update session
router.put('/trainer/sessions/:sessionId', requireRole(['trainer']), async (req, res) => {
  try {
    const { sessionId } = req.params
    const {
      sessionDate,
      sessionTime,
      duration,
      sessionType,
      location,
      meetingLink,
      notes,
      status
    } = req.body
    
    // Verify session belongs to trainer and get current session data
    const sessionCheck = await pool.query(
      'SELECT id, session_date, session_time, duration FROM sessions WHERE id = $1 AND trainer_id = $2',
      [sessionId, req.user.id]
    )
    
    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }
    
    const currentSession = sessionCheck.rows[0]
    const finalDate = sessionDate !== undefined ? sessionDate : currentSession.session_date
    const finalTime = sessionTime !== undefined ? sessionTime : currentSession.session_time
    const finalDuration = duration !== undefined ? duration : currentSession.duration
    
    // Check for overlapping conflicts if date, time, or duration is being changed
    if (sessionDate !== undefined || sessionTime !== undefined || duration !== undefined) {
      const existingSessions = await pool.query(
        `SELECT id, session_time, duration, client_id 
         FROM sessions 
         WHERE trainer_id = $1 
           AND session_date = $2 
           AND id != $3
           AND status IN ('scheduled', 'confirmed')`,
        [req.user.id, finalDate, sessionId]
      )
      
      // Check if updated session overlaps with any existing session
      for (const existing of existingSessions.rows) {
        if (checkTimeOverlap(finalTime, finalDuration, existing.session_time, existing.duration)) {
          const clientInfo = await pool.query(
            'SELECT name FROM users WHERE id = $1',
            [existing.client_id]
          )
          const clientName = clientInfo.rows[0]?.name || 'another client'
          return res.status(400).json({ 
            message: `This session overlaps with an existing session for ${clientName} at ${existing.session_time}` 
          })
        }
      }
    }
    
    // Build update query dynamically
    const updates = []
    const values = []
    let paramCount = 1
    
    if (sessionDate !== undefined) {
      updates.push(`session_date = $${paramCount++}`)
      values.push(sessionDate)
    }
    if (sessionTime !== undefined) {
      updates.push(`session_time = $${paramCount++}`)
      values.push(sessionTime)
    }
    if (duration !== undefined) {
      updates.push(`duration = $${paramCount++}`)
      values.push(duration)
    }
    if (sessionType !== undefined) {
      updates.push(`session_type = $${paramCount++}`)
      values.push(sessionType)
    }
    if (location !== undefined) {
      updates.push(`location = $${paramCount++}`)
      values.push(location)
    }
    if (meetingLink !== undefined) {
      updates.push(`meeting_link = $${paramCount++}`)
      values.push(meetingLink)
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`)
      values.push(notes)
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`)
      values.push(status)
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' })
    }
    
    values.push(sessionId, req.user.id)
    
    const result = await pool.query(
      `UPDATE sessions 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount++} AND trainer_id = $${paramCount++}
       RETURNING *`,
      values
    )
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating session:', error)
    res.status(500).json({ message: 'Failed to update session' })
  }
})

// Cancel session
router.post('/trainer/sessions/:sessionId/cancel', requireRole(['trainer']), async (req, res) => {
  try {
    const { sessionId } = req.params
    const { reason } = req.body
    
    // Verify session belongs to trainer
    const session = await pool.query(
      'SELECT * FROM sessions WHERE id = $1 AND trainer_id = $2',
      [sessionId, req.user.id]
    )
    
    if (session.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }
    
    // Record cancellation
    await pool.query(
      `INSERT INTO session_changes (session_id, change_type, original_date, original_time, reason, requested_by)
       VALUES ($1, 'cancelled', $2, $3, $4, $5)`,
      [sessionId, session.rows[0].session_date, session.rows[0].session_time, reason || null, req.user.id]
    )
    
    // Update session status
    const result = await pool.query(
      `UPDATE sessions SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [sessionId]
    )
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error cancelling session:', error)
    res.status(500).json({ message: 'Failed to cancel session' })
  }
})

// Get sessions for a specific workout (trainer only)
router.get('/trainer/workout/:workoutId/sessions', requireRole(['trainer']), async (req, res) => {
  try {
    const { workoutId } = req.params
    
    const result = await pool.query(
      `SELECT s.*, u.name as client_name
       FROM sessions s
       JOIN users u ON s.client_id = u.id
       WHERE s.program_workout_id = $1 
         AND s.trainer_id = $2
         AND s.status IN ('scheduled', 'confirmed')
       ORDER BY s.session_date ASC, s.session_time ASC`,
      [workoutId, req.user.id]
    )
    
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching workout sessions:', error)
    res.status(500).json({ message: 'Failed to fetch workout sessions' })
  }
})

// Update sessions for a specific workout (trainer only)
router.put('/trainer/workout/:workoutId/sessions', requireRole(['trainer']), async (req, res) => {
  try {
    const { workoutId } = req.params
    const { sessionTime, location, sessionType, meetingLink } = req.body
    
    // Verify workout belongs to trainer's program
    const workoutCheck = await pool.query(
      `SELECT pw.id, p.trainer_id 
       FROM program_workouts pw
       JOIN programs p ON pw.program_id = p.id
       WHERE pw.id = $1`,
      [workoutId]
    )
    
    if (workoutCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Workout not found' })
    }
    
    if (workoutCheck.rows[0].trainer_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' })
    }
    
    // Update all sessions for this workout
    const updates = []
    const values = []
    let paramCount = 1
    
    if (sessionTime !== undefined) {
      updates.push(`session_time = $${paramCount++}`)
      values.push(sessionTime)
    }
    if (location !== undefined) {
      updates.push(`location = $${paramCount++}`)
      values.push(location || null)
    }
    if (sessionType !== undefined) {
      updates.push(`session_type = $${paramCount++}`)
      values.push(sessionType)
    }
    if (meetingLink !== undefined) {
      updates.push(`meeting_link = $${paramCount++}`)
      values.push(meetingLink || null)
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' })
    }
    
    values.push(workoutId, req.user.id)
    
    const result = await pool.query(
      `UPDATE sessions 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE program_workout_id = $${paramCount++} 
         AND trainer_id = $${paramCount++}
         AND status IN ('scheduled', 'confirmed')
       RETURNING id`,
      values
    )
    
    res.json({ 
      message: `Updated ${result.rows.length} session(s)`,
      updatedCount: result.rows.length
    })
  } catch (error) {
    console.error('Error updating workout sessions:', error)
    res.status(500).json({ message: 'Failed to update workout sessions' })
  }
})

// Get trainer availability
router.get('/trainer/availability', requireRole(['trainer']), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM trainer_availability WHERE trainer_id = $1 ORDER BY day_of_week, start_time',
      [req.user.id]
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching availability:', error)
    res.status(500).json({ message: 'Failed to fetch availability' })
  }
})

// Set trainer availability
router.post('/trainer/availability', requireRole(['trainer']), async (req, res) => {
  try {
    const { dayOfWeek, startTime, endTime, isAvailable } = req.body
    
    if (dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({ message: 'Day of week, start time, and end time are required' })
    }
    
    const result = await pool.query(
      `INSERT INTO trainer_availability (trainer_id, day_of_week, start_time, end_time, is_available)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (trainer_id, day_of_week, start_time)
       DO UPDATE SET end_time = $4, is_available = $5, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user.id, dayOfWeek, startTime, endTime, isAvailable !== false]
    )
    
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error setting availability:', error)
    res.status(500).json({ message: 'Failed to set availability' })
  }
})

export default router

