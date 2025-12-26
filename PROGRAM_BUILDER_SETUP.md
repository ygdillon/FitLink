# Program Builder System Setup Guide

This guide explains how to set up the new Program Builder system that implements the MVP roadmap.

## Database Setup

### 1. Run the Migration

First, run the migration to create the new tables:

```bash
cd database
node migrate.js
```

Or manually run the SQL migration:

```bash
psql -U your_user -d your_database -f migrations/014_add_program_builder_system.sql
```

This creates:
- Enhanced client profile columns (training_experience, equipment_access, etc.)
- `exercises` table (exercise database)
- `program_templates` table (pre-built program templates)
- `template_workouts` and `template_workout_exercises` tables
- `program_progression_rules` table

### 2. Seed the Exercise Database

Run the seed script to populate the exercise database with 100+ exercises:

```bash
cd database
node seed_program_system.js
```

This will:
- Insert 100+ exercises covering all movement patterns
- Create 5 pre-built program templates:
  1. Beginner Full Body (3 days/week)
  2. Intermediate Upper/Lower (4 days/week)
  3. Advanced Push/Pull/Legs (6 days/week)
  4. Home Workout Program (bodyweight/dumbbells)
  5. Fat Loss Circuit Training (4-5 days/week)

## Features Implemented

### For Trainers

1. **Program Builder Page** (`/programs/builder`)
   - View all program templates
   - Get program recommendations for specific clients
   - Create programs from templates
   - Preview template structure before using

2. **Smart Program Recommendations**
   - Analyzes client profile (experience, goals, equipment, schedule)
   - Scores templates based on match
   - Returns top 3 recommendations with match percentages

3. **Exercise Database**
   - Searchable exercise library
   - Filter by muscle group, movement pattern, equipment, difficulty
   - Exercise substitution suggestions

4. **Program Customization**
   - Create programs from templates
   - Customize workouts and exercises
   - Assign to clients

### For Clients

1. **Program View**
   - View assigned programs
   - See weekly workout calendar
   - Navigate between weeks

2. **Workout Logging**
   - Click on workouts to view details
   - Log completed sets, reps, and weights
   - Add notes about workout experience
   - Track workout duration

## API Endpoints

### Program Templates
- `GET /programs/templates/all` - Get all templates
- `GET /programs/templates/:id` - Get specific template with workouts

### Program Recommendations
- `POST /programs/recommend` - Get program recommendations for a client
  ```json
  {
    "client_id": 123
  }
  ```

### Create from Template
- `POST /programs/from-template/:templateId` - Create program from template
  ```json
  {
    "client_id": 123,  // optional
    "name": "Custom Program Name",
    "description": "Program description"
  }
  ```

### Exercise Search
- `GET /programs/exercises/search?search=bench&muscle_group=chest&equipment=barbell`
  - Query params: `search`, `muscle_group`, `movement_pattern`, `equipment`, `difficulty`

### Exercise Substitutions
- `GET /programs/exercises/:exerciseName/substitutions?equipment=dumbbells`
  - Returns alternative exercises with same movement pattern

### Workout Completion
- `POST /programs/workout/:workoutId/complete` - Log workout completion
  ```json
  {
    "exercises_completed": {
      "1": {
        "sets_completed": 3,
        "reps_completed": "10",
        "weight_used": "135 lbs"
      }
    },
    "notes": "Felt strong today",
    "duration": 45
  }
  ```

## Client Profile Fields

The enhanced client profile includes:

- `training_experience`: 'never', 'beginner_0_6mo', 'intermediate_6_12mo', 'intermediate_1_2yr', 'advanced_2plus'
- `training_days_per_week`: 2-7
- `session_duration_minutes`: 30, 45, 60, 75, 90
- `equipment_access`: 'full_gym', 'home_gym', 'dumbbells_only', 'bodyweight_only'
- `known_exercises`: JSONB array
- `preferred_exercises`: JSONB array
- `avoided_exercises`: JSONB array
- `training_style_preferences`: JSONB array

## Program Template Structure

Templates include:
- Target experience level
- Target goal (build_muscle, get_stronger, lose_fat, etc.)
- Target days per week
- Target equipment
- Target session duration
- Progression type (linear, undulating, block, double)
- Complete workout structure with exercises

## Next Steps

### Phase 2 Features (Future)
- Exercise substitution UI in program builder
- Progression rule automation
- Progress graphs and analytics
- Custom template creation
- Exercise library expansion (500+ exercises)

### Phase 3 Features (Future)
- Advanced periodization tools
- Nutrition tracking integration
- Form check video upload
- In-app messaging for workout feedback

## Troubleshooting

### Migration Errors
If you get errors about existing columns, the migration uses `ADD COLUMN IF NOT EXISTS`, so it should be safe to run multiple times.

### Seed Errors
If exercises already exist, the seed script uses `ON CONFLICT DO NOTHING`, so it's safe to run multiple times.

### Missing Exercises
If you need more exercises, add them to `database/seed_exercises.js` and re-run the seed script.

## Support

For issues or questions, check:
- Database schema: `database/schema.sql`
- Migration files: `database/migrations/`
- API routes: `backend/routes/programs.js`
- Frontend pages: `frontend/src/pages/ProgramBuilder.jsx` and `Programs.jsx`

