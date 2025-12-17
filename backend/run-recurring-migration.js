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

async function runRecurringMigration() {
  try {
    console.log('🔄 Running recurring sessions migration...')
    
    const migrationPath = join(__dirname, '../database/migrations/003_add_recurring_sessions.sql')
    const sql = readFileSync(migrationPath, 'utf8')
    
    await pool.query(sql)
    
    console.log('✅ Recurring sessions migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration error:', error.message)
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('⚠️  Some columns may already exist, continuing...')
    } else {
      throw error
    }
  } finally {
    await pool.end()
  }
}

runRecurringMigration().catch(console.error)

