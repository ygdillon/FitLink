import express from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { pool } from '../config/database.js'

const router = express.Router()

// All routes require authentication and trainer role
router.use(authenticate)
router.use(requireRole(['trainer']))

// Get all alerts for trainer
router.get('/', async (req, res) => {
  try {
    const { unread_only, limit } = req.query
    
    let query = `
      SELECT 
        ta.*,
        u.name as client_name,
        u.email as client_email
      FROM trainer_alerts ta
      JOIN users u ON ta.client_id = u.id
      WHERE ta.trainer_id = $1
    `
    
    const params = [req.user.id]
    
    if (unread_only === 'true') {
      query += ' AND ta.is_read = false'
    }
    
    query += ' ORDER BY ta.created_at DESC'
    
    if (limit) {
      query += ` LIMIT $${params.length + 1}`
      params.push(parseInt(limit))
    }
    
    const result = await pool.query(query, params)
    
    // Parse metadata JSON
    const alerts = result.rows.map(alert => ({
      ...alert,
      metadata: alert.metadata ? (typeof alert.metadata === 'string' ? JSON.parse(alert.metadata) : alert.metadata) : null
    }))
    
    res.json(alerts)
  } catch (error) {
    console.error('Error fetching alerts:', error)
    res.status(500).json({ message: 'Failed to fetch alerts' })
  }
})

// Get unread alerts count
router.get('/unread-count', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM trainer_alerts WHERE trainer_id = $1 AND is_read = false',
      [req.user.id]
    )
    res.json({ count: parseInt(result.rows[0].count) })
  } catch (error) {
    console.error('Error fetching unread count:', error)
    res.status(500).json({ message: 'Failed to fetch unread count' })
  }
})

// Mark alert as read
router.put('/:alertId/read', async (req, res) => {
  try {
    const { alertId } = req.params
    
    // Verify alert belongs to trainer
    const check = await pool.query(
      'SELECT id FROM trainer_alerts WHERE id = $1 AND trainer_id = $2',
      [alertId, req.user.id]
    )
    
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Alert not found' })
    }
    
    await pool.query(
      'UPDATE trainer_alerts SET is_read = true, read_at = NOW() WHERE id = $1',
      [alertId]
    )
    
    res.json({ message: 'Alert marked as read' })
  } catch (error) {
    console.error('Error marking alert as read:', error)
    res.status(500).json({ message: 'Failed to mark alert as read' })
  }
})

// Mark all alerts as read
router.put('/read-all', async (req, res) => {
  try {
    await pool.query(
      'UPDATE trainer_alerts SET is_read = true, read_at = NOW() WHERE trainer_id = $1 AND is_read = false',
      [req.user.id]
    )
    
    res.json({ message: 'All alerts marked as read' })
  } catch (error) {
    console.error('Error marking all alerts as read:', error)
    res.status(500).json({ message: 'Failed to mark all alerts as read' })
  }
})

// Delete alert
router.delete('/:alertId', async (req, res) => {
  try {
    const { alertId } = req.params
    
    // Verify alert belongs to trainer
    const check = await pool.query(
      'SELECT id FROM trainer_alerts WHERE id = $1 AND trainer_id = $2',
      [alertId, req.user.id]
    )
    
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Alert not found' })
    }
    
    await pool.query('DELETE FROM trainer_alerts WHERE id = $1', [alertId])
    
    res.json({ message: 'Alert deleted' })
  } catch (error) {
    console.error('Error deleting alert:', error)
    res.status(500).json({ message: 'Failed to delete alert' })
  }
})

export default router



