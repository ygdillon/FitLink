import express from 'express'
import { authenticate } from '../middleware/auth.js'
import { pool } from '../config/database.js'

const router = express.Router()

router.use(authenticate)

// Get unread message count
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user.id
    
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM messages
       WHERE receiver_id = $1 AND read_status = false`,
      [userId]
    )
    
    res.json({ count: parseInt(result.rows[0].count) })
  } catch (error) {
    console.error('Error fetching unread count:', error)
    res.status(500).json({ message: 'Failed to fetch unread count' })
  }
})

// Get all conversations
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id

    // Get conversations - for trainers: all clients, for clients: their trainer
    let result
    if (req.user.role === 'trainer') {
      result = await pool.query(
        `SELECT DISTINCT u.id, u.name, 
                (SELECT content FROM messages 
                 WHERE (sender_id = $1 AND receiver_id = u.id) 
                    OR (sender_id = u.id AND receiver_id = $1)
                 ORDER BY timestamp DESC LIMIT 1) as last_message
         FROM users u
         JOIN clients c ON u.id = c.user_id
         WHERE c.trainer_id = $1`,
        [userId]
      )
    } else {
      result = await pool.query(
        `SELECT u.id, u.name,
                (SELECT content FROM messages 
                 WHERE (sender_id = $1 AND receiver_id = u.id) 
                    OR (sender_id = u.id AND receiver_id = $1)
                 ORDER BY timestamp DESC LIMIT 1) as last_message
         FROM users u
         JOIN clients c ON c.user_id = $1
         JOIN trainers t ON c.trainer_id = t.user_id
         WHERE t.user_id = u.id`,
        [userId]
      )
    }

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching conversations:', error)
    res.status(500).json({ message: 'Failed to fetch conversations' })
  }
})

// Get messages with specific user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const currentUserId = req.user.id

    const result = await pool.query(
      `SELECT id, sender_id, receiver_id, content, timestamp, read_status
       FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY timestamp ASC`,
      [currentUserId, userId]
    )

    // Mark messages as read when fetching (if they're received by current user)
    await pool.query(
      `UPDATE messages 
       SET read_status = true 
       WHERE receiver_id = $1 AND sender_id = $2 AND read_status = false`,
      [currentUserId, userId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching messages:', error)
    res.status(500).json({ message: 'Failed to fetch messages' })
  }
})

// Mark messages as read
router.put('/:userId/read', async (req, res) => {
  try {
    const { userId } = req.params
    const currentUserId = req.user.id

    await pool.query(
      `UPDATE messages 
       SET read_status = true 
       WHERE receiver_id = $1 AND sender_id = $2 AND read_status = false`,
      [currentUserId, userId]
    )

    res.json({ message: 'Messages marked as read' })
  } catch (error) {
    console.error('Error marking messages as read:', error)
    res.status(500).json({ message: 'Failed to mark messages as read' })
  }
})

// Send message
router.post('/', async (req, res) => {
  try {
    console.log('📨 Received message request:', {
      senderId: req.user.id,
      receiverId: req.body.receiverId,
      contentLength: req.body.content?.length,
      hasContent: !!req.body.content
    })

    const { receiverId, content } = req.body

    if (!receiverId || !content) {
      console.log('❌ Missing required fields:', { receiverId: !!receiverId, content: !!content })
      return res.status(400).json({ message: 'Receiver ID and content are required' })
    }

    // Validate receiverId is a number
    const receiverIdNum = parseInt(receiverId)
    if (isNaN(receiverIdNum)) {
      console.log('❌ Invalid receiver ID:', receiverId)
      return res.status(400).json({ message: 'Invalid receiver ID' })
    }

    // Verify receiver exists
    const receiverCheck = await pool.query('SELECT id FROM users WHERE id = $1', [receiverIdNum])
    if (receiverCheck.rows.length === 0) {
      console.log('❌ Receiver does not exist:', receiverIdNum)
      return res.status(400).json({ message: 'Receiver user does not exist' })
    }

    console.log('✅ Inserting message into database...')
    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, sender_id, receiver_id, content, timestamp`,
      [req.user.id, receiverIdNum, content.trim()]
    )

    console.log('✅ Message sent successfully:', result.rows[0].id)
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('❌ Error sending message:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      table: error.table
    })
    
    // Provide more specific error messages
    if (error.code === '42P01') {
      return res.status(500).json({ 
        message: 'Messages table does not exist. Please run: node backend/ensure-messages-table.js' 
      })
    }
    if (error.code === '23503') {
      return res.status(400).json({ message: 'Invalid receiver ID - user does not exist' })
    }
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Duplicate message' })
    }
    
    res.status(500).json({ 
      message: 'Failed to send message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: error.code
    })
  }
})

export default router

