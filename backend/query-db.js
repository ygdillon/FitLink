import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '.env') })

const { Pool } = pg

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'personal_trainer_app',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
})

async function queryDatabase() {
  try {
    // Get SQL query from command line arguments
    const query = process.argv[2]
    
    if (!query) {
      console.error('❌ Error: Please provide a SQL query as an argument')
      console.log('\nUsage: node backend/query-db.js "SELECT * FROM table_name"')
      console.log('\nExample: node backend/query-db.js "SELECT * FROM trainer_meal_recommendations WHERE meal_name LIKE \'%toast%\'"')
      process.exit(1)
    }

    console.log('🔍 Executing query...')
    console.log('Query:', query)
    console.log('')

    const result = await pool.query(query)

    if (result.rows.length === 0) {
      console.log('✅ Query executed successfully, but no rows returned.')
    } else {
      console.log(`✅ Found ${result.rows.length} row(s):\n`)
      console.log(JSON.stringify(result.rows, null, 2))
    }

    await pool.end()
  } catch (error) {
    console.error('❌ Database error:', error.message)
    console.error('Details:', error)
    process.exit(1)
  }
}

queryDatabase()

