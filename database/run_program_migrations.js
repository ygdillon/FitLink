import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

// Load environment variables from backend/.env
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.join(__dirname, '..', 'backend', '.env')
dotenv.config({ path: envPath })

// Import pool after env is loaded
import { pool } from '../backend/config/database.js'

async function runMigrations() {
  try {
    console.log('Running program system migrations...')
    console.log(`Database: ${process.env.DB_NAME || 'personal_trainer_app'}`)
    console.log(`User: ${process.env.DB_USER || 'postgres'}`)
    
    // Migration 013: Add Programs System
    console.log('\nRunning migration 013: Add Programs System...')
    const migration013 = fs.readFileSync(
      path.join(__dirname, 'migrations', '013_add_programs_system.sql'),
      'utf8'
    )
    await pool.query(migration013)
    console.log('✓ Migration 013 completed')
    
    // Migration 014: Add Program Builder System
    console.log('\nRunning migration 014: Add Program Builder System...')
    const migration014 = fs.readFileSync(
      path.join(__dirname, 'migrations', '014_add_program_builder_system.sql'),
      'utf8'
    )
    await pool.query(migration014)
    console.log('✓ Migration 014 completed')
    
    console.log('\n✅ All migrations completed successfully!')
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration error:', error.message)
    if (error.code === '42P01') {
      console.error('Table already exists. This is OK - continuing...')
    } else if (error.code === '28000') {
      console.error('\n⚠️  Database authentication error!')
      console.error('Please check your .env file in the backend directory.')
      console.error('Make sure DB_USER, DB_PASSWORD, and DB_NAME are set correctly.')
    }
    await pool.end()
    process.exit(1)
  }
}

runMigrations()
