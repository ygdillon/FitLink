import { pool } from './config/database.js'

async function fixColumns() {
  const client = await pool.connect()
  
  try {
    console.log('Adding missing check-in columns...')
    
    const columns = [
      'ALTER TABLE daily_check_ins ADD COLUMN IF NOT EXISTS workout_duration INTEGER',
      'ALTER TABLE daily_check_ins ADD COLUMN IF NOT EXISTS sleep_hours DECIMAL(4, 2)',
      'ALTER TABLE daily_check_ins ADD COLUMN IF NOT EXISTS sleep_quality INTEGER',
      'ALTER TABLE daily_check_ins ADD COLUMN IF NOT EXISTS energy_level INTEGER',
      'ALTER TABLE daily_check_ins ADD COLUMN IF NOT EXISTS pain_experienced BOOLEAN DEFAULT false',
      'ALTER TABLE daily_check_ins ADD COLUMN IF NOT EXISTS pain_location TEXT',
      'ALTER TABLE daily_check_ins ADD COLUMN IF NOT EXISTS pain_intensity INTEGER',
      'ALTER TABLE daily_check_ins ADD COLUMN IF NOT EXISTS progress_photo TEXT'
    ]
    
    for (const sql of columns) {
      try {
        await client.query(sql)
        console.log('✓ Added column:', sql.substring(50, 100))
      } catch (error) {
        if (error.code === '42701' || error.message.includes('already exists')) {
          console.log('⚠ Column already exists')
        } else {
          console.error('❌ Error:', error.message)
        }
      }
    }
    
    console.log('✅ Done!')
    
  } catch (error) {
    console.error('❌ Failed:', error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

fixColumns()



