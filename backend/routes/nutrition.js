import express from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { pool } from '../config/database.js'
import OpenAI from 'openai'

const router = express.Router()

// Initialize OpenAI client for AI macro calculation
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null

router.use(authenticate)

// ============================================
// MACRO CALCULATOR ENDPOINTS
// ============================================

// Calculate BMR using Mifflin-St Jeor Equation
router.post('/calculate/bmr', requireRole(['trainer']), async (req, res) => {
  try {
    const { weight_kg, height_cm, age, biological_sex } = req.body

    if (!weight_kg || !height_cm || !age || !biological_sex) {
      return res.status(400).json({ message: 'Missing required fields: weight_kg, height_cm, age, biological_sex' })
    }

    // Mifflin-St Jeor Equation
    let bmr
    if (biological_sex === 'male') {
      bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5
    } else {
      bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161
    }

    res.json({ bmr: Math.round(bmr) })
  } catch (error) {
    console.error('Error calculating BMR:', error)
    res.status(500).json({ message: 'Failed to calculate BMR' })
  }
})

// Calculate TDEE (Total Daily Energy Expenditure)
router.post('/calculate/tdee', requireRole(['trainer']), async (req, res) => {
  try {
    const { bmr, activity_level } = req.body

    if (!bmr || !activity_level) {
      return res.status(400).json({ message: 'Missing required fields: bmr, activity_level' })
    }

    const multipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9
    }

    const multiplier = multipliers[activity_level] || 1.2
    const tdee = bmr * multiplier

    res.json({ 
      tdee: Math.round(tdee),
      activity_multiplier: multiplier,
      activity_level
    })
  } catch (error) {
    console.error('Error calculating TDEE:', error)
    res.status(500).json({ message: 'Failed to calculate TDEE' })
  }
})

// Calculate target macros based on goal
router.post('/calculate/macros', requireRole(['trainer']), async (req, res) => {
  try {
    const { 
      weight_lbs, 
      tdee, 
      goal, // 'lose_fat', 'build_muscle', 'maintain', 'performance'
      rate_of_change, // 'aggressive', 'moderate', 'conservative'
      biological_sex,
      in_deficit // true if in calorie deficit
    } = req.body

    if (!weight_lbs || !tdee || !goal) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    // Adjust calories based on goal
    let target_calories = tdee
    const adjustments = {
      lose_fat: {
        aggressive: -1000,
        moderate: -750,
        conservative: -500
      },
      build_muscle: {
        aggressive: 500,
        moderate: 300,
        conservative: 200
      },
      maintain: {
        aggressive: 0,
        moderate: 0,
        conservative: 0
      },
      performance: {
        aggressive: 300,
        moderate: 200,
        conservative: 100
      }
    }

    const adjustment = adjustments[goal]?.[rate_of_change || 'moderate'] || 0
    target_calories = tdee + adjustment

    // Safety floors
    const min_calories = biological_sex === 'female' ? 1200 : 1500
    if (target_calories < min_calories) {
      target_calories = min_calories
    }

    // Calculate protein (0.7-1.2g per lb bodyweight)
    let protein_per_lb = 0.8 // Default
    if (goal === 'lose_fat' || in_deficit) {
      protein_per_lb = 1.0 // Higher protein in deficit
    } else if (goal === 'build_muscle') {
      protein_per_lb = 1.0
    }
    
    const target_protein = Math.round(weight_lbs * protein_per_lb)

    // Calculate fats (0.3-0.5g per lb bodyweight)
    let fat_per_lb = 0.35 // Default
    if (biological_sex === 'female') {
      fat_per_lb = 0.4 // Women need more fat for hormones
    }
    const target_fats = Math.round(weight_lbs * fat_per_lb)

    // Calculate carbs (fill remaining calories)
    const protein_cals = target_protein * 4
    const fat_cals = target_fats * 9
    const remaining_cals = target_calories - protein_cals - fat_cals
    const target_carbs = Math.max(0, Math.round(remaining_cals / 4))

    res.json({
      target_calories: Math.round(target_calories),
      target_protein,
      target_carbs,
      target_fats,
      breakdown: {
        protein_percent: Math.round((protein_cals / target_calories) * 100),
        carbs_percent: Math.round((target_carbs * 4 / target_calories) * 100),
        fats_percent: Math.round((fat_cals / target_calories) * 100)
      }
    })
  } catch (error) {
    console.error('Error calculating macros:', error)
    res.status(500).json({ message: 'Failed to calculate macros' })
  }
})

// ============================================
// NUTRITION PROFILE ENDPOINTS
// ============================================

// Get nutrition profile for a client
router.get('/profiles/:clientId', requireRole(['trainer']), async (req, res) => {
  try {
    const { clientId } = req.params

    // Verify client belongs to trainer
    const clientCheck = await pool.query(
      'SELECT user_id FROM clients WHERE user_id = $1 AND trainer_id = $2',
      [clientId, req.user.id]
    )

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    const result = await pool.query(
      'SELECT * FROM client_nutrition_profiles WHERE client_id = $1',
      [clientId]
    )

    res.json(result.rows[0] || null)
  } catch (error) {
    console.error('Error fetching nutrition profile:', error)
    res.status(500).json({ message: 'Failed to fetch nutrition profile' })
  }
})

// Create or update nutrition profile
router.post('/profiles/:clientId', requireRole(['trainer']), async (req, res) => {
  try {
    const { clientId } = req.params
    const profileData = req.body

    // Verify client belongs to trainer
    const clientCheck = await pool.query(
      'SELECT user_id FROM clients WHERE user_id = $1 AND trainer_id = $2',
      [clientId, req.user.id]
    )

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    // Define allowed fields (matching database columns)
    const allowedFields = [
      'current_weight', 'height_cm', 'age', 'biological_sex', 'body_fat_percentage',
      'waist_circumference', 'weight_trend', 'training_frequency', 'training_type',
      'training_duration', 'daily_activity_level', 'steps_per_day', 'sleep_hours',
      'sleep_quality', 'current_eating_habits', 'previous_diet_attempts',
      'nutrition_challenges', 'food_relationship', 'dietary_framework',
      'religious_restrictions', 'allergies', 'dislikes', 'cooking_skill_level',
      'meal_prep_time', 'primary_goal', 'rate_of_change', 'target_weight',
      'timeline_expectations', 'upcoming_events', 'budget_level', 'family_situation',
      'social_eating_frequency', 'travel_frequency', 'kitchen_access',
      'food_storage_options', 'food_as_reward', 'stress_eating_patterns',
      'adherence_personality', 'accountability_preference'
    ]

    // Filter and clean profile data
    const cleanedData = {}
    
    // Define numeric fields that need conversion
    const numericFields = [
      'current_weight', 'height_cm', 'body_fat_percentage', 'waist_circumference',
      'training_frequency', 'training_duration', 'steps_per_day', 'sleep_hours',
      'target_weight'
    ]
    
    // Define integer fields
    const integerFields = ['age', 'training_frequency', 'training_duration', 'steps_per_day']
    
    // Define boolean fields
    const booleanFields = ['kitchen_access', 'food_as_reward']
    
    allowedFields.forEach(field => {
      if (profileData[field] !== undefined && profileData[field] !== null && profileData[field] !== '') {
        // Handle JSONB fields
        if (['allergies', 'dislikes', 'previous_diet_attempts'].includes(field)) {
          cleanedData[field] = Array.isArray(profileData[field]) 
            ? JSON.stringify(profileData[field]) 
            : profileData[field]
        }
        // Handle boolean fields
        else if (booleanFields.includes(field)) {
          cleanedData[field] = Boolean(profileData[field])
        }
        // Handle integer fields
        else if (integerFields.includes(field)) {
          const value = parseFloat(profileData[field])
          cleanedData[field] = !isNaN(value) ? Math.round(value) : null
        }
        // Handle numeric/decimal fields
        else if (numericFields.includes(field)) {
          const value = parseFloat(profileData[field])
          cleanedData[field] = !isNaN(value) ? value : null
        }
        // Handle all other fields as strings
        else {
          cleanedData[field] = String(profileData[field])
        }
      }
    })

    // Check if profile exists
    const existing = await pool.query(
      'SELECT id FROM client_nutrition_profiles WHERE client_id = $1',
      [clientId]
    )

    if (existing.rows.length > 0) {
      // Update existing profile
      const updateFields = []
      const updateValues = []
      let paramCount = 1

      Object.keys(cleanedData).forEach(key => {
        updateFields.push(`${key} = $${paramCount++}`)
        updateValues.push(cleanedData[key])
      })

      if (updateFields.length === 0) {
        return res.status(400).json({ message: 'No valid fields to update' })
      }

      updateValues.push(clientId)

      await pool.query(
        `UPDATE client_nutrition_profiles 
         SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE client_id = $${paramCount}`,
        updateValues
      )

      const updated = await pool.query(
        'SELECT * FROM client_nutrition_profiles WHERE client_id = $1',
        [clientId]
      )

      res.json(updated.rows[0])
    } else {
      // Create new profile
      const fields = Object.keys(cleanedData)
      if (fields.length === 0) {
        return res.status(400).json({ message: 'No valid fields to create profile' })
      }

      const placeholders = fields.map((_, i) => `$${i + 3}`).join(', ')
      
      const result = await pool.query(
        `INSERT INTO client_nutrition_profiles (client_id, trainer_id, ${fields.join(', ')})
         VALUES ($1, $2, ${placeholders})
         RETURNING *`,
        [clientId, req.user.id, ...fields.map(f => cleanedData[f])]
      )

      res.status(201).json(result.rows[0])
    }
  } catch (error) {
    console.error('Error saving nutrition profile:', error)
    res.status(500).json({ message: 'Failed to save nutrition profile', error: error.message })
  }
})

// ============================================
// FOOD DATABASE ENDPOINTS
// ============================================

// Search foods
router.get('/foods/search', async (req, res) => {
  try {
    const { search, category, is_vegan, is_vegetarian, is_gluten_free, is_dairy_free, is_nut_free } = req.query

    let query = 'SELECT * FROM foods WHERE 1=1'
    const params = []
    let paramCount = 1

    if (search) {
      query += ` AND name ILIKE $${paramCount++}`
      params.push(`%${search}%`)
    }

    if (category) {
      query += ` AND category = $${paramCount++}`
      params.push(category)
    }

    if (is_vegan === 'true') {
      query += ` AND is_vegan = true`
    }

    if (is_vegetarian === 'true') {
      query += ` AND is_vegetarian = true`
    }

    if (is_gluten_free === 'true') {
      query += ` AND is_gluten_free = true`
    }

    if (is_dairy_free === 'true') {
      query += ` AND is_dairy_free = true`
    }

    if (is_nut_free === 'true') {
      query += ` AND is_nut_free = true`
    }

    query += ' ORDER BY name LIMIT 100'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Error searching foods:', error)
    res.status(500).json({ message: 'Failed to search foods' })
  }
})

// Get food by ID
router.get('/foods/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('SELECT * FROM foods WHERE id = $1', [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Food not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching food:', error)
    res.status(500).json({ message: 'Failed to fetch food' })
  }
})

// ============================================
// NUTRITION PLANS ENDPOINTS
// ============================================

// Create nutrition plan
router.post('/plans', requireRole(['trainer']), async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const {
      client_id,
      plan_name,
      daily_calories,
      daily_protein,
      daily_carbs,
      daily_fats,
      nutrition_approach, // 'macro_tracking', 'meal_plan', 'portion_control', 'hybrid'
      meal_frequency,
      calculation_method,
      activity_multiplier,
      bmr,
      tdee,
      goal_adjustment,
      plan_type,
      rate_of_change,
      meal_distribution,
      notes,
      start_date,
      end_date
    } = req.body

    // Verify client belongs to trainer
    const clientCheck = await client.query(
      'SELECT user_id FROM clients WHERE user_id = $1 AND trainer_id = $2',
      [client_id, req.user.id]
    )

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    // Create nutrition plan
    const planResult = await client.query(
      `INSERT INTO nutrition_plans (
        client_id, trainer_id, plan_name, daily_calories, daily_protein, daily_carbs, daily_fats,
        nutrition_approach, meal_frequency, calculation_method, activity_multiplier, bmr, tdee,
        goal_adjustment, plan_type, rate_of_change, meal_distribution, notes, start_date, end_date, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, true)
      RETURNING *`,
      [
        client_id, req.user.id, plan_name, daily_calories, daily_protein, daily_carbs, daily_fats,
        nutrition_approach, meal_frequency, calculation_method, activity_multiplier, bmr, tdee,
        goal_adjustment, plan_type, rate_of_change, meal_distribution || null, notes || null,
        start_date || new Date().toISOString().split('T')[0], end_date || null
      ]
    )

    const plan = planResult.rows[0]

    await client.query('COMMIT')
    res.status(201).json(plan)
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error creating nutrition plan:', error)
    res.status(500).json({ message: 'Failed to create nutrition plan', error: error.message })
  } finally {
    client.release()
  }
})

// Get nutrition plans for a client (trainer view)
router.get('/plans/client/:clientId', requireRole(['trainer']), async (req, res) => {
  try {
    const { clientId } = req.params

    // Verify client belongs to trainer
    const clientCheck = await pool.query(
      'SELECT user_id FROM clients WHERE user_id = $1 AND trainer_id = $2',
      [clientId, req.user.id]
    )

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    const result = await pool.query(
      `SELECT * FROM nutrition_plans 
       WHERE client_id = $1 
       ORDER BY created_at DESC`,
      [clientId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching nutrition plans:', error)
    res.status(500).json({ message: 'Failed to fetch nutrition plans' })
  }
})

// Get active nutrition plan for client (client view)
router.get('/plans/active', requireRole(['client']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT np.*, 
              json_agg(
                json_build_object(
                  'id', mpm.id,
                  'day_number', mpm.day_number,
                  'meal_number', mpm.meal_number,
                  'meal_name', mpm.meal_name,
                  'meal_time', mpm.meal_time,
                  'target_calories', mpm.target_calories,
                  'target_protein', mpm.target_protein,
                  'target_carbs', mpm.target_carbs,
                  'target_fats', mpm.target_fats,
                  'recipe_id', mpm.recipe_id,
                  'custom_meal', mpm.custom_meal,
                  'alternative_options', mpm.alternative_options,
                  'foods', (
                    SELECT json_agg(
                      json_build_object(
                        'id', mpf.id,
                        'food_id', mpf.food_id,
                        'food_name', mpf.food_name,
                        'quantity', mpf.quantity,
                        'unit', mpf.unit,
                        'calories', mpf.calories,
                        'protein', mpf.protein,
                        'carbs', mpf.carbs,
                        'fats', mpf.fats
                      ) ORDER BY mpf.order_index
                    )
                    FROM meal_plan_foods mpf
                    WHERE mpf.meal_plan_meal_id = mpm.id
                  )
                ) ORDER BY mpm.day_number, mpm.meal_number
              ) as meals
       FROM nutrition_plans np
       LEFT JOIN meal_plan_meals mpm ON np.id = mpm.nutrition_plan_id
       WHERE np.client_id = $1 AND np.is_active = true
       GROUP BY np.id
       ORDER BY np.created_at DESC
       LIMIT 1`,
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.json(null)
    }

    const plan = result.rows[0]
    plan.meals = plan.meals[0] ? plan.meals : []

    res.json(plan)
  } catch (error) {
    console.error('Error fetching active nutrition plan:', error)
    res.status(500).json({ message: 'Failed to fetch nutrition plan' })
  }
})

// Get all nutrition plans for trainer (MUST come before /plans/:id)
router.get('/plans/trainer', requireRole(['trainer']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT np.*, 
              u.name as client_name, 
              u.email as client_email
       FROM nutrition_plans np
       JOIN clients c ON np.client_id = c.user_id
       JOIN users u ON c.user_id = u.id
       WHERE np.trainer_id = $1
       ORDER BY np.created_at DESC`,
      [req.user.id]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching trainer nutrition plans:', error)
    res.status(500).json({ message: 'Failed to fetch nutrition plans' })
  }
})

// Get specific nutrition plan with meals
router.get('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      `SELECT np.*, 
              json_agg(
                json_build_object(
                  'id', mpm.id,
                  'day_number', mpm.day_number,
                  'meal_number', mpm.meal_number,
                  'meal_name', mpm.meal_name,
                  'meal_time', mpm.meal_time,
                  'target_calories', mpm.target_calories,
                  'target_protein', mpm.target_protein,
                  'target_carbs', mpm.target_carbs,
                  'target_fats', mpm.target_fats,
                  'recipe_id', mpm.recipe_id,
                  'custom_meal', mpm.custom_meal,
                  'alternative_options', mpm.alternative_options,
                  'foods', (
                    SELECT json_agg(
                      json_build_object(
                        'id', mpf.id,
                        'food_id', mpf.food_id,
                        'food_name', mpf.food_name,
                        'quantity', mpf.quantity,
                        'unit', mpf.unit,
                        'calories', mpf.calories,
                        'protein', mpf.protein,
                        'carbs', mpf.carbs,
                        'fats', mpf.fats
                      ) ORDER BY mpf.order_index
                    )
                    FROM meal_plan_foods mpf
                    WHERE mpf.meal_plan_meal_id = mpm.id
                  )
                ) ORDER BY mpm.day_number, mpm.meal_number
              ) as meals
       FROM nutrition_plans np
       LEFT JOIN meal_plan_meals mpm ON np.id = mpm.nutrition_plan_id
       WHERE np.id = $1
       GROUP BY np.id`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Nutrition plan not found' })
    }

    const plan = result.rows[0]
    plan.meals = plan.meals[0] ? plan.meals : []

    res.json(plan)
  } catch (error) {
    console.error('Error fetching nutrition plan:', error)
    res.status(500).json({ message: 'Failed to fetch nutrition plan' })
  }
})

// Update nutrition plan
router.put('/plans/:id', requireRole(['trainer']), async (req, res) => {
  try {
    const { id } = req.params
    const updateData = req.body

    // Verify plan belongs to trainer
    const planCheck = await pool.query(
      'SELECT id FROM nutrition_plans WHERE id = $1 AND trainer_id = $2',
      [id, req.user.id]
    )

    if (planCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Nutrition plan not found' })
    }

    // Build update query dynamically
    const allowedFields = [
      'plan_name', 'daily_calories', 'daily_protein', 'daily_carbs', 'daily_fats',
      'nutrition_approach', 'meal_frequency', 'notes', 'is_active', 'start_date', 'end_date'
    ]

    const updates = []
    const values = []
    let paramCount = 1

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updates.push(`${field} = $${paramCount++}`)
        values.push(updateData[field])
      }
    })

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' })
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    const result = await pool.query(
      `UPDATE nutrition_plans 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    )

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating nutrition plan:', error)
    res.status(500).json({ message: 'Failed to update nutrition plan', error: error.message })
  }
})

// Delete nutrition plan
router.delete('/plans/:id', requireRole(['trainer']), async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { id } = req.params

    // Verify plan belongs to trainer
    const planCheck = await client.query(
      'SELECT id FROM nutrition_plans WHERE id = $1 AND trainer_id = $2',
      [id, req.user.id]
    )

    if (planCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Nutrition plan not found' })
    }

    // Delete related meal plan foods first (if any)
    await client.query(
      `DELETE FROM meal_plan_foods 
       WHERE meal_plan_meal_id IN (
         SELECT id FROM meal_plan_meals WHERE nutrition_plan_id = $1
       )`,
      [id]
    )

    // Delete meal plan meals
    await client.query(
      'DELETE FROM meal_plan_meals WHERE nutrition_plan_id = $1',
      [id]
    )

    // Delete the nutrition plan (this will cascade and remove it from client)
    await client.query(
      'DELETE FROM nutrition_plans WHERE id = $1',
      [id]
    )

    await client.query('COMMIT')
    res.json({ message: 'Nutrition plan deleted successfully' })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error deleting nutrition plan:', error)
    res.status(500).json({ message: 'Failed to delete nutrition plan', error: error.message })
  } finally {
    client.release()
  }
})

// ============================================
// NUTRITION LOGS (Enhanced)
// ============================================

// Get nutrition logs for a client
router.get('/logs', requireRole(['client']), async (req, res) => {
  try {
    const { start_date, end_date } = req.query

    let query = 'SELECT * FROM nutrition_logs WHERE client_id = $1'
    const params = [req.user.id]
    let paramCount = 2

    if (start_date) {
      query += ` AND log_date >= $${paramCount++}`
      params.push(start_date)
    }

    if (end_date) {
      query += ` AND log_date <= $${paramCount++}`
      params.push(end_date)
    }

    query += ' ORDER BY log_date DESC, created_at DESC'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching nutrition logs:', error)
    res.status(500).json({ message: 'Failed to fetch nutrition logs' })
  }
})

// Create nutrition log entry
router.post('/logs', requireRole(['client']), async (req, res) => {
  try {
    const { log_date, meal_type, food_name, quantity, unit, calories, protein, carbs, fats, notes, meal_plan_meal_id } = req.body

    // Validate required fields
    if (!food_name || food_name.trim() === '') {
      return res.status(400).json({ message: 'Food name is required' })
    }

    // Convert numeric values, defaulting to 0 if not provided
    // IMPORTANT: Use the provided log_date (which should be in local timezone YYYY-MM-DD format)
    // If not provided, get today's date in local timezone (not UTC)
    let logDate = log_date
    if (!logDate) {
      // Get today's date in server's local timezone (YYYY-MM-DD)
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      logDate = `${year}-${month}-${day}`
    }
    
    // Ensure logDate is in YYYY-MM-DD format (extract date part if it's a timestamp)
    if (typeof logDate === 'string' && logDate.includes('T')) {
      logDate = logDate.split('T')[0]
    }
    const numQuantity = quantity ? parseFloat(quantity) : 1
    const numCalories = calories ? parseFloat(calories) : 0
    const numProtein = protein ? parseFloat(protein) : 0
    const numCarbs = carbs ? parseFloat(carbs) : 0
    const numFats = fats ? parseFloat(fats) : 0

    console.log('Creating nutrition log:', {
      client_id: req.user.id,
      log_date: logDate,
      meal_type,
      food_name,
      quantity: numQuantity,
      unit,
      calories: numCalories,
      protein: numProtein,
      carbs: numCarbs,
      fats: numFats
    })

    const result = await pool.query(
      `INSERT INTO nutrition_logs 
       (client_id, log_date, meal_type, food_name, quantity, unit, calories, protein, carbs, fats, notes, meal_plan_meal_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [req.user.id, logDate, meal_type, food_name.trim(), numQuantity, unit || 'serving', numCalories, numProtein, numCarbs, numFats, notes || null, meal_plan_meal_id || null]
    )

    console.log('Nutrition log created successfully:', result.rows[0])
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating nutrition log:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint
    })
    res.status(500).json({ 
      message: 'Failed to create nutrition log',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Get daily totals for a date range
router.get('/logs/totals', requireRole(['client']), async (req, res) => {
  try {
    const { start_date, end_date } = req.query

    let query = `
      SELECT 
        log_date,
        SUM(calories) as total_calories,
        SUM(protein) as total_protein,
        SUM(carbs) as total_carbs,
        SUM(fats) as total_fats,
        COUNT(*) as log_count
      FROM nutrition_logs
      WHERE client_id = $1
    `
    const params = [req.user.id]
    let paramCount = 2

    if (start_date) {
      query += ` AND log_date >= $${paramCount++}`
      params.push(start_date)
    }

    if (end_date) {
      query += ` AND log_date <= $${paramCount++}`
      params.push(end_date)
    }

    query += ' GROUP BY log_date ORDER BY log_date DESC'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching nutrition totals:', error)
    res.status(500).json({ message: 'Failed to fetch nutrition totals' })
  }
})

// Delete nutrition log entry
router.delete('/logs/:id', requireRole(['client']), async (req, res) => {
  try {
    const { id } = req.params

    // Verify log belongs to client
    const logCheck = await pool.query(
      'SELECT id FROM nutrition_logs WHERE id = $1 AND client_id = $2',
      [id, req.user.id]
    )

    if (logCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Log not found' })
    }

    await pool.query('DELETE FROM nutrition_logs WHERE id = $1', [id])

    res.json({ message: 'Log deleted successfully' })
  } catch (error) {
    console.error('Error deleting nutrition log:', error)
    res.status(500).json({ message: 'Failed to delete nutrition log' })
  }
})

// ============================================
// MEAL RECOMMENDATIONS ENDPOINTS
// ============================================

// Get meal recommendations for a client (trainer view)
router.get('/meals/recommendations/:clientId', requireRole(['trainer']), async (req, res) => {
  try {
    const { clientId } = req.params
    const { category, type } = req.query

    // Verify client belongs to trainer
    const clientCheck = await pool.query(
      'SELECT user_id FROM clients WHERE user_id = $1 AND trainer_id = $2',
      [clientId, req.user.id]
    )

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    let query = `
      SELECT tmr.*, 
             tmr.recipe_id,
             r.name as recipe_name,
             r.description as recipe_description,
             r.image_url,
             r.ingredients,
             r.instructions,
             r.is_vegan,
             r.is_vegetarian,
             r.is_gluten_free,
             r.is_dairy_free,
             r.is_nut_free,
             r.is_quick_meal,
             r.is_meal_prep_friendly,
             r.prep_time,
             r.cook_time,
             r.total_time,
             r.total_yield,
             r.difficulty_level,
             r.equipment_needed,
             r.substitution_options,
             r.prep_tips,
             r.storage_tips,
             r.nutrition_tips,
             r.storage_instructions
      FROM trainer_meal_recommendations tmr
      LEFT JOIN recipes r ON tmr.recipe_id = r.id
      WHERE tmr.client_id = $1 AND tmr.trainer_id = $2 AND tmr.is_active = true
    `
    const params = [clientId, req.user.id]
    let paramCount = 3

    if (category) {
      query += ` AND tmr.meal_category = $${paramCount++}`
      params.push(category)
    }

    if (type) {
      query += ` AND tmr.recommendation_type = $${paramCount++}`
      params.push(type)
    }

    query += ' ORDER BY tmr.priority DESC, tmr.created_at DESC'

    const result = await pool.query(query, params)
    
    // Parse JSONB fields for each meal recommendation
    const parsedRows = result.rows.map(row => {
      // Parse ingredients if it's a string
      if (row.ingredients && typeof row.ingredients === 'string') {
        try {
          row.ingredients = JSON.parse(row.ingredients)
        } catch (e) {
          row.ingredients = []
        }
      }
      // Parse equipment_needed if it's a string
      if (row.equipment_needed && typeof row.equipment_needed === 'string') {
        try {
          row.equipment_needed = JSON.parse(row.equipment_needed)
        } catch (e) {
          row.equipment_needed = []
        }
      }
      // Parse substitution_options if it's a string
      if (row.substitution_options && typeof row.substitution_options === 'string') {
        try {
          row.substitution_options = JSON.parse(row.substitution_options)
        } catch (e) {
          row.substitution_options = []
        }
      }
      return row
    })
    
    res.json(parsedRows)
  } catch (error) {
    console.error('Error fetching meal recommendations:', error)
    res.status(500).json({ message: 'Failed to fetch meal recommendations' })
  }
})

// Create meal recommendation (trainer)
router.post('/meals/recommendations', requireRole(['trainer']), async (req, res) => {
  try {
    const {
      client_id,
      recipe_id,
      meal_name,
      meal_description,
      meal_category,
      meal_type,
      calories_per_serving,
      protein_per_serving,
      carbs_per_serving,
      fats_per_serving,
      is_assigned,
      assigned_day_number,
      assigned_date,
      assigned_meal_slot,
      recommendation_type,
      priority,
      notes,
      nutrition_plan_id
    } = req.body

    // Verify client belongs to trainer
    const clientCheck = await pool.query(
      'SELECT user_id FROM clients WHERE user_id = $1 AND trainer_id = $2',
      [client_id, req.user.id]
    )

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    // Validate required fields
    if (!meal_name || meal_name.trim() === '') {
      return res.status(400).json({ message: 'Meal name is required' })
    }
    if (!meal_category) {
      return res.status(400).json({ message: 'Meal category is required' })
    }

    // Check if recipe details are provided (ingredients and instructions)
    const recipeData = req.body.recipe
    let finalRecipeId = recipe_id

    // If recipe details provided, create a recipe first
    if (recipeData && recipeData.ingredients && Array.isArray(recipeData.ingredients) && recipeData.ingredients.length > 0 && recipeData.instructions && recipeData.instructions.trim() !== '') {
      const recipeResult = await pool.query(
        `INSERT INTO recipes (
          name, description, category, total_yield, prep_time, cook_time, total_time,
          difficulty_level, equipment_needed, calories_per_serving, protein_per_serving,
          carbs_per_serving, fats_per_serving, ingredients, instructions,
          storage_instructions, substitution_options, tags, is_vegan, is_vegetarian,
          is_gluten_free, is_dairy_free, is_nut_free, image_url, video_url,
          nutrition_tips, prep_tips, storage_tips, serving_suggestions,
          is_quick_meal, is_meal_prep_friendly, created_by, is_system_recipe
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)
        RETURNING id`,
        [
          meal_name.trim(),
          meal_description?.trim() || recipeData.description?.trim() || null,
          meal_category,
          recipeData.total_yield ? parseInt(recipeData.total_yield) : 1,
          recipeData.prep_time ? parseInt(recipeData.prep_time) : null,
          recipeData.cook_time ? parseInt(recipeData.cook_time) : null,
          recipeData.total_time ? parseInt(recipeData.total_time) : null,
          recipeData.difficulty_level || null,
          recipeData.equipment_needed ? JSON.stringify(recipeData.equipment_needed) : null,
          calories_per_serving ? parseFloat(calories_per_serving) : null,
          protein_per_serving ? parseFloat(protein_per_serving) : null,
          carbs_per_serving ? parseFloat(carbs_per_serving) : null,
          fats_per_serving ? parseFloat(fats_per_serving) : null,
          JSON.stringify(recipeData.ingredients),
          recipeData.instructions.trim(),
          recipeData.storage_instructions?.trim() || recipeData.storage_tips?.trim() || null,
          recipeData.substitution_options ? JSON.stringify(recipeData.substitution_options) : null,
          recipeData.tags ? JSON.stringify(recipeData.tags) : null,
          recipeData.is_vegan || false,
          recipeData.is_vegetarian !== undefined ? recipeData.is_vegetarian : true,
          recipeData.is_gluten_free || false,
          recipeData.is_dairy_free || false,
          recipeData.is_nut_free || false,
          recipeData.image_url || null,
          recipeData.video_url || null,
          recipeData.nutrition_tips?.trim() || null,
          recipeData.prep_tips?.trim() || null,
          recipeData.storage_tips?.trim() || null,
          recipeData.serving_suggestions?.trim() || null,
          recipeData.is_quick_meal || false,
          recipeData.is_meal_prep_friendly || false,
          req.user.id,
          false
        ]
      )
      finalRecipeId = recipeResult.rows[0].id
    }

    // If recipe_id provided (or just created), get macros from recipe
    let finalCalories = calories_per_serving
    let finalProtein = protein_per_serving
    let finalCarbs = carbs_per_serving
    let finalFats = fats_per_serving

    if (finalRecipeId) {
      const recipeResult = await pool.query(
        'SELECT calories_per_serving, protein_per_serving, carbs_per_serving, fats_per_serving, name FROM recipes WHERE id = $1',
        [finalRecipeId]
      )
      if (recipeResult.rows.length > 0) {
        const recipe = recipeResult.rows[0]
        finalCalories = finalCalories || recipe.calories_per_serving
        finalProtein = finalProtein || recipe.protein_per_serving
        finalCarbs = finalCarbs || recipe.carbs_per_serving
        finalFats = finalFats || recipe.fats_per_serving
        if (!meal_name || meal_name.trim() === '') {
          meal_name = recipe.name
        }
      }
    }

    // Ensure macros are valid numbers
    finalCalories = finalCalories ? parseFloat(finalCalories) : null
    finalProtein = finalProtein ? parseFloat(finalProtein) : null
    finalCarbs = finalCarbs ? parseFloat(finalCarbs) : null
    finalFats = finalFats ? parseFloat(finalFats) : null

    const result = await pool.query(
      `INSERT INTO trainer_meal_recommendations (
        trainer_id, client_id, nutrition_plan_id, recipe_id, meal_name, meal_description,
        meal_category, meal_type, calories_per_serving, protein_per_serving,
        carbs_per_serving, fats_per_serving, is_assigned, assigned_day_number,
        assigned_date, assigned_meal_slot, recommendation_type, priority, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        req.user.id, client_id, nutrition_plan_id || null, finalRecipeId || null,
        meal_name, meal_description || null, meal_category, meal_type || null,
        finalCalories, finalProtein, finalCarbs, finalFats,
        is_assigned || false, assigned_day_number || null, assigned_date || null,
        assigned_meal_slot || null, recommendation_type || 'flexible', priority || 0, notes || null
      ]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating meal recommendation:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint
    })
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create meal recommendation'
    if (error.code === '23502') { // NOT NULL violation
      errorMessage = `Missing required field: ${error.column || 'unknown'}`
    } else if (error.code === '23503') { // Foreign key violation
      errorMessage = 'Invalid reference: client or trainer not found'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    res.status(500).json({ message: errorMessage, error: error.message, code: error.code })
  }
})

// Update meal recommendation (trainer)
router.put('/meals/recommendations/:id', requireRole(['trainer']), async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Verify recommendation belongs to trainer
    const checkResult = await pool.query(
      'SELECT * FROM trainer_meal_recommendations WHERE id = $1 AND trainer_id = $2',
      [id, req.user.id]
    )

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Recommendation not found' })
    }

    const existingMeal = checkResult.rows[0]

    // Check if recipe details are provided (ingredients and instructions)
    const recipeData = req.body.recipe
    let finalRecipeId = existingMeal.recipe_id

    console.log('Update meal recommendation - recipeData:', recipeData ? 'present' : 'missing')
    console.log('Update meal recommendation - existing recipe_id:', existingMeal.recipe_id)
    if (recipeData) {
      console.log('Recipe data details:', {
        has_ingredients: !!(recipeData.ingredients && Array.isArray(recipeData.ingredients)),
        ingredients_length: recipeData.ingredients ? recipeData.ingredients.length : 0,
        has_instructions: !!(recipeData.instructions && recipeData.instructions.trim() !== ''),
        instructions_length: recipeData.instructions ? recipeData.instructions.length : 0
      })
    }

    // If recipe details provided, create or update recipe
    if (recipeData && recipeData.ingredients && Array.isArray(recipeData.ingredients) && recipeData.ingredients.length > 0 && recipeData.instructions && recipeData.instructions.trim() !== '') {
      console.log('Creating/updating recipe with ingredients:', recipeData.ingredients.length)
      console.log('Instructions preview:', recipeData.instructions.substring(0, 50))
      if (existingMeal.recipe_id) {
        // Update existing recipe
        await pool.query(
          `UPDATE recipes SET
            name = $1,
            description = $2,
            category = $3,
            total_yield = $4,
            prep_time = $5,
            cook_time = $6,
            total_time = $7,
            difficulty_level = $8,
            equipment_needed = $9,
            calories_per_serving = $10,
            protein_per_serving = $11,
            carbs_per_serving = $12,
            fats_per_serving = $13,
            ingredients = $14,
            instructions = $15,
            storage_instructions = $16,
            substitution_options = $17,
            prep_tips = $18,
            storage_tips = $19,
            nutrition_tips = $20,
            is_vegan = $21,
            is_vegetarian = $22,
            is_gluten_free = $23,
            is_dairy_free = $24,
            is_quick_meal = $25,
            is_meal_prep_friendly = $26,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $27`,
          [
            updates.meal_name?.trim() || existingMeal.meal_name,
            updates.meal_description?.trim() || recipeData.description?.trim() || null,
            updates.meal_category || existingMeal.meal_category,
            recipeData.total_yield ? parseInt(recipeData.total_yield) : 1,
            recipeData.prep_time ? parseInt(recipeData.prep_time) : null,
            recipeData.cook_time ? parseInt(recipeData.cook_time) : null,
            recipeData.total_time ? parseInt(recipeData.total_time) : null,
            recipeData.difficulty_level || null,
            recipeData.equipment_needed ? JSON.stringify(recipeData.equipment_needed) : null,
            parseFloat(updates.calories_per_serving || existingMeal.calories_per_serving),
            parseFloat(updates.protein_per_serving || existingMeal.protein_per_serving),
            parseFloat(updates.carbs_per_serving || existingMeal.carbs_per_serving),
            parseFloat(updates.fats_per_serving || existingMeal.fats_per_serving),
            JSON.stringify(recipeData.ingredients.filter(ing => ing.trim() !== '')),
            recipeData.instructions.trim(),
            recipeData.storage_instructions?.trim() || recipeData.storage_tips?.trim() || null,
            recipeData.substitution_options ? JSON.stringify(recipeData.substitution_options) : null,
            recipeData.prep_tips?.trim() || null,
            recipeData.storage_tips?.trim() || null,
            recipeData.nutrition_tips?.trim() || null,
            recipeData.is_vegan || false,
            recipeData.is_vegetarian !== undefined ? recipeData.is_vegetarian : true,
            recipeData.is_gluten_free || false,
            recipeData.is_dairy_free || false,
            recipeData.is_quick_meal || false,
            recipeData.is_meal_prep_friendly || false,
            existingMeal.recipe_id
          ]
        )
        finalRecipeId = existingMeal.recipe_id
      } else {
        // Create new recipe
        const recipeResult = await pool.query(
          `INSERT INTO recipes (
            name, description, category, total_yield, prep_time, cook_time, total_time,
            difficulty_level, equipment_needed, calories_per_serving, protein_per_serving,
            carbs_per_serving, fats_per_serving, ingredients, instructions,
            storage_instructions, substitution_options, prep_tips, storage_tips,
            nutrition_tips, is_vegan, is_vegetarian, is_gluten_free, is_dairy_free,
            is_quick_meal, is_meal_prep_friendly, created_by, is_system_recipe
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
          RETURNING id`,
          [
            updates.meal_name?.trim() || existingMeal.meal_name,
            updates.meal_description?.trim() || recipeData.description?.trim() || null,
            updates.meal_category || existingMeal.meal_category,
            recipeData.total_yield ? parseInt(recipeData.total_yield) : 1,
            recipeData.prep_time ? parseInt(recipeData.prep_time) : null,
            recipeData.cook_time ? parseInt(recipeData.cook_time) : null,
            recipeData.total_time ? parseInt(recipeData.total_time) : null,
            recipeData.difficulty_level || null,
            recipeData.equipment_needed ? JSON.stringify(recipeData.equipment_needed) : null,
            parseFloat(updates.calories_per_serving || existingMeal.calories_per_serving),
            parseFloat(updates.protein_per_serving || existingMeal.protein_per_serving),
            parseFloat(updates.carbs_per_serving || existingMeal.carbs_per_serving),
            parseFloat(updates.fats_per_serving || existingMeal.fats_per_serving),
            JSON.stringify(recipeData.ingredients.filter(ing => ing.trim() !== '')),
            recipeData.instructions.trim(),
            recipeData.storage_instructions?.trim() || recipeData.storage_tips?.trim() || null,
            recipeData.substitution_options ? JSON.stringify(recipeData.substitution_options) : null,
            recipeData.prep_tips?.trim() || null,
            recipeData.storage_tips?.trim() || null,
            recipeData.nutrition_tips?.trim() || null,
            recipeData.is_vegan || false,
            recipeData.is_vegetarian !== undefined ? recipeData.is_vegetarian : true,
            recipeData.is_gluten_free || false,
            recipeData.is_dairy_free || false,
            recipeData.is_quick_meal || false,
            recipeData.is_meal_prep_friendly || false,
            req.user.id,
            false
          ]
        )
        finalRecipeId = recipeResult.rows[0].id
        console.log('✅ Created new recipe with ID:', finalRecipeId)
      }
    } else {
      console.log('⚠️ Recipe data provided but validation failed:', {
        has_ingredients: !!(recipeData.ingredients && Array.isArray(recipeData.ingredients) && recipeData.ingredients.length > 0),
        has_instructions: !!(recipeData.instructions && recipeData.instructions.trim() !== '')
      })
    }

    console.log('Final recipe_id to use:', finalRecipeId)

    const allowedFields = [
      'meal_name', 'meal_description', 'meal_category', 'meal_type',
      'calories_per_serving', 'protein_per_serving', 'carbs_per_serving', 'fats_per_serving',
      'is_assigned', 'assigned_day_number', 'assigned_date', 'assigned_meal_slot',
      'recommendation_type', 'priority', 'notes', 'is_active'
    ]

    const updateFields = []
    const values = []
    let paramCount = 1

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramCount++}`)
        values.push(updates[field])
      }
    }

    // Add recipe_id if a recipe was created/updated
    if (finalRecipeId && finalRecipeId !== existingMeal.recipe_id) {
      updateFields.push(`recipe_id = $${paramCount++}`)
      values.push(finalRecipeId)
      console.log('Adding recipe_id to update:', finalRecipeId)
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' })
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    console.log('Executing UPDATE query with fields:', updateFields)
    console.log('Values:', values)
    
    const result = await pool.query(
      `UPDATE trainer_meal_recommendations 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    )

    console.log('✅ Update successful. Returned meal:', {
      id: result.rows[0].id,
      meal_name: result.rows[0].meal_name,
      recipe_id: result.rows[0].recipe_id
    })

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating meal recommendation:', error)
    res.status(500).json({ message: 'Failed to update meal recommendation', error: error.message })
  }
})

// Delete meal recommendation (trainer)
router.delete('/meals/recommendations/:id', requireRole(['trainer']), async (req, res) => {
  try {
    const { id } = req.params

    // Verify recommendation belongs to trainer
    const checkResult = await pool.query(
      'SELECT id FROM trainer_meal_recommendations WHERE id = $1 AND trainer_id = $2',
      [id, req.user.id]
    )

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Recommendation not found' })
    }

    await pool.query('DELETE FROM trainer_meal_recommendations WHERE id = $1', [id])

    res.json({ message: 'Recommendation deleted successfully' })
  } catch (error) {
    console.error('Error deleting meal recommendation:', error)
    res.status(500).json({ message: 'Failed to delete meal recommendation' })
  }
})

// Get meal recommendations for client (client view)
router.get('/meals/recommended', requireRole(['client']), async (req, res) => {
  try {
    const { category, date } = req.query

    let query = `
      SELECT tmr.*, 
             r.id as recipe_id,
             r.name as recipe_name,
             r.description as recipe_description,
             r.image_url,
             r.ingredients,
             r.instructions,
             r.is_vegan,
             r.is_vegetarian,
             r.is_gluten_free,
             r.is_dairy_free,
             r.is_nut_free,
             r.is_quick_meal,
             r.is_meal_prep_friendly,
             r.prep_time,
             r.cook_time,
             r.total_time,
             r.total_yield,
             r.difficulty_level,
             r.equipment_needed,
             r.substitution_options,
             r.nutrition_tips,
             r.prep_tips,
             r.storage_tips,
             r.storage_instructions
      FROM trainer_meal_recommendations tmr
      LEFT JOIN recipes r ON tmr.recipe_id = r.id
      WHERE tmr.client_id = $1 AND tmr.is_active = true
    `
    const params = [req.user.id]
    let paramCount = 2

    if (category) {
      query += ` AND tmr.meal_category = $${paramCount++}`
      params.push(category)
    }

    if (date) {
      query += ` AND (tmr.assigned_date = $${paramCount++} OR tmr.assigned_date IS NULL)`
      params.push(date)
    }

    query += ' ORDER BY tmr.is_assigned DESC, tmr.priority DESC, tmr.created_at DESC'

    const result = await pool.query(query, params)

    // Parse JSONB fields for each meal recommendation
    const parsedRows = result.rows.map(row => {
      // Parse ingredients if it's a string
      if (row.ingredients && typeof row.ingredients === 'string') {
        try {
          row.ingredients = JSON.parse(row.ingredients)
        } catch (e) {
          row.ingredients = []
        }
      }
      // Parse equipment_needed if it's a string
      if (row.equipment_needed && typeof row.equipment_needed === 'string') {
        try {
          row.equipment_needed = JSON.parse(row.equipment_needed)
        } catch (e) {
          row.equipment_needed = []
        }
      }
      // Parse substitution_options if it's a string
      if (row.substitution_options && typeof row.substitution_options === 'string') {
        try {
          row.substitution_options = JSON.parse(row.substitution_options)
        } catch (e) {
          row.substitution_options = []
        }
      }
      return row
    })

    // Separate assigned and flexible recommendations
    const assigned = parsedRows.filter(r => r.is_assigned)
    const flexible = parsedRows.filter(r => !r.is_assigned)

    // Group flexible by category
    const flexibleByCategory = flexible.reduce((acc, meal) => {
      if (!acc[meal.meal_category]) {
        acc[meal.meal_category] = []
      }
      acc[meal.meal_category].push(meal)
      return acc
    }, {})

    res.json({
      assigned,
      flexible: flexibleByCategory,
      all: result.rows
    })
  } catch (error) {
    console.error('Error fetching recommended meals:', error)
    res.status(500).json({ message: 'Failed to fetch recommended meals' })
  }
})

// Client selects a meal
router.post('/meals/select', requireRole(['client']), async (req, res) => {
  try {
    const {
      recommendation_id,
      recipe_id,
      selected_date,
      meal_category,
      meal_slot,
      servings
    } = req.body

    // Get meal details from recommendation or recipe
    let mealData = null
    if (recommendation_id) {
      const recResult = await pool.query(
        `SELECT tmr.*, r.name as recipe_name
         FROM trainer_meal_recommendations tmr
         LEFT JOIN recipes r ON tmr.recipe_id = r.id
         WHERE tmr.id = $1 AND tmr.client_id = $2`,
        [recommendation_id, req.user.id]
      )
      if (recResult.rows.length > 0) {
        mealData = recResult.rows[0]
      }
    } else if (recipe_id) {
      const recipeResult = await pool.query(
        'SELECT * FROM recipes WHERE id = $1',
        [recipe_id]
      )
      if (recipeResult.rows.length > 0) {
        const recipe = recipeResult.rows[0]
        mealData = {
          recipe_id: recipe.id,
          meal_name: recipe.name,
          meal_category: recipe.category,
          calories_per_serving: recipe.calories_per_serving,
          protein_per_serving: recipe.protein_per_serving,
          carbs_per_serving: recipe.carbs_per_serving,
          fats_per_serving: recipe.fats_per_serving
        }
      }
    }

    if (!mealData) {
      return res.status(404).json({ message: 'Meal not found' })
    }

    const servingMultiplier = parseFloat(servings) || 1.0

    const result = await pool.query(
      `INSERT INTO client_meal_selections (
        client_id, recommendation_id, recipe_id, selected_date,
        meal_category, meal_slot, servings,
        actual_calories, actual_protein, actual_carbs, actual_fats
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        req.user.id,
        recommendation_id || null,
        mealData.recipe_id || recipe_id || null,
        selected_date,
        meal_category || mealData.meal_category,
        meal_slot || null,
        servingMultiplier,
        (mealData.calories_per_serving || 0) * servingMultiplier,
        (mealData.protein_per_serving || 0) * servingMultiplier,
        (mealData.carbs_per_serving || 0) * servingMultiplier,
        (mealData.fats_per_serving || 0) * servingMultiplier
      ]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error selecting meal:', error)
    res.status(500).json({ message: 'Failed to select meal', error: error.message })
  }
})

// Get weekly meal plan view
router.get('/meals/weekly', requireRole(['client']), async (req, res) => {
  try {
    const { week_start } = req.query
    const clientId = req.user.id

    // Calculate week dates
    const startDate = week_start ? new Date(week_start) : new Date()
    const dayOfWeek = startDate.getDay()
    const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Monday
    const monday = new Date(startDate.setDate(diff))
    monday.setHours(0, 0, 0, 0)

    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      weekDates.push(date.toISOString().split('T')[0])
    }

    // Get assigned meals from meal_plan_meals
    const planResult = await pool.query(
      `SELECT np.*, 
              json_agg(
                json_build_object(
                  'id', mpm.id,
                  'day_number', mpm.day_number,
                  'meal_number', mpm.meal_number,
                  'meal_name', mpm.meal_name,
                  'meal_time', mpm.meal_time,
                  'target_calories', mpm.target_calories,
                  'target_protein', mpm.target_protein,
                  'target_carbs', mpm.target_carbs,
                  'target_fats', mpm.target_fats,
                  'recipe_id', mpm.recipe_id,
                  'foods', (
                    SELECT json_agg(
                      json_build_object(
                        'id', mpf.id,
                        'food_name', mpf.food_name,
                        'quantity', mpf.quantity,
                        'unit', mpf.unit,
                        'calories', mpf.calories,
                        'protein', mpf.protein,
                        'carbs', mpf.carbs,
                        'fats', mpf.fats
                      )
                    )
                    FROM meal_plan_foods mpf
                    WHERE mpf.meal_plan_meal_id = mpm.id
                  )
                ) ORDER BY mpm.day_number, mpm.meal_number
              ) as meals
       FROM nutrition_plans np
       LEFT JOIN meal_plan_meals mpm ON np.id = mpm.nutrition_plan_id
       WHERE np.client_id = $1 AND np.is_active = true
       GROUP BY np.id
       LIMIT 1`,
      [clientId]
    )

    // Get client meal selections for the week
    const selectionsResult = await pool.query(
      `SELECT cms.*, 
             r.id as recipe_id,
             r.name as recipe_name,
             r.description as recipe_description,
             r.image_url,
             r.ingredients,
             r.instructions,
             r.is_vegan,
             r.is_vegetarian,
             r.is_gluten_free,
             r.is_dairy_free,
             r.is_quick_meal,
             r.is_meal_prep_friendly,
             r.prep_time,
             r.cook_time,
             r.total_time,
             r.total_yield,
             r.difficulty_level,
             r.equipment_needed,
             r.substitution_options,
             r.nutrition_tips,
             r.prep_tips,
             r.storage_tips,
             r.storage_instructions
       FROM client_meal_selections cms
       LEFT JOIN recipes r ON cms.recipe_id = r.id
       WHERE cms.client_id = $1 
       AND cms.selected_date >= $2 
       AND cms.selected_date <= $3
       ORDER BY cms.selected_date, cms.meal_slot`,
      [clientId, weekDates[0], weekDates[6]]
    )

    // Parse JSONB fields for client selections
    const parsedSelections = selectionsResult.rows.map(selection => {
      // Parse ingredients if it's a string
      if (selection.ingredients && typeof selection.ingredients === 'string') {
        try {
          selection.ingredients = JSON.parse(selection.ingredients)
        } catch (e) {
          selection.ingredients = []
        }
      }
      // Parse equipment_needed if it's a string
      if (selection.equipment_needed && typeof selection.equipment_needed === 'string') {
        try {
          selection.equipment_needed = JSON.parse(selection.equipment_needed)
        } catch (e) {
          selection.equipment_needed = []
        }
      }
      // Parse substitution_options if it's a string
      if (selection.substitution_options && typeof selection.substitution_options === 'string') {
        try {
          selection.substitution_options = JSON.parse(selection.substitution_options)
        } catch (e) {
          selection.substitution_options = []
        }
      }
      return selection
    })

    // Calculate weekly averages
    const weeklyTotals = parsedSelections.reduce((acc, selection) => ({
      calories: acc.calories + parseFloat(selection.actual_calories || 0),
      protein: acc.protein + parseFloat(selection.actual_protein || 0),
      carbs: acc.carbs + parseFloat(selection.actual_carbs || 0),
      fats: acc.fats + parseFloat(selection.actual_fats || 0),
      days: new Set([...acc.days, selection.selected_date]).size
    }), { calories: 0, protein: 0, carbs: 0, fats: 0, days: new Set() })

    const daysWithMeals = weeklyTotals.days.size
    const weeklyAverages = {
      calories: daysWithMeals > 0 ? Math.round(weeklyTotals.calories / daysWithMeals) : 0,
      protein: daysWithMeals > 0 ? Math.round(weeklyTotals.protein / daysWithMeals) : 0,
      carbs: daysWithMeals > 0 ? Math.round(weeklyTotals.carbs / daysWithMeals) : 0,
      fats: daysWithMeals > 0 ? Math.round(weeklyTotals.fats / daysWithMeals) : 0,
      days_logged: daysWithMeals
    }

    res.json({
      week_start: weekDates[0],
      week_end: weekDates[6],
      assigned_meals: planResult.rows[0]?.meals || [],
      client_selections: parsedSelections,
      weekly_averages: weeklyAverages
    })
  } catch (error) {
    console.error('Error fetching weekly meal plan:', error)
    res.status(500).json({ message: 'Failed to fetch weekly meal plan' })
  }
})

// ============================================
// RECIPE ENDPOINTS
// ============================================

// Get recipe by ID with full details
// Create recipe (trainer)
router.post('/recipes', requireRole(['trainer']), async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      total_yield,
      prep_time,
      cook_time,
      total_time,
      difficulty_level,
      equipment_needed,
      calories_per_serving,
      protein_per_serving,
      carbs_per_serving,
      fats_per_serving,
      ingredients,
      instructions,
      storage_instructions,
      substitution_options,
      tags,
      is_vegan,
      is_vegetarian,
      is_gluten_free,
      is_dairy_free,
      is_nut_free,
      image_url,
      video_url,
      nutrition_tips,
      prep_tips,
      storage_tips,
      serving_suggestions,
      is_quick_meal,
      is_meal_prep_friendly
    } = req.body

    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Recipe name is required' })
    }
    if (!category) {
      return res.status(400).json({ message: 'Category is required' })
    }
    if (!total_yield || total_yield < 1) {
      return res.status(400).json({ message: 'Total yield must be at least 1' })
    }
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ message: 'At least one ingredient is required' })
    }
    if (!instructions || instructions.trim() === '') {
      return res.status(400).json({ message: 'Instructions are required' })
    }

    const result = await pool.query(
      `INSERT INTO recipes (
        name, description, category, total_yield, prep_time, cook_time, total_time,
        difficulty_level, equipment_needed, calories_per_serving, protein_per_serving,
        carbs_per_serving, fats_per_serving, ingredients, instructions,
        storage_instructions, substitution_options, tags, is_vegan, is_vegetarian,
        is_gluten_free, is_dairy_free, is_nut_free, image_url, video_url,
        nutrition_tips, prep_tips, storage_tips, serving_suggestions,
        is_quick_meal, is_meal_prep_friendly, created_by, is_system_recipe
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)
      RETURNING *`,
      [
        name.trim(),
        description?.trim() || null,
        category,
        parseInt(total_yield),
        prep_time ? parseInt(prep_time) : null,
        cook_time ? parseInt(cook_time) : null,
        total_time ? parseInt(total_time) : null,
        difficulty_level || null,
        equipment_needed ? JSON.stringify(equipment_needed) : null,
        calories_per_serving ? parseFloat(calories_per_serving) : null,
        protein_per_serving ? parseFloat(protein_per_serving) : null,
        carbs_per_serving ? parseFloat(carbs_per_serving) : null,
        fats_per_serving ? parseFloat(fats_per_serving) : null,
        JSON.stringify(ingredients),
        instructions.trim(),
        storage_instructions?.trim() || null,
        substitution_options ? JSON.stringify(substitution_options) : null,
        tags ? JSON.stringify(tags) : null,
        is_vegan || false,
        is_vegetarian !== undefined ? is_vegetarian : true,
        is_gluten_free || false,
        is_dairy_free || false,
        is_nut_free || false,
        image_url || null,
        video_url || null,
        nutrition_tips?.trim() || null,
        prep_tips?.trim() || null,
        storage_tips?.trim() || null,
        serving_suggestions?.trim() || null,
        is_quick_meal || false,
        is_meal_prep_friendly || false,
        req.user.id,
        false // Not a system recipe
      ]
    )

    const recipe = result.rows[0]

    // Parse JSONB fields for response
    if (typeof recipe.ingredients === 'string') {
      try {
        recipe.ingredients = JSON.parse(recipe.ingredients)
      } catch (e) {
        recipe.ingredients = []
      }
    }
    if (typeof recipe.equipment_needed === 'string') {
      try {
        recipe.equipment_needed = JSON.parse(recipe.equipment_needed)
      } catch (e) {
        recipe.equipment_needed = []
      }
    }
    if (typeof recipe.substitution_options === 'string') {
      try {
        recipe.substitution_options = JSON.parse(recipe.substitution_options)
      } catch (e) {
        recipe.substitution_options = []
      }
    }
    if (typeof recipe.tags === 'string') {
      try {
        recipe.tags = JSON.parse(recipe.tags)
      } catch (e) {
        recipe.tags = []
      }
    }

    res.status(201).json(recipe)
  } catch (error) {
    console.error('Error creating recipe:', error)
    res.status(500).json({ message: 'Failed to create recipe', error: error.message })
  }
})

router.get('/recipes/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      `SELECT 
        r.*,
        u.name as created_by_name
       FROM recipes r
       LEFT JOIN users u ON r.created_by = u.id
       WHERE r.id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Recipe not found' })
    }

    const recipe = result.rows[0]

    // Parse JSONB fields if they're strings
    if (typeof recipe.ingredients === 'string') {
      try {
        recipe.ingredients = JSON.parse(recipe.ingredients)
      } catch (e) {
        recipe.ingredients = []
      }
    }
    if (typeof recipe.equipment_needed === 'string') {
      try {
        recipe.equipment_needed = JSON.parse(recipe.equipment_needed)
      } catch (e) {
        recipe.equipment_needed = []
      }
    }
    if (typeof recipe.substitution_options === 'string') {
      try {
        recipe.substitution_options = JSON.parse(recipe.substitution_options)
      } catch (e) {
        recipe.substitution_options = []
      }
    }
    if (typeof recipe.tags === 'string') {
      try {
        recipe.tags = JSON.parse(recipe.tags)
      } catch (e) {
        recipe.tags = []
      }
    }

    res.json(recipe)
  } catch (error) {
    console.error('Error fetching recipe:', error)
    res.status(500).json({ message: 'Failed to fetch recipe' })
  }
})

// ============================================
// AI MACRO CALCULATION ENDPOINT
// ============================================

// Calculate meal macros using AI based on ingredients and description
router.post('/meals/calculate-macros', requireRole(['trainer']), async (req, res) => {
  try {
    const { ingredients, meal_description, instructions, total_yield } = req.body

    if (!openai) {
      return res.status(503).json({ 
        message: 'AI service not available. Please configure OPENAI_API_KEY in environment variables.' 
      })
    }

    // Validate that we have ingredients or description
    if ((!ingredients || ingredients.length === 0 || ingredients.every(ing => !ing.trim())) && !meal_description && !instructions) {
      return res.status(400).json({ 
        message: 'Please provide at least ingredients, meal description, or instructions to calculate macros' 
      })
    }

    // Build the prompt for AI - ensure ingredients are properly formatted
    const ingredientsList = ingredients && ingredients.length > 0 
      ? ingredients.filter(ing => ing.trim()).map(ing => ing.trim()).join('\n- ')
      : 'Not specified'
    
    const description = meal_description || 'Not provided'
    const instructionsText = instructions || 'Not provided'
    const servings = total_yield || 1

    // Log the exact data being sent
    console.log('📊 Data being sent to AI:', {
      ingredients: ingredients,
      ingredientsList: ingredientsList,
      description: description,
      instructions: instructionsText,
      servings: servings,
      hasIngredients: ingredients && ingredients.length > 0 && ingredients.some(ing => ing.trim())
    })

    const prompt = `You are a professional nutritionist with access to USDA FoodData Central database. Calculate ACCURATE nutritional information for a meal.

WORKED EXAMPLE FIRST:
If ingredients are:
- 1 cup red lentils (cooked)
- 1 cup vegetable broth  
- 1 tablespoon olive oil
- 1/2 cup diced tomatoes

Step-by-step calculation:
1. Red lentils: 1 cup = 198g cooked
   - 198g × (116 cal/100g) = 230 cal
   - 198g × (9g protein/100g) = 17.8g protein
   - 198g × (20g carbs/100g) = 39.6g carbs
   - 198g × (0.4g fat/100g) = 0.8g fat

2. Vegetable broth: 1 cup = 240ml
   - 240ml × (5 cal/100ml) = 12 cal
   - 240ml × (0g protein/100ml) = 0g protein
   - 240ml × (1g carbs/100ml) = 2.4g carbs
   - 240ml × (0g fat/100ml) = 0g fat

3. Olive oil: 1 tbsp = 15ml
   - 15ml × (119 cal/15ml) = 119 cal
   - 0g protein, 0g carbs
   - 15ml × (13.5g fat/15ml) = 13.5g fat

4. Diced tomatoes: 1/2 cup = 120g
   - 120g × (18 cal/100g) = 22 cal
   - 120g × (0.9g protein/100g) = 1.1g protein
   - 120g × (3.9g carbs/100g) = 4.7g carbs
   - 120g × (0.2g fat/100g) = 0.2g fat

TOTAL for recipe: 383 cal, 18.9g protein, 46.7g carbs, 14.5g fat
PER SERVING (if 1 serving): 383 cal, 18.9g protein, 46.7g carbs, 14.5g fat

NOW CALCULATE FOR THIS MEAL:

MEAL DETAILS:
- Ingredients List:
${ingredientsList.split('\n').map(ing => `  - ${ing}`).join('\n')}
- Description: ${description}
- Preparation Instructions: ${instructionsText}
- Number of Servings: ${servings}

CRITICAL CALCULATION RULES:

1. INGREDIENT PARSING:
   - Parse each ingredient carefully, extracting the quantity and food item
   - Examples: "2 cups chicken breast" = 2 cups of chicken breast, "1 tbsp olive oil" = 1 tablespoon olive oil
   - If no quantity is specified, assume a reasonable standard serving (e.g., 1 cup for liquids, 100g for solids)

2. NUTRITION DATA SOURCE:
   - Use USDA FoodData Central nutrition database values
   - For common foods, use these reference values:
     * Chicken breast (cooked): 165 cal, 31g protein, 0g carbs, 3.6g fat per 100g
     * Red lentils (cooked): 116 cal, 9g protein, 20g carbs, 0.4g fat per 100g
     * Olive oil: 119 cal, 0g protein, 0g carbs, 13.5g fat per tablespoon
     * Avocado: 160 cal, 2g protein, 9g carbs, 15g fat per 100g
   - Use accurate, realistic values - if unsure, err on the side of standard USDA values

3. QUANTITY CONVERSIONS:
   - 1 cup = 240ml (liquids) or ~240g (solids like rice, lentils)
   - 1 tablespoon (tbsp) = 15ml or ~15g
   - 1 teaspoon (tsp) = 5ml or ~5g
   - 1 oz = 28.35g
   - 1 lb = 453.6g

4. CALCULATION PROCESS:
   a) For EACH ingredient in the list:
      - Identify the food item and quantity
      - Look up or calculate its nutrition per unit
      - Multiply by the quantity to get total nutrition for that ingredient
   
   b) Sum ALL ingredients to get TOTAL recipe nutrition
   
   c) Divide by number of servings to get PER SERVING values
   
   d) Round protein, carbs, fats to 1 decimal place
      Round calories to nearest whole number

5. DESCRIPTION/INSTRUCTIONS:
   - IGNORE conversational text in description (e.g., "we'll have this for dinner")
   - ONLY extract preparation ingredients from instructions if they have explicit quantities (e.g., "add 1 tbsp oil")
   - Do NOT count ingredients mentioned without quantities

6. VALIDATION CHECKS:
   - Calories should roughly equal: (protein × 4) + (carbs × 4) + (fats × 9) ± 10%
   - If the meal contains protein sources (meat, beans, lentils), protein should be substantial (typically 15-40g per serving)
   - If the meal contains grains/legumes, carbs should be substantial (typically 20-60g per serving)
   - Values that seem too low (e.g., <5g protein for a main dish) are likely incorrect - recalculate

7. EXAMPLES OF REALISTIC VALUES (use these as sanity checks):
   - Lentil soup (1 cup/240ml): ~230-280 cal, 15-20g protein, 35-45g carbs, 1-2g fat
   - Red lentil soup with vegetables (1 cup): ~250-300 cal, 18-22g protein, 40-50g carbs, 2-5g fat
   - Grilled chicken breast (6oz/170g): ~280 cal, 52g protein, 0g carbs, 6g fat
   - Chicken with rice (6oz chicken + 1 cup rice): ~500 cal, 45g protein, 45g carbs, 10g fat
   - If your calculated values are MUCH lower than these examples, you made an error - recalculate!

Return ONLY a valid JSON object:
{
  "calories_per_serving": <number - whole number>,
  "protein_per_serving": <number in grams - 1 decimal>,
  "carbs_per_serving": <number in grams - 1 decimal>,
  "fats_per_serving": <number in grams - 1 decimal>,
  "breakdown": {
    "total_calories": <total for entire recipe>,
    "total_protein": <total for entire recipe in grams>,
    "total_carbs": <total for entire recipe in grams>,
    "total_fats": <total for entire recipe in grams>
  },
  "notes": "<list each ingredient used and its contribution, e.g., '2 cups red lentils: 464 cal, 36g protein, 80g carbs, 1.6g fat; 1 tbsp olive oil: 119 cal, 0g protein, 0g carbs, 13.5g fat'"
}

CRITICAL: Double-check your calculations. Values must be realistic and match standard nutrition databases.`

    console.log('🤖 Calling OpenAI to calculate macros...')
    console.log('📋 Input data:', {
      ingredients: ingredients,
      ingredientsList: ingredientsList,
      description: description,
      instructions: instructionsText,
      servings: servings
    })

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a professional nutritionist with expertise in calculating accurate nutritional information using USDA FoodData Central database. You must provide precise, realistic values based on standard nutrition databases. Always return valid JSON only. Double-check all calculations for accuracy.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2, // Even lower temperature for more accurate, consistent results
      response_format: { type: 'json_object' }
    })

    const aiResponse = JSON.parse(completion.choices[0].message.content)

    // Validate and structure the response
    let calories = Math.round(parseFloat(aiResponse.calories_per_serving) || 0)
    // Fix: Multiply by 10, round, then divide by 10 to get 1 decimal place
    let protein = Math.round(parseFloat(aiResponse.protein_per_serving || 0) * 10) / 10
    let carbs = Math.round(parseFloat(aiResponse.carbs_per_serving || 0) * 10) / 10
    let fats = Math.round(parseFloat(aiResponse.fats_per_serving || 0) * 10) / 10

    // Validation: Check if values seem reasonable
    // Calories should roughly equal: (protein × 4) + (carbs × 4) + (fats × 9)
    const calculatedCalories = (protein * 4) + (carbs * 4) + (fats * 9)
    const calorieDifference = Math.abs(calories - calculatedCalories)
    const caloriePercentDiff = calories > 0 ? (calorieDifference / calories) * 100 : 0

    // If calories are way off (more than 20% difference), use calculated value
    if (caloriePercentDiff > 20 && calculatedCalories > 0) {
      console.warn(`⚠️ AI calories (${calories}) don't match calculated (${calculatedCalories.toFixed(0)}). Using calculated value.`)
      calories = Math.round(calculatedCalories)
    }

    // Enhanced validation - check for unrealistic values
    const hasProteinSource = ingredientsList.toLowerCase().includes('chicken') || 
                             ingredientsList.toLowerCase().includes('meat') || 
                             ingredientsList.toLowerCase().includes('lentil') || 
                             ingredientsList.toLowerCase().includes('bean') ||
                             ingredientsList.toLowerCase().includes('tofu') ||
                             ingredientsList.toLowerCase().includes('fish')
    
    const hasCarbSource = ingredientsList.toLowerCase().includes('rice') ||
                         ingredientsList.toLowerCase().includes('pasta') ||
                         ingredientsList.toLowerCase().includes('potato') ||
                         ingredientsList.toLowerCase().includes('bread') ||
                         ingredientsList.toLowerCase().includes('lentil') ||
                         ingredientsList.toLowerCase().includes('bean')

    if (calories < 100) {
      console.warn(`⚠️ Very low calories (${calories}) - may indicate calculation error`)
    }
    
    if (hasProteinSource && protein < 5) {
      console.warn(`⚠️ Very low protein (${protein}g) despite protein sources in ingredients - recalculating...`)
      // If protein is too low but we have protein sources, the AI likely made an error
      // We can't auto-fix this, but we'll warn the user
    }
    
    if (hasCarbSource && carbs < 10) {
      console.warn(`⚠️ Very low carbs (${carbs}g) despite carb sources in ingredients - may indicate calculation error`)
    }

    // Final sanity check - if values are clearly wrong, log detailed warning
    if ((hasProteinSource && protein < 5) || (hasCarbSource && carbs < 10) || calories < 100) {
      console.error(`❌ SUSPICIOUS VALUES DETECTED:`, {
        calories,
        protein,
        carbs,
        fats,
        ingredients: ingredientsList,
        aiResponse: aiResponse,
        suggestion: 'AI may have miscalculated. Please verify ingredients and try again.'
      })
    }

    const macros = {
      calories_per_serving: calories,
      protein_per_serving: protein,
      carbs_per_serving: carbs,
      fats_per_serving: fats,
      breakdown: aiResponse.breakdown || {},
      notes: aiResponse.notes || 'Calculated using AI based on provided ingredients and preparation methods.'
    }

    console.log('✅ AI calculated macros:', {
      raw: aiResponse,
      processed: macros,
      validation: {
        calculatedCalories: calculatedCalories,
        calorieDifference: calorieDifference,
        caloriePercentDiff: caloriePercentDiff.toFixed(1) + '%'
      }
    })

    res.json(macros)
  } catch (error) {
    console.error('Error calculating macros with AI:', error)
    
    // Handle OpenAI API errors
    if (error.response) {
      return res.status(500).json({ 
        message: 'AI service error', 
        error: error.response.data?.error?.message || error.message 
      })
    }
    
    res.status(500).json({ 
      message: 'Failed to calculate macros', 
      error: error.message 
    })
  }
})

export default router

