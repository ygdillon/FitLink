import { pool } from './config/database.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runMigration() {
  const client = await pool.connect()
  
  try {
    console.log('Running trainer alerts migration...')
    
    const migrationPath = path.join(__dirname, '../database/migrations/010_add_trainer_alerts.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Split by semicolons and execute each statement (no transaction to avoid abort issues)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    // First, create the table
    const tableStatement = statements.find(s => s.includes('CREATE TABLE'))
    if (tableStatement) {
      try {
        await client.query(tableStatement)
        console.log('✓ Created trainer_alerts table')
      } catch (error) {
        if (error.code === '42P07' || error.message.includes('already exists')) {
          console.log('⚠ Table already exists')
        } else {
          throw error
        }
      }
    }
    
    // Then create indexes
    const indexStatements = statements.filter(s => s.includes('CREATE INDEX'))
    for (const statement of indexStatements) {
      if (statement.trim()) {
        try {
          await client.query(statement)
          console.log('✓ Created index:', statement.match(/idx_\w+/)?.[0] || 'index')
        } catch (error) {
          // Ignore "already exists" errors
          if (error.code === '42701' || error.code === '42P07' || error.message.includes('already exists')) {
            console.log('⚠ Index already exists')
          } else {
            console.error('❌ Error creating index:', error.message)
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

