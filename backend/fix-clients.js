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

async function fixClients() {
  const client = await pool.connect()
  
  try {
    console.log('🔍 Checking trainer-client relationships...\n')
    
    // Get all trainers
    const trainers = await client.query(
      `SELECT u.id as user_id, u.email, t.user_id as trainer_user_id
       FROM users u
       JOIN trainers t ON u.id = t.user_id
       WHERE u.role = 'trainer'`
    )
    
    console.log(`Found ${trainers.rows.length} trainer(s):`)
    trainers.rows.forEach(t => {
      console.log(`  - User ID: ${t.user_id}, Email: ${t.email}, Trainer User ID: ${t.trainer_user_id}`)
    })
    
    if (trainers.rows.length === 0) {
      console.log('\n❌ No trainers found!')
      return
    }
    
    const trainer = trainers.rows[0]
    const trainerUserId = trainer.user_id
    
    // Check clients
    const clients = await client.query(
      `SELECT c.id, c.user_id, c.trainer_id, u.name, u.email
       FROM clients c
       JOIN users u ON c.user_id = u.id`
    )
    
    console.log(`\n📋 Found ${clients.rows.length} client(s):`)
    clients.rows.forEach(c => {
      console.log(`  - Client: ${c.name} (${c.email})`)
      console.log(`    Client ID: ${c.id}, User ID: ${c.user_id}, Trainer ID: ${c.trainer_id}`)
    })
    
    // Fix clients that don't have the correct trainer_id
    const clientsToFix = clients.rows.filter(c => c.trainer_id !== trainerUserId)
    
    if (clientsToFix.length > 0) {
      console.log(`\n🔧 Fixing ${clientsToFix.length} client(s) with incorrect trainer_id...`)
      
      await client.query('BEGIN')
      
      for (const clientToFix of clientsToFix) {
        await client.query(
          'UPDATE clients SET trainer_id = $1 WHERE id = $2',
          [trainerUserId, clientToFix.id]
        )
        console.log(`  ✅ Fixed: ${clientToFix.name} - set trainer_id to ${trainerUserId}`)
      }
      
      await client.query('COMMIT')
      console.log('\n✅ All clients fixed!')
    } else {
      console.log('\n✅ All clients already have correct trainer_id!')
    }
    
    // Verify
    const verify = await client.query(
      `SELECT COUNT(*) as count
       FROM clients
       WHERE trainer_id = $1`,
      [trainerUserId]
    )
    
    console.log(`\n📊 Total clients assigned to trainer: ${verify.rows[0].count}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

fixClients().catch(console.error)

