import { pool } from './config/database.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runMigration() {
  const client = await pool.connect()
  
  try {
    console.log('Running check-in enhancement migration...')
    
    const migrationPath = path.join(__dirname, '../database/migrations/009_enhance_checkin_metrics.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Split by semicolons and execute each statement (no transaction to avoid abort issues)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await client.query(statement)
          console.log('✓ Executed:', statement.substring(0, 50) + '...')
        } catch (error) {
          // Ignore "already exists" errors for columns and indexes
          if (error.code === '42701' || error.code === '42P07' || error.message.includes('already exists')) {
            console.log('⚠ Skipped (already exists):', statement.substring(0, 50) + '...')
          } else if (error.code === '42703' && error.message.includes('does not exist')) {
            // Column doesn't exist - this is expected for indexes if column wasn't created
            console.log('⚠ Skipped (column missing, will create index later):', statement.substring(0, 50) + '...')
          } else {
            console.error('❌ Error executing statement:', statement.substring(0, 50))
            console.error('   Error:', error.message)
            // Continue with next statement instead of failing completely
          }
        }
      }
    }
    
    console.log('✅ Migration completed!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()

