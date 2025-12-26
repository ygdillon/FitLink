import express from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { pool } from '../config/database.js'

const router = express.Router()

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

    const result = await pool.query(
      `INSERT INTO nutrition_logs 
       (client_id, log_date, meal_type, food_name, quantity, unit, calories, protein, carbs, fats, notes, meal_plan_meal_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [req.user.id, log_date || new Date().toISOString().split('T')[0], meal_type, food_name, quantity, unit, calories, protein, carbs, fats, notes || null, meal_plan_meal_id || null]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error creating nutrition log:', error)
    res.status(500).json({ message: 'Failed to create nutrition log' })
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

export default router

