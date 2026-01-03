// Script to seed exercise database and program templates
const { pool } = require('../backend/config/database.js')
const { exercises } = require('./seed_exercises.js')

async function seedExercises() {
  console.log('Seeding exercises...')
  let inserted = 0
  let skipped = 0

  for (const exercise of exercises) {
    try {
      const result = await pool.query(
        `INSERT INTO exercises (
          name, primary_muscle_group, secondary_muscle_groups, 
          movement_pattern, equipment_required, difficulty_level,
          form_cues, common_mistakes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (name) DO NOTHING
        RETURNING id`,
        [
          exercise.name,
          exercise.primary_muscle_group,
          JSON.stringify(exercise.secondary_muscle_groups || []),
          exercise.movement_pattern,
          exercise.equipment_required,
          exercise.difficulty_level,
          exercise.form_cues || null,
          exercise.common_mistakes || null
        ]
      )

      if (result.rows.length > 0) {
        inserted++
      } else {
        skipped++
      }
    } catch (error) {
      console.error(`Error inserting ${exercise.name}:`, error.message)
    }
  }

  console.log(`Exercises seeded: ${inserted} inserted, ${skipped} skipped`)
}

async function seedProgramTemplates() {
  console.log('Seeding program templates...')

  // Get exercise IDs for template creation
  const exerciseMap = {}
  const exerciseResult = await pool.query('SELECT id, name FROM exercises')
  exerciseResult.rows.forEach(ex => {
    exerciseMap[ex.name] = ex.id
  })

  // Template 1: Beginner Full Body (3 days/week)
  const template1 = await pool.query(
    `INSERT INTO program_templates (
      name, description, split_type, duration_weeks, target_experience_level,
      target_goal, target_days_per_week, target_equipment, target_session_duration,
      progression_type, is_system_template
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id`,
    [
      'Beginner Full Body',
      'Perfect for those new to training. Full body workouts 3x per week focusing on fundamental movements.',
      'full_body',
      4,
      'beginner',
      'general_fitness',
      3,
      'full_gym',
      60,
      'linear',
      true
    ]
  )

  const template1Id = template1.rows[0].id

  // Add workouts for template 1
  const workouts1 = [
    { name: 'Full Body A', day: 1, week: 1 },
    { name: 'Full Body B', day: 3, week: 1 },
    { name: 'Full Body C', day: 5, week: 1 }
  ]

  for (const workout of workouts1) {
    const workoutResult = await pool.query(
      `INSERT INTO template_workouts (template_id, workout_name, day_number, week_number)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [template1Id, workout.name, workout.day, workout.week]
    )
    const workoutId = workoutResult.rows[0].id

    // Add exercises (same for all weeks, progression handled by rules)
    const exercises = [
      { name: 'Goblet Squat', sets: 3, reps: '10-12', rest: '90 sec' },
      { name: 'Dumbbell Bench Press', sets: 3, reps: '10-12', rest: '90 sec' },
      { name: 'Dumbbell Row', sets: 3, reps: '10-12', rest: '90 sec' },
      { name: 'Dumbbell Shoulder Press', sets: 3, reps: '10-12', rest: '60 sec' },
      { name: 'Plank', sets: 3, reps: '30-45 sec', rest: '60 sec' }
    ]

    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i]
      const exerciseId = exerciseMap[ex.name]
      await pool.query(
        `INSERT INTO template_workout_exercises 
         (template_workout_id, exercise_id, exercise_name, sets, reps, rest, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [workoutId, exerciseId, ex.name, ex.sets, ex.reps, ex.rest, i]
      )
    }
  }

  // Template 2: Intermediate Upper/Lower (4 days/week)
  const template2 = await pool.query(
    `INSERT INTO program_templates (
      name, description, split_type, duration_weeks, target_experience_level,
      target_goal, target_days_per_week, target_equipment, target_session_duration,
      progression_type, is_system_template
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id`,
    [
      'Intermediate Upper/Lower',
      '4-day split alternating upper and lower body. Great for building muscle and strength.',
      'upper_lower',
      6,
      'intermediate',
      'build_muscle',
      4,
      'full_gym',
      60,
      'undulating',
      true
    ]
  )

  const template2Id = template2.rows[0].id

  // Template 3: Advanced Push/Pull/Legs (6 days/week)
  const template3 = await pool.query(
    `INSERT INTO program_templates (
      name, description, split_type, duration_weeks, target_experience_level,
      target_goal, target_days_per_week, target_equipment, target_session_duration,
      progression_type, is_system_template
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id`,
    [
      'Advanced Push/Pull/Legs',
      '6-day PPL split for advanced trainees. High volume for maximum muscle growth.',
      'push_pull_legs',
      8,
      'advanced',
      'build_muscle',
      6,
      'full_gym',
      75,
      'block',
      true
    ]
  )

  const template3Id = template3.rows[0].id

  // Template 4: Home Workout (Bodyweight/Dumbbells)
  const template4 = await pool.query(
    `INSERT INTO program_templates (
      name, description, split_type, duration_weeks, target_experience_level,
      target_goal, target_days_per_week, target_equipment, target_session_duration,
      progression_type, is_system_template
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id`,
    [
      'Home Workout Program',
      'Full body workouts using bodyweight and dumbbells. Perfect for home gyms.',
      'full_body',
      4,
      'beginner',
      'general_fitness',
      3,
      'dumbbells_only',
      45,
      'linear',
      true
    ]
  )

  const template4Id = template4.rows[0].id

  // Template 5: Fat Loss Circuit (4-5 days/week)
  const template5 = await pool.query(
    `INSERT INTO program_templates (
      name, description, split_type, duration_weeks, target_experience_level,
      target_goal, target_days_per_week, target_equipment, target_session_duration,
      progression_type, is_system_template
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id`,
    [
      'Fat Loss Circuit Training',
      'High-intensity circuit training for fat loss. Combines strength and cardio.',
      'full_body',
      6,
      'intermediate',
      'lose_fat',
      5,
      'full_gym',
      45,
      'linear',
      true
    ]
  )

  const template5Id = template5.rows[0].id

  console.log('Program templates seeded successfully')
}

async function runSeed() {
  try {
    await seedExercises()
    await seedProgramTemplates()
    console.log('Seeding complete!')
    process.exit(0)
  } catch (error) {
    console.error('Error seeding:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  runSeed()
}

module.exports = { seedExercises, seedProgramTemplates }


