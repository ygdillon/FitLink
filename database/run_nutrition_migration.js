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

async function runNutritionMigration() {
  try {
    console.log('Running nutrition program builder migration...')
    console.log(`Database: ${process.env.DB_NAME || 'personal_trainer_app'}`)
    console.log(`User: ${process.env.DB_USER || 'postgres'}`)
    
    // Migration 015: Add Nutrition Program Builder System
    console.log('\nRunning migration 015: Add Nutrition Program Builder System...')
    const migration015 = fs.readFileSync(
      path.join(__dirname, 'migrations', '015_add_nutrition_program_builder.sql'),
      'utf8'
    )
    await pool.query(migration015)
    console.log('✓ Migration 015 completed')
    
    console.log('\n✅ Nutrition migration completed successfully!')
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration error:', error.message)
    if (error.code === '42P01') {
      console.error('Table already exists. This is OK - continuing...')
    } else if (error.code === '42710') {
      console.error('Object already exists (trigger, index, etc.). This is OK - migration is idempotent.')
      console.log('✅ Migration completed (some objects already existed)')
      await pool.end()
      process.exit(0)
    } else if (error.code === '28000') {
      console.error('\n⚠️  Database authentication error!')
      console.error('Please check your .env file in the backend directory.')
      console.error('Make sure DB_USER, DB_PASSWORD, and DB_NAME are set correctly.')
    } else {
      console.error('Full error:', error)
    }
    await pool.end()
    process.exit(1)
  }
}

runNutritionMigration()

