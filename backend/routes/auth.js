import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../config/database.js'

const router = express.Router()

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phoneNumber } = req.body

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    if (!['trainer', 'client'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' })
    }

    // Phone number is required for trainers
    if (role === 'trainer' && !phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required for trainers' })
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    )

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const userResult = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashedPassword, role]
    )

    const user = userResult.rows[0]

    // Create role-specific profile
    if (role === 'trainer') {
      await pool.query(
        'INSERT INTO trainers (user_id, phone_number) VALUES ($1, $2)',
        [user.id, phoneNumber]
      )
    } else {
      await pool.query(
        'INSERT INTO clients (user_id) VALUES ($1)',
        [user.id]
      )
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.status(201).json({
      message: 'User created successfully',
      token,
      user
    })
  } catch (error) {
    console.error('Registration error:', error)
    console.error('Error details:', error.message, error.stack)
    res.status(500).json({ 
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    // Find user
    const result = await pool.query(
      'SELECT id, name, email, password, role FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const user = result.rows[0]

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    // Remove password from response
    delete user.password

    res.json({
      message: 'Login successful',
      token,
      user
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Login failed' })
  }
})

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]

    if (!token) {
      return res.status(401).json({ message: 'No token provided' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, 
              t.bio, t.certifications, t.specialties
       FROM users u
       LEFT JOIN trainers t ON u.id = t.user_id
       WHERE u.id = $1`,
      [decoded.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    const user = result.rows[0]
    if (user.certifications) {
      user.certifications = Array.isArray(user.certifications) 
        ? user.certifications 
        : JSON.parse(user.certifications || '[]')
    }
    if (user.specialties) {
      user.specialties = Array.isArray(user.specialties)
        ? user.specialties
        : JSON.parse(user.specialties || '[]')
    }

    res.json(user)
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ message: 'Failed to get user' })
  }
})

export default router

