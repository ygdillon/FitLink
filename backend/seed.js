import pg from 'pg'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env from backend directory
dotenv.config({ path: join(__dirname, '.env') })

const { Pool } = pg

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'personal_trainer_app',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
})

// Fake client data
const fakeClients = [
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    height: 65,
    weight: 145,
    gender: 'female',
    age: 28,
    previous_experience: 'I used to go to the gym regularly but stopped during the pandemic. I have basic knowledge of weightlifting.',
    average_daily_eating: 'I usually skip breakfast, have a light lunch, and a larger dinner. I snack throughout the day.',
    primary_goal: 'weight_loss',
    goal_target: 'Lose 20 pounds',
    goal_timeframe: '3 months',
    secondary_goals: ['improve_strength', 'increase_energy'],
    barriers: 'Time management - I work long hours and find it hard to make time for the gym',
    training_preference: 'online',
    communication_preference: 'text',
    status: 'active'
  },
  {
    name: 'Michael Chen',
    email: 'michael.chen@example.com',
    height: 70,
    weight: 180,
    gender: 'male',
    age: 35,
    previous_experience: 'Complete beginner. Never been to a gym before.',
    average_daily_eating: 'I eat 3 meals a day, mostly takeout. I want to learn how to meal prep.',
    primary_goal: 'muscle_gain',
    goal_target: 'Gain 15 pounds of muscle',
    goal_timeframe: '6 months',
    secondary_goals: ['improve_strength', 'build_confidence'],
    barriers: 'Lack of knowledge about proper form and nutrition',
    training_preference: 'in_person',
    communication_preference: 'email',
    status: 'active'
  },
  {
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@example.com',
    height: 63,
    weight: 130,
    gender: 'female',
    age: 24,
    previous_experience: 'I do yoga and pilates regularly, but want to add strength training.',
    average_daily_eating: 'I follow a mostly plant-based diet. I eat 4-5 small meals throughout the day.',
    primary_goal: 'tone_and_strengthen',
    goal_target: 'Build lean muscle and improve overall strength',
    goal_timeframe: '4 months',
    secondary_goals: ['improve_flexibility', 'increase_endurance'],
    barriers: 'Not sure how to combine yoga with strength training effectively',
    training_preference: 'hybrid',
    communication_preference: 'app',
    status: 'active'
  },
  {
    name: 'David Thompson',
    email: 'david.thompson@example.com',
    height: 72,
    weight: 220,
    gender: 'male',
    age: 42,
    previous_experience: 'Former athlete, but haven\'t trained seriously in 10 years. Need to get back in shape.',
    average_daily_eating: 'I eat out a lot for business meetings. Portion control is my main issue.',
    primary_goal: 'weight_loss',
    goal_target: 'Lose 30 pounds and regain athletic performance',
    goal_timeframe: '6 months',
    secondary_goals: ['improve_cardio', 'reduce_body_fat'],
    barriers: 'Business travel makes it hard to maintain consistency',
    training_preference: 'online',
    communication_preference: 'phone',
    status: 'active'
  },
  {
    name: 'Jessica Martinez',
    email: 'jessica.martinez@example.com',
    height: 64,
    weight: 155,
    gender: 'female',
    age: 31,
    previous_experience: 'I\'ve tried many different programs but never stuck with them long-term.',
    average_daily_eating: 'I meal prep on Sundays but often fall off track by Wednesday. Need accountability.',
    primary_goal: 'weight_loss',
    goal_target: 'Lose 25 pounds',
    goal_timeframe: '4 months',
    secondary_goals: ['build_habits', 'improve_consistency'],
    barriers: 'Lack of motivation and accountability. I need someone to check in with me regularly.',
    training_preference: 'online',
    communication_preference: 'daily',
    status: 'active'
  },
  {
    name: 'Robert Kim',
    email: 'robert.kim@example.com',
    height: 68,
    weight: 165,
    gender: 'male',
    age: 29,
    previous_experience: 'Intermediate lifter. I know the basics but want to break through plateaus.',
    average_daily_eating: 'I track macros and eat 5 meals a day. Very disciplined with nutrition.',
    primary_goal: 'muscle_gain',
    goal_target: 'Add 10 pounds of lean muscle',
    goal_timeframe: '5 months',
    secondary_goals: ['increase_strength', 'improve_proportions'],
    barriers: 'Hitting strength plateaus. Need advanced programming.',
    training_preference: 'in_person',
    communication_preference: 'text',
    status: 'active'
  },
  {
    name: 'Amanda White',
    email: 'amanda.white@example.com',
    height: 66,
    weight: 140,
    gender: 'female',
    age: 27,
    previous_experience: 'I run 3-4 times per week but want to add strength training to prevent injuries.',
    average_daily_eating: 'I eat a balanced diet but could use guidance on pre/post workout nutrition.',
    primary_goal: 'improve_performance',
    goal_target: 'Run faster and prevent running injuries',
    goal_timeframe: '3 months',
    secondary_goals: ['build_strength', 'improve_mobility'],
    barriers: 'Not sure how to balance running with strength training',
    training_preference: 'hybrid',
    communication_preference: 'app',
    status: 'active'
  },
  {
    name: 'James Wilson',
    email: 'james.wilson@example.com',
    height: 71,
    weight: 195,
    gender: 'male',
    age: 38,
    previous_experience: 'Used to be very active but desk job has made me sedentary. Need to restart.',
    average_daily_eating: 'I eat healthy at home but office snacks and stress eating are problems.',
    primary_goal: 'weight_loss',
    goal_target: 'Lose 20 pounds and build healthy habits',
    goal_timeframe: '5 months',
    secondary_goals: ['improve_energy', 'reduce_stress'],
    barriers: 'Sedentary job and stress eating',
    training_preference: 'online',
    communication_preference: 'email',
    status: 'active'
  }
]

async function seedDatabase() {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    console.log('🌱 Starting database seeding...')
    
    // Get or create a trainer account
    let trainerResult = await client.query(
      'SELECT id FROM users WHERE role = $1 LIMIT 1',
      ['trainer']
    )
    
    let trainerId
    if (trainerResult.rows.length === 0) {
      // Create a trainer account
      const hashedPassword = await bcrypt.hash('trainer123', 10)
      const trainerUser = await client.query(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
        ['Test Trainer', 'trainer@trainr.com', hashedPassword, 'trainer']
      )
      trainerId = trainerUser.rows[0].id
      
      await client.query(
        'INSERT INTO trainers (user_id) VALUES ($1)',
        [trainerId]
      )
      console.log('✅ Created trainer account')
    } else {
      trainerId = trainerResult.rows[0].id
      console.log('✅ Using existing trainer account')
    }
    
    // Create fake clients
    console.log(`\n📝 Creating ${fakeClients.length} fake clients...`)
    
    for (const clientData of fakeClients) {
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [clientData.email]
      )
      
      let userId
      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id
        console.log(`   ⚠️  Client ${clientData.name} already exists, skipping...`)
        continue
      }
      
      // Create user account
      const hashedPassword = await bcrypt.hash('client123', 10)
      const userResult = await client.query(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [clientData.name, clientData.email, hashedPassword, 'client']
      )
      userId = userResult.rows[0].id
      
      // Create client profile
      await client.query(
        `INSERT INTO clients (
          user_id, trainer_id, height, weight, gender, age,
          previous_experience, average_daily_eating, primary_goal,
          goal_target, goal_timeframe, secondary_goals, barriers,
          training_preference, communication_preference,
          onboarding_completed, start_date, status, goals
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_DATE, $17, $18)`,
        [
          userId,
          trainerId,
          clientData.height,
          clientData.weight,
          clientData.gender,
          clientData.age,
          clientData.previous_experience,
          clientData.average_daily_eating,
          clientData.primary_goal,
          clientData.goal_target,
          clientData.goal_timeframe,
          JSON.stringify(clientData.secondary_goals),
          clientData.barriers,
          clientData.training_preference,
          clientData.communication_preference,
          true,
          clientData.status,
          JSON.stringify([clientData.primary_goal])
        ]
      )
      
      console.log(`   ✅ Created client: ${clientData.name}`)
    }
    
    await client.query('COMMIT')
    console.log('\n🎉 Database seeding completed successfully!')
    console.log('\n📋 Test Accounts:')
    console.log('   Trainer: trainer@trainr.com / trainer123')
    console.log('   Clients: [email] / client123')
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Error seeding database:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

seedDatabase().catch(console.error)

