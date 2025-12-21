import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const { Pool } = pg
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'personal_trainer_app',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
})

async function runMigration() {
  const client = await pool.connect()
  try {
    const migrationPath = path.join(__dirname, '../database/migrations/011_add_trainer_requests_read_status.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('Running migration: Add read status to trainer_requests...')
    
    await client.query('BEGIN')
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await client.query(statement)
        } catch (error) {
          // Ignore "already exists" errors for columns and indexes
          if (error.code === '42701' || error.code === '42P07' || error.message.includes('already exists')) {
            console.log(`Skipping (already exists): ${statement.substring(0, 50)}...`)
          } else {
            throw error
          }
        }
      }
    }
    
    await client.query('COMMIT')
    console.log('Migration completed successfully!')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()

