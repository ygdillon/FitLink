import pg from 'pg'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '.env') })

const { Pool } = pg

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'personal_trainer_app',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
})

async function runMigration() {
  try {
    console.log('🔄 Running migrations...')
    
    // Run scheduling migration
    const schedulingPath = join(__dirname, '../database/migrations/002_add_scheduling.sql')
    const schedulingSql = readFileSync(schedulingPath, 'utf8')
    await pool.query(schedulingSql)
    console.log('✅ Scheduling migration completed')
    
    // Run recurring sessions migration
    const recurringPath = join(__dirname, '../database/migrations/003_add_recurring_sessions.sql')
    const recurringSql = readFileSync(recurringPath, 'utf8')
    await pool.query(recurringSql)
    console.log('✅ Recurring sessions migration completed')
    
    console.log('✅ All migrations completed successfully!')
  } catch (error) {
    console.error('❌ Migration error:', error.message)
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('⚠️  Some tables/columns may already exist, continuing...')
    } else {
      throw error
    }
  } finally {
    await pool.end()
  }
}

runMigration().catch(console.error)

