import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const { Pool } = pg
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'personal_trainer_app',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
})

async function runMigration() {
  const client = await pool.connect()
  
  try {
    const migrationPath = path.join(__dirname, '../database/migrations/006_add_trainer_requests.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('Running trainer requests migration...')
    
    // Execute the migration SQL
    try {
      await client.query(migrationSQL)
    } catch (error) {
      // Ignore "already exists" errors for triggers and indexes
      if (error.message.includes('already exists')) {
        console.log('✅ Table/index/trigger already exists, skipping...')
      } else {
        throw error
      }
    }
    
    console.log('✅ Trainer requests migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration error:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()

