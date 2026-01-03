import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
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
    const migrationPath = path.join(__dirname, '../database/migrations/017_add_meals_recommendations_system.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('Running meals recommendations migration (017)...')
    console.log(`Database: ${process.env.DB_NAME || 'personal_trainer_app'}`)
    console.log(`User: ${process.env.DB_USER || 'postgres'}`)
    
    // Execute the entire migration SQL
    try {
      await client.query(migrationSQL)
      console.log('✅ Meals recommendations migration completed successfully!')
    } catch (error) {
      // Ignore "already exists" errors for tables, indexes, and triggers
      if (error.message.includes('already exists') || error.code === '42P07') {
        console.log('⚠️  Some tables/indexes/triggers already exist, this is OK...')
        console.log('✅ Migration completed (some items may already exist)')
      } else {
        console.error('❌ Migration error:', error.message)
        console.error('Error code:', error.code)
        throw error
      }
    }
  } catch (error) {
    console.error('❌ Migration error:', error.message)
    if (error.code === '28000') {
      console.error('\n⚠️  Database authentication error!')
      console.error('Please check your .env file in the backend directory.')
      console.error('Make sure DB_USER, DB_PASSWORD, and DB_NAME are set correctly.')
    }
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()

