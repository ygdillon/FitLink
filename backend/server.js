import dotenv from 'dotenv'
// Load environment variables FIRST before any other imports
dotenv.config()

import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import trainerRoutes from './routes/trainer.js'
import clientRoutes from './routes/client.js'
import workoutRoutes from './routes/workout.js'
import messageRoutes from './routes/message.js'
import profileRoutes from './routes/profile.js'
import paymentRoutes from './routes/payment.js'
import scheduleRoutes from './routes/schedule.js'
import analyticsRoutes from './routes/analytics.js'
import alertsRoutes from './routes/alerts.js'
import aiWorkoutRoutes from './routes/aiWorkout.js'
import programsRoutes from './routes/programs.js'
import nutritionRoutes from './routes/nutrition.js'
import { pool } from './config/database.js'

const app = express()
const PORT = process.env.PORT || 5001

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' })) // Increased limit for base64 image uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Trainr API' })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/trainer', trainerRoutes)
app.use('/api/client', clientRoutes)
app.use('/api/workouts', workoutRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/schedule', scheduleRoutes)
app.use('/api/trainer/analytics', analyticsRoutes)
app.use('/api/trainer/alerts', alertsRoutes)
app.use('/api/trainer/workouts/ai', aiWorkoutRoutes)
app.use('/api/programs', programsRoutes)
app.use('/api/nutrition', nutritionRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`)
  
  // Test database connection
  try {
    const result = await pool.query('SELECT NOW()')
    console.log('Database connected successfully')
  } catch (error) {
    console.error('Database connection error:', error.message)
  }
})

export default app

