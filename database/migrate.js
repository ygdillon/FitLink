import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from '../backend/config/database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function migrate() {
  try {
    console.log('Starting database migration...')
    console.log(`DB_HOST: ${process.env.DB_HOST || 'localhost'}`)
    console.log(`DB_PORT: ${process.env.DB_PORT || 5432}`)
    console.log(`DB_NAME: ${process.env.DB_NAME || 'personal_trainer_app'}`)
    console.log(`DB_USER: ${process.env.DB_USER || 'postgres'}`)
    console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '***' : '(not set)'}`)
    
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')
    
    // Execute schema
    await pool.query(schema)
    
    console.log('Database migration completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Migration error:', error)
    process.exit(1)
  }
}

migrate()

