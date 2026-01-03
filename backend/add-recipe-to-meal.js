import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import readline from 'readline'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '.env') })

const { Pool } = pg

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'personal_trainer_app',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
})

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function addRecipeToMeal() {
  try {
    const mealId = process.argv[2]
    
    if (!mealId) {
      console.error('❌ Error: Please provide a meal recommendation ID')
      console.log('\nUsage: node backend/add-recipe-to-meal.js <meal_id>')
      console.log('\nExample: node backend/add-recipe-to-meal.js 2')
      process.exit(1)
    }

    // Get the meal
    const mealResult = await pool.query(
      'SELECT * FROM trainer_meal_recommendations WHERE id = $1',
      [mealId]
    )

    if (mealResult.rows.length === 0) {
      console.error(`❌ Meal with ID ${mealId} not found`)
      process.exit(1)
    }

    const meal = mealResult.rows[0]
    console.log(`\n📝 Meal: ${meal.meal_name}`)
    console.log(`   Category: ${meal.meal_category}`)
    console.log(`   Current recipe_id: ${meal.recipe_id || 'null'}\n`)

    if (meal.recipe_id) {
      console.log('⚠️  This meal already has a recipe_id. Do you want to create a new recipe? (y/n)')
      const answer = await question('> ')
      if (answer.toLowerCase() !== 'y') {
        console.log('Cancelled.')
        process.exit(0)
      }
    }

    // Collect recipe information
    console.log('\n🍳 Let\'s create a recipe for this meal:\n')

    const recipeName = await question(`Recipe name [${meal.meal_name}]: `) || meal.meal_name
    const description = await question('Description (optional): ') || null
    const totalYield = parseInt(await question('Total yield (servings) [1]: ') || '1')
    const prepTime = await question('Prep time in minutes (optional): ') || null
    const cookTime = await question('Cook time in minutes (optional): ') || null
    const difficultyLevel = await question('Difficulty (beginner/intermediate/advanced, optional): ') || null

    console.log('\n📋 Ingredients (enter one per line, type "done" when finished):')
    const ingredients = []
    while (true) {
      const ingredient = await question(`  Ingredient ${ingredients.length + 1}: `)
      if (ingredient.toLowerCase() === 'done' || ingredient.trim() === '') break
      ingredients.push(ingredient.trim())
    }

    if (ingredients.length === 0) {
      console.error('❌ Error: At least one ingredient is required')
      process.exit(1)
    }

    console.log('\n📖 Instructions (enter step by step, type "done" when finished):')
    const instructions = []
    while (true) {
      const step = await question(`  Step ${instructions.length + 1}: `)
      if (step.toLowerCase() === 'done' || step.trim() === '') break
      instructions.push(step.trim())
    }

    if (instructions.length === 0) {
      console.error('❌ Error: At least one instruction step is required')
      process.exit(1)
    }

    const prepTips = await question('\n💡 Preparation tips (optional): ') || null
    const storageTips = await question('💡 Storage tips (optional): ') || null
    const nutritionTips = await question('💡 Nutrition tips (optional): ') || null

    // Create the recipe
    const recipeResult = await pool.query(
      `INSERT INTO recipes (
        name, description, category, total_yield, prep_time, cook_time,
        difficulty_level, calories_per_serving, protein_per_serving,
        carbs_per_serving, fats_per_serving, ingredients, instructions,
        prep_tips, storage_tips, nutrition_tips, created_by, is_system_recipe
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING id`,
      [
        recipeName,
        description,
        meal.meal_category,
        totalYield,
        prepTime ? parseInt(prepTime) : null,
        cookTime ? parseInt(cookTime) : null,
        difficultyLevel,
        parseFloat(meal.calories_per_serving),
        parseFloat(meal.protein_per_serving),
        parseFloat(meal.carbs_per_serving),
        parseFloat(meal.fats_per_serving),
        JSON.stringify(ingredients),
        instructions.join('\n'),
        prepTips,
        storageTips,
        nutritionTips,
        meal.trainer_id,
        false
      ]
    )

    const recipeId = recipeResult.rows[0].id
    console.log(`\n✅ Recipe created with ID: ${recipeId}`)

    // Update the meal recommendation to link to the recipe
    await pool.query(
      'UPDATE trainer_meal_recommendations SET recipe_id = $1 WHERE id = $2',
      [recipeId, mealId]
    )

    console.log(`✅ Meal recommendation updated to link to recipe ${recipeId}`)
    console.log('\n🎉 Done! The meal now has a full recipe. Clients can view complete recipe details.')

    await pool.end()
    rl.close()
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Details:', error)
    process.exit(1)
  }
}

addRecipeToMeal()

