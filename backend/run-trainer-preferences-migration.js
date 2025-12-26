import { pool } from './config/database.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runMigration() {
  const client = await pool.connect()
  
  try {
    console.log('🔄 Running trainer preferences migration...')
    
    // Run migration 011: Add fitness_goals and client_age_ranges
    const migration011Path = path.join(__dirname, '../database/migrations/011_add_trainer_preferences.sql')
    const migration011SQL = fs.readFileSync(migration011Path, 'utf8')
    
    try {
      await client.query(migration011SQL)
      console.log('✅ Migration 011 (trainer preferences) completed')
    } catch (error) {
      if (error.message.includes('already exists') || error.code === '42701' || error.code === '42P07') {
        console.log('⚠️  Migration 011: Columns/indexes already exist, skipping...')
      } else {
        throw error
      }
    }
    
    // Run migration 012: Add location
    const migration012Path = path.join(__dirname, '../database/migrations/012_add_trainer_location.sql')
    const migration012SQL = fs.readFileSync(migration012Path, 'utf8')
    
    try {
      await client.query(migration012SQL)
      console.log('✅ Migration 012 (trainer location) completed')
    } catch (error) {
      if (error.message.includes('already exists') || error.code === '42701' || error.code === '42P07') {
        console.log('⚠️  Migration 012: Column/index already exists, skipping...')
      } else {
        throw error
      }
    }
    
    console.log('✅ All trainer preference migrations completed successfully!')
  } catch (error) {
    console.error('❌ Migration error:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()

