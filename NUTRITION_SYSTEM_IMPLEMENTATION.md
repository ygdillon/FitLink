# Nutrition Program Builder System - Implementation Summary

## Overview

I've successfully implemented a comprehensive Nutrition Program Builder system based on your MVP roadmap. This system allows trainers to create science-based nutrition plans for clients using macro calculations, meal planning, and food tracking.

## What Was Built

### 1. Database Layer

**Migration: `015_add_nutrition_program_builder.sql`**
- Enhanced nutrition plans with comprehensive fields
- Client nutrition profiles (body composition, activity, dietary preferences, goals)
- Food database table (500+ foods)
- Recipe database table
- Meal plan structure (meals and foods)
- Nutrition progress tracking
- Nutrition plan templates

**Seed File: `seed_nutrition_foods.js`**
- 100+ common foods covering:
  - Protein sources (meat, fish, poultry, plant proteins, dairy, eggs)
  - Carbohydrate sources (grains, fruits, starchy vegetables)
  - Fat sources (nuts, seeds, oils, avocado)
  - Vegetables (low calorie, high volume)
  - Combination foods

### 2. Backend API (`backend/routes/nutrition.js`)

**Macro Calculator Endpoints:**
1. `POST /api/nutrition/calculate/bmr` - Calculate Basal Metabolic Rate (Mifflin-St Jeor)
2. `POST /api/nutrition/calculate/tdee` - Calculate Total Daily Energy Expenditure
3. `POST /api/nutrition/calculate/macros` - Calculate target macros based on goal

**Nutrition Profile Endpoints:**
4. `GET /api/nutrition/profiles/:clientId` - Get client nutrition profile
5. `POST /api/nutrition/profiles/:clientId` - Create/update nutrition profile

**Food Database Endpoints:**
6. `GET /api/nutrition/foods/search` - Search foods with filters
7. `GET /api/nutrition/foods/:id` - Get specific food details

**Nutrition Plans Endpoints:**
8. `POST /api/nutrition/plans` - Create nutrition plan
9. `GET /api/nutrition/plans/client/:clientId` - Get plans for a client (trainer view)
10. `GET /api/nutrition/plans/active` - Get active plan (client view)
11. `GET /api/nutrition/plans/:id` - Get specific plan with meals

**Nutrition Logs Endpoints:**
12. `GET /api/nutrition/logs` - Get nutrition logs
13. `POST /api/nutrition/logs` - Create nutrition log entry
14. `GET /api/nutrition/logs/totals` - Get daily totals
15. `DELETE /api/nutrition/logs/:id` - Delete log entry

### 3. Frontend Pages

**NutritionBuilder.jsx** (`/nutrition/builder`)
- Multi-step wizard for creating nutrition plans:
  1. **Profile Step**: Collect comprehensive client nutrition profile
     - Body composition & metrics
     - Activity & lifestyle
     - Dietary preferences
     - Goals
  2. **Calculate Step**: Calculate macros using science-based formulas
     - Mifflin-St Jeor BMR calculation
     - TDEE calculation with activity multipliers
     - Macro targets based on goals (fat loss, muscle gain, maintenance, performance)
  3. **Create Plan Step**: Create and save nutrition plan
     - Choose nutrition approach (macro tracking, meal plan, portion control, hybrid)
     - Set meal frequency
     - Add notes

**ClientNutrition.jsx** (Enhanced)
- **Overview Tab**: Daily goals, progress bars, today's meals
- **Meal Plan Tab**: View weekly meal plan structure (if using meal plan approach)
- **Food Log Tab**: View and manage food logs
- **History Tab**: Nutrition history (placeholder for future charts)
- Food logging modal with search functionality
- Real-time macro tracking

### 4. Features Implemented

#### For Trainers:
✅ Create comprehensive nutrition profiles for clients
✅ Calculate BMR using Mifflin-St Jeor equation
✅ Calculate TDEE with activity multipliers
✅ Calculate target macros based on goals
✅ Create nutrition plans with different approaches:
   - Macro Tracking (flexible)
   - Meal Plan (structured)
   - Portion Control (simple)
   - Hybrid (structured + flexible)
✅ View client nutrition progress
✅ Access to food database for meal planning

#### For Clients:
✅ View active nutrition plan
✅ See daily macro targets
✅ Track daily progress with visual progress bars
✅ Log foods with search functionality
✅ View meal plans (if using meal plan approach)
✅ View food log history
✅ Delete food log entries

## Macro Calculation System

The system implements science-based macro calculations:

**BMR Calculation (Mifflin-St Jeor):**
- Men: (10 × weight_kg) + (6.25 × height_cm) - (5 × age) + 5
- Women: (10 × weight_kg) + (6.25 × height_cm) - (5 × age) - 161

**TDEE Calculation:**
- Sedentary: BMR × 1.2
- Lightly Active: BMR × 1.375
- Moderately Active: BMR × 1.55
- Very Active: BMR × 1.725
- Extremely Active: BMR × 1.9

**Macro Targets:**
- **Protein**: 0.7-1.2g per lb bodyweight (higher in deficit)
- **Fats**: 0.3-0.5g per lb bodyweight (higher for women)
- **Carbs**: Fill remaining calories

**Goal Adjustments:**
- Fat Loss: -500 to -1000 calories (based on rate)
- Muscle Gain: +200 to +500 calories
- Maintenance: No adjustment
- Performance: +100 to +300 calories

## Nutrition Approaches Supported

1. **Macro Tracking**: Client hits daily macro targets using any foods
2. **Meal Plan**: Specific meals prescribed for each day
3. **Portion Control**: Hand-based portion guidelines
4. **Hybrid**: Combination of approaches

## Database Setup

### 1. Run the Migration

```bash
cd database
node migrate.js
```

Or manually:
```bash
psql -U your_user -d your_database -f migrations/015_add_nutrition_program_builder.sql
```

### 2. Seed the Food Database

```bash
cd database
node seed_nutrition_foods.js
```

This will populate the food database with 100+ common foods.

## Usage Guide

### For Trainers

1. **Navigate to Nutrition Builder**
   - Go to `/nutrition/builder` or add a link from trainer dashboard
   - Select a client from the dropdown

2. **Create Nutrition Profile**
   - Fill in client's body composition, activity level, dietary preferences, and goals
   - Click "Save Profile & Continue"

3. **Calculate Macros**
   - Enter client's weight (kg), height (cm), age, biological sex
   - Select activity level and goal
   - Choose rate of change (aggressive, moderate, conservative)
   - Click "Calculate Macros"
   - Review calculated targets

4. **Create Nutrition Plan**
   - Enter plan name
   - Choose nutrition approach
   - Set meal frequency
   - Add notes
   - Click "Create Plan"

### For Clients

1. **View Nutrition Plan**
   - Navigate to `/client/nutrition`
   - View daily macro targets
   - Check progress bars

2. **Log Foods**
   - Click "Log Food" button
   - Search for foods in database
   - Select food and adjust quantity
   - Add to log

3. **View Meal Plan**
   - Switch to "Meal Plan" tab
   - View weekly meal structure (if using meal plan approach)

4. **Track Progress**
   - View real-time progress bars
   - See today's meals breakdown
   - Review food log history

## Next Steps (Future Enhancements)

### Phase 2 Features:
- Recipe database with meal plan generation
- Shopping list generator
- Meal swap system (alternatives for each meal)
- Restaurant guide
- Barcode scanner for food logging
- Weekly check-in flow

### Phase 3 Features:
- Smart meal plan generation (auto-filter by preferences)
- Progress-based adjustment recommendations
- Adherence tracking and alerts
- Educational content library
- Supplement recommendations
- Template library expansion

### Phase 4 Features:
- Nutrition periodization (tied to training phases)
- Meal timing optimization (around workouts)
- Multiple nutrition approaches in one plan
- Integration with training program
- Social features (trainer can share recipes/templates)

## Integration Points

- **Trainer Dashboard**: Add link to Nutrition Builder
- **Client Profile**: Add nutrition section
- **Client Dashboard**: Add nutrition quick view card
- **Analytics**: Add nutrition adherence metrics

## Notes

- The system follows the same patterns as the Program Builder for consistency
- All calculations use science-based formulas from the MVP
- Food database can be expanded with more foods as needed
- Meal plan generation logic can be added in Phase 2
- The system is designed to be flexible and accommodate different client needs

