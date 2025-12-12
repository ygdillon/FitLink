import express from 'express'
import { authenticate } from '../middleware/auth.js'
import { pool } from '../config/database.js'

const router = express.Router()

router.use(authenticate)

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

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching messages:', error)
    res.status(500).json({ message: 'Failed to fetch messages' })
  }
})

// Send message
router.post('/', async (req, res) => {
  try {
    const { receiverId, content } = req.body

    if (!receiverId || !content) {
      return res.status(400).json({ message: 'Receiver ID and content are required' })
    }

    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, sender_id, receiver_id, content, timestamp`,
      [req.user.id, receiverId, content]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error sending message:', error)
    res.status(500).json({ message: 'Failed to send message' })
  }
})

export default router

