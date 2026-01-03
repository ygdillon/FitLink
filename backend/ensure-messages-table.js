import dotenv from 'dotenv'
import { pool } from './config/database.js'

dotenv.config()

async function ensureMessagesTable() {
  try {
    console.log('Checking if messages table exists...')
    
    // Check if table exists
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'messages'
      );
    `)
    
    if (checkResult.rows[0].exists) {
      console.log('✅ Messages table already exists')
      
      // Check if indexes exist
      const indexCheck = await pool.query(`
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'messages'
      `)
      console.log('📊 Existing indexes:', indexCheck.rows.map(r => r.indexname))
      
    } else {
      console.log('⚠️  Messages table does not exist. Creating...')
      
      // Create messages table
      await pool.query(`
        CREATE TABLE messages (
          id SERIAL PRIMARY KEY,
          sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          read_status BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      console.log('✅ Messages table created')
      
      // Create indexes
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)
      `)
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id)
      `)
      
      console.log('✅ Indexes created')
    }
    
    console.log('✅ Messages table is ready!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

ensureMessagesTable()




