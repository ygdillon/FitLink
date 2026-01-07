import { pool } from './config/database.js'

/**
 * Script to cancel/delete recurring sessions that are not associated with programs
 * These are sessions that have is_recurring = true but no program_id or program_workout_id
 */
async function cleanupNonProgramSessions() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    
    console.log('Finding recurring sessions not from programs...')
    
    // Find all recurring sessions that are not from programs
    const result = await client.query(
      `SELECT id, client_id, session_date, session_time, is_recurring, 
              program_id, program_workout_id, recurring_parent_id
       FROM sessions 
       WHERE is_recurring = true 
         AND (program_id IS NULL AND program_workout_id IS NULL)
         AND status IN ('scheduled', 'confirmed')`
    )
    
    console.log(`Found ${result.rows.length} recurring sessions not from programs`)
    
    if (result.rows.length === 0) {
      console.log('No sessions to clean up')
      await client.query('COMMIT')
      return
    }
    
    // Cancel all these sessions
    const sessionIds = result.rows.map(r => r.id)
    
    // Cancel parent sessions and all their children
    for (const session of result.rows) {
      if (session.recurring_parent_id === null) {
        // This is a parent session - cancel it and all its children
        await client.query(
          `UPDATE sessions 
           SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 OR recurring_parent_id = $1`,
          [session.id]
        )
        console.log(`Cancelled parent session ${session.id} and its children`)
      }
    }
    
    // Also cancel any remaining child sessions
    await client.query(
      `UPDATE sessions 
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE recurring_parent_id IN (
         SELECT id FROM sessions 
         WHERE is_recurring = true 
           AND (program_id IS NULL AND program_workout_id IS NULL)
           AND status = 'cancelled'
       )`
    )
    
    await client.query('COMMIT')
    console.log(`Successfully cancelled ${result.rows.length} recurring sessions not from programs`)
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error cleaning up sessions:', error)
    throw error
  } finally {
    client.release()
  }
}

// Run the cleanup
cleanupNonProgramSessions()
  .then(() => {
    console.log('Cleanup completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Cleanup failed:', error)
    process.exit(1)
  })

