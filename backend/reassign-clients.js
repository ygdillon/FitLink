import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '.env') })

const { Pool } = pg

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'personal_trainer_app',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
})

async function reassignClients() {
  const client = await pool.connect()
  
  try {
    console.log('🔄 Reassigning clients to ygdillon@gmail.com trainer...\n')
    
    // Get the trainer account for ygdillon@gmail.com
    const trainer = await client.query(
      `SELECT u.id as user_id, u.email, t.user_id as trainer_user_id
       FROM users u
       JOIN trainers t ON u.id = t.user_id
       WHERE u.email = 'ygdillon@gmail.com' AND u.role = 'trainer'`
    )
    
    if (trainer.rows.length === 0) {
      console.log('❌ Trainer ygdillon@gmail.com not found!')
      return
    }
    
    const trainerUserId = trainer.rows[0].user_id
    console.log(`✅ Found trainer: ${trainer.rows[0].email} (User ID: ${trainerUserId})`)
    
    // Reassign all clients to this trainer
    await client.query('BEGIN')
    
    const result = await client.query(
      'UPDATE clients SET trainer_id = $1 RETURNING id',
      [trainerUserId]
    )
    
    await client.query('COMMIT')
    
    console.log(`\n✅ Reassigned ${result.rows.length} client(s) to trainer ${trainer.rows[0].email}`)
    console.log('\n📋 You should now see all clients when logged in as ygdillon@gmail.com')
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Error:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

reassignClients().catch(console.error)

