# Meals Section MVP - Comprehensive Plan

## Overview
Transform the "Meal Plan" tab into a robust "Meals" section that combines **structured meal plans** and **flexible meal guidance**. This creates an all-in-one nutrition solution that provides structure while teaching correct eating habits.

---

## Core Concept

### Dual Approach System
1. **Structured Meal Plans**: Specific meals assigned for each day (like the left image)
2. **Flexible Meal Guidance**: Recipe books and meal options that clients can choose from (like the right image)

### Key Features
- Trainer-assigned meals for specific days
- Recommended meals organized by category (breakfast, lunch, dinner, snacks, quick eats)
- Weekly nutrition averages
- Recipe details with instructions
- Shopping list generation
- Meal swap functionality
- Dietary filter support

---

## Database Schema

### New Tables

#### 1. `trainer_meal_recommendations`
Stores meals/recipes that trainers recommend to clients (flexible meal guidance).

```sql
CREATE TABLE IF NOT EXISTS trainer_meal_recommendations (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nutrition_plan_id INTEGER REFERENCES nutrition_plans(id) ON DELETE CASCADE,
    
    -- Meal/Recipe Reference
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    meal_name VARCHAR(255) NOT NULL,
    meal_description TEXT,
    
    -- Category & Type
    meal_category VARCHAR(50) NOT NULL, -- 'breakfast', 'lunch', 'dinner', 'snack', 'quick_eat'
    meal_type VARCHAR(50), -- 'main_dish', 'side', 'dessert', 'beverage'
    
    -- Macros (per serving)
    calories_per_serving DECIMAL(8, 2),
    protein_per_serving DECIMAL(8, 2),
    carbs_per_serving DECIMAL(8, 2),
    fats_per_serving DECIMAL(8, 2),
    
    -- Assignment Details
    is_assigned BOOLEAN DEFAULT false, -- If assigned to specific day
    assigned_day_number INTEGER, -- 1-7 for weekly plans
    assigned_date DATE, -- For specific date assignments
    assigned_meal_slot VARCHAR(50), -- 'breakfast', 'lunch', 'dinner', 'snack_1', 'snack_2'
    
    -- Recommendation Details
    recommendation_type VARCHAR(50) DEFAULT 'flexible', -- 'flexible', 'assigned', 'suggested'
    priority INTEGER DEFAULT 0, -- Higher = more recommended
    notes TEXT, -- Trainer notes for client
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trainer_meal_recommendations_client ON trainer_meal_recommendations(client_id, is_active);
CREATE INDEX idx_trainer_meal_recommendations_category ON trainer_meal_recommendations(meal_category, is_active);
```

#### 2. `client_meal_selections`
Tracks which meals clients have selected/logged from recommendations.

```sql
CREATE TABLE IF NOT EXISTS client_meal_selections (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recommendation_id INTEGER REFERENCES trainer_meal_recommendations(id) ON DELETE SET NULL,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL,
    
    -- Selection Details
    selected_date DATE NOT NULL,
    meal_category VARCHAR(50) NOT NULL,
    meal_slot VARCHAR(50), -- 'breakfast', 'lunch', 'dinner', 'snack_1', etc.
    
    -- Actual Consumption
    servings DECIMAL(4, 2) DEFAULT 1.0,
    actual_calories DECIMAL(8, 2),
    actual_protein DECIMAL(8, 2),
    actual_carbs DECIMAL(8, 2),
    actual_fats DECIMAL(8, 2),
    
    -- Status
    is_logged BOOLEAN DEFAULT false, -- If added to nutrition_logs
    nutrition_log_id INTEGER REFERENCES nutrition_logs(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_client_meal_selections_date ON client_meal_selections(client_id, selected_date);
```

#### 3. `recipe_images`
Store recipe images (optional, can use URLs initially).

```sql
CREATE TABLE IF NOT EXISTS recipe_images (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_type VARCHAR(50), -- 'main', 'step_1', 'step_2', etc.
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Enhancements to Existing Tables

#### `recipes` table enhancements:
```sql
-- Add columns if they don't exist
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS nutrition_tips TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS prep_tips TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS storage_tips TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS serving_suggestions TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_quick_meal BOOLEAN DEFAULT false; -- < 15 min prep
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_meal_prep_friendly BOOLEAN DEFAULT false;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0;
```

---

## Backend API Endpoints

### Trainer Endpoints

#### 1. Get/Set Meal Recommendations
```
GET /api/nutrition/meals/recommendations/:clientId
- Get all meal recommendations for a client
- Query params: ?category=breakfast&type=flexible|assigned

POST /api/nutrition/meals/recommendations
- Create meal recommendation
Body: {
  client_id, recipe_id, meal_category, 
  recommendation_type, assigned_day_number, 
  assigned_date, notes, priority
}

PUT /api/nutrition/meals/recommendations/:id
- Update recommendation (change assignment, priority, etc.)

DELETE /api/nutrition/meals/recommendations/:id
- Remove recommendation
```

#### 2. Assign Meals to Days
```
POST /api/nutrition/meals/assign
- Assign specific meals to specific days
Body: {
  client_id,
  assignments: [
    { day_number: 1, meal_slot: 'breakfast', recipe_id: 123 },
    { day_number: 1, meal_slot: 'lunch', recipe_id: 456 },
    ...
  ]
}
```

#### 3. Recipe Management
```
GET /api/nutrition/recipes
- Get all recipes (trainer's + system recipes)
- Query params: ?category=breakfast&dietary=vegan&quick=true

POST /api/nutrition/recipes
- Create custom recipe

PUT /api/nutrition/recipes/:id
- Update recipe

DELETE /api/nutrition/recipes/:id
- Delete recipe (only if created by trainer)
```

### Client Endpoints

#### 1. Get Recommended Meals
```
GET /api/nutrition/meals/recommended
- Get all meal recommendations for logged-in client
- Query params: ?category=breakfast&date=2024-01-15
- Returns: {
    assigned: [...], // Meals assigned to specific days
    flexible: [...],  // Flexible meal options by category
    weekly_averages: {...}
  }
```

#### 2. Select Meal
```
POST /api/nutrition/meals/select
- Client selects a meal from recommendations
Body: {
  recommendation_id,
  selected_date,
  meal_slot,
  servings: 1.0
}
```

#### 3. Get Weekly Meal Plan
```
GET /api/nutrition/meals/weekly
- Get weekly meal plan view
- Query params: ?week_start=2024-01-15
- Returns structured meal plan with assigned + flexible options
```

#### 4. Get Recipe Details
```
GET /api/nutrition/recipes/:id
- Get full recipe details with ingredients, instructions, tips
```

#### 5. Generate Shopping List
```
POST /api/nutrition/meals/shopping-list
- Generate shopping list from selected meals
Body: {
  date_range: { start: '2024-01-15', end: '2024-01-21' },
  meal_selections: [meal_selection_ids]
}
```

---

## Frontend Components

### Main "Meals" Tab Structure

```
Meals Tab
├── Header Section
│   ├── Week Selector (< THIS WEEK Sep 25 - Oct 1 >)
│   ├── Shopping List Button
│   └── View Toggle (Structured / Flexible)
│
├── Weekly Nutrition Averages Card
│   ├── Calories: 230 cal
│   ├── Protein: 28 g
│   ├── Carbs: 32 g
│   └── Fats: 36 g
│
├── Today Section
│   ├── Assigned Meals (if structured plan)
│   │   ├── Breakfast Card
│   │   ├── Lunch Card
│   │   ├── Dinner Card
│   │   └── Snacks Card
│   │
│   └── Flexible Meal Options (if flexible plan)
│       ├── Breakfast Options (scrollable cards)
│       ├── Lunch Options
│       ├── Dinner Options
│       └── Snack Options
│
└── Weekly View (Day-by-Day)
    ├── Monday
    ├── Tuesday
    ├── ...
    └── Sunday
```

### Component Breakdown

#### 1. `MealCard` Component
```jsx
<MealCard
  meal={meal}
  onSelect={handleSelect}
  onViewRecipe={handleViewRecipe}
  showMacros={true}
  showImage={true}
  dietaryBadges={['Vegan', 'Gluten-Free']}
/>
```

**Features:**
- Recipe image
- Meal name
- Macros display (cal, P, C, F)
- Dietary badges (Vegan, Gluten-Free, etc.)
- "View Recipe" button
- "Add to Today" button (for flexible meals)
- "Swap Meal" button (for assigned meals)

#### 2. `WeeklyNutritionAverages` Component
```jsx
<WeeklyNutritionAverages
  weekStart={date}
  meals={weeklyMeals}
/>
```

**Displays:**
- Weekly average calories
- Weekly average macros
- Days with meals logged
- Progress indicator

#### 3. `MealCategorySection` Component
```jsx
<MealCategorySection
  category="breakfast"
  meals={breakfastMeals}
  assignedMeal={assignedBreakfast}
  onSelect={handleSelect}
  onSwap={handleSwap}
/>
```

**Features:**
- Shows assigned meal (if structured)
- Shows flexible options (scrollable)
- "View All" button
- Filter by dietary preferences

#### 4. `RecipeDetailModal` Component
```jsx
<RecipeDetailModal
  recipe={recipe}
  onClose={close}
  onAddToMealPlan={handleAdd}
/>
```

**Sections:**
- Recipe image/video
- Macros per serving
- Ingredients list
- Step-by-step instructions
- Preparation tips
- Storage instructions
- Substitution options
- "Add to Today" button
- "Add to Shopping List" button

#### 5. `ShoppingListModal` Component
```jsx
<ShoppingListModal
  meals={selectedMeals}
  dateRange={range}
  onClose={close}
/>
```

**Features:**
- Grouped by category (Produce, Protein, Dairy, etc.)
- Quantities calculated
- Checkboxes for items
- Export/Print option
- Share option

#### 6. `MealSwapModal` Component
```jsx
<MealSwapModal
  currentMeal={meal}
  alternatives={alternatives}
  onSwap={handleSwap}
/>
```

**Features:**
- Shows current meal
- Shows alternative options (similar macros)
- Filter by dietary preferences
- "Swap" button

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Basic meal recommendations system

**Tasks:**
1. Create database tables
2. Create backend API endpoints for recommendations
3. Create basic `MealCard` component
4. Update "Meal Plan" tab to "Meals" tab
5. Display assigned meals (from existing meal_plan_meals)
6. Display weekly nutrition averages

**Deliverables:**
- Trainers can assign meals to specific days
- Clients can see assigned meals for the week
- Basic meal cards with macros

### Phase 2: Flexible Meal Guidance (Week 2)
**Goal:** Add flexible meal recommendations

**Tasks:**
1. Create `trainer_meal_recommendations` table
2. Backend endpoints for flexible recommendations
3. `MealCategorySection` component
4. Category-based meal browsing
5. Meal selection functionality

**Deliverables:**
- Trainers can add meal recommendations by category
- Clients can browse meals by category (breakfast, lunch, dinner, snacks)
- Clients can select meals from recommendations
- Selected meals appear in their daily plan

### Phase 3: Recipe Details & Enhancements (Week 3)
**Goal:** Rich recipe experience

**Tasks:**
1. `RecipeDetailModal` component
2. Recipe images support
3. Recipe instructions display
4. Ingredient list with quantities
5. Preparation tips and storage instructions

**Deliverables:**
- Full recipe details view
- Step-by-step instructions
- Recipe images
- Tips and suggestions

### Phase 4: Advanced Features (Week 4)
**Goal:** Shopping list, meal swap, and filters

**Tasks:**
1. Shopping list generation
2. Meal swap functionality
3. Dietary filters (Vegan, Gluten-Free, etc.)
4. Quick meal filter (< 15 min prep)
5. Meal prep friendly filter

**Deliverables:**
- Generate shopping lists from selected meals
- Swap assigned meals with alternatives
- Filter meals by dietary preferences
- Quick meal options

### Phase 5: Educational Content (Week 5)
**Goal:** Teaching correct eating habits

**Tasks:**
1. Nutrition tips per meal
2. Meal timing guidance
3. Portion control tips
4. Macro balance education
5. Weekly nutrition insights

**Deliverables:**
- Educational tooltips and tips
- Meal timing recommendations
- Portion guidance
- Weekly insights and recommendations

---

## UI/UX Design Specifications

### Layout Structure

#### Desktop View:
```
┌─────────────────────────────────────────────────────────┐
│  < THIS WEEK Sep 25 - Oct 1 >    [Shopping List] [⚙️]  │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐   │
│  │ Weekly Nutrition Averages                        │   │
│  │ 230 cal  |  P 28g  |  C 32g  |  F 36g            │   │
│  └───────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  TODAY                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │Breakfast │  │  Lunch   │  │  Dinner  │  │ Snacks ││
│  │[Meal Img]│  │[Meal Img]│  │[Meal Img]│  │[Meal Img]││
│  │300 cal   │  │300 cal   │  │300 cal   │  │300 cal ││
│  │P 32g     │  │P 32g     │  │P 32g     │  │P 32g   ││
│  └──────────┘  └──────────┘  └──────────┘  └────────┘│
├─────────────────────────────────────────────────────────┤
│  THIS WEEK                                              │
│  [Monday] [Tuesday] [Wednesday] ...                    │
│  ┌───────────────────────────────────────────────────┐   │
│  │ MONDAY (DAY 1)                                    │   │
│  │ 300 cal | P 28g | C 45g | F 28g                   │   │
│  │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐             │   │
│  │ │Break │ │Snack1│ │Lunch │ │Dinner│             │   │
│  │ └──────┘ └──────┘ └──────┘ └──────┘             │   │
│  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### Mobile View:
```
┌─────────────────────┐
│ < THIS WEEK >  [🛒] │
├─────────────────────┤
│ Weekly Averages     │
│ 230 cal | P 28g     │
├─────────────────────┤
│ TODAY               │
│ ┌─────────────────┐ │
│ │ Breakfast       │ │
│ │ [Image]         │ │
│ │ 300 cal         │ │
│ │ [View Recipe]   │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ Lunch           │ │
│ │ [Image]         │ │
│ │ 300 cal         │ │
│ └─────────────────┘ │
└─────────────────────┘
```

### Meal Card Design

```
┌─────────────────────────────┐
│  [Recipe Image]             │
│                              │
│  Meal Name                  │
│  Chipotle Steak, Cauliflower│
│  Rice & Guacamole Bowls      │
│                              │
│  ┌─────┬─────┬─────┬─────┐  │
│  │300  │P 32g│C 32g│F 12g│  │
│  │ cal │     │     │     │  │
│  └─────┴─────┴─────┴─────┘  │
│                              │
│  [Vegan] [Gluten-Free]       │
│                              │
│  [View Recipe] [Add to Today]│
└─────────────────────────────┘
```

### Color Coding
- **Breakfast**: Orange/Yellow tones
- **Lunch**: Green tones
- **Dinner**: Blue/Purple tones
- **Snacks**: Light Gray tones
- **Quick Eats**: Bright accent colors

---

## Key Features & Recommendations

### 1. Structured Meal Plans
**Use Case:** Clients who need specific guidance
- Trainer assigns exact meals for each day
- Clear meal schedule
- No decision fatigue
- Best for: Beginners, strict adherence needed

**Implementation:**
- Use existing `meal_plan_meals` table
- Display meals by day and meal slot
- Show weekly overview
- Allow meal swaps (with trainer approval or auto-alternatives)

### 2. Flexible Meal Guidance
**Use Case:** Clients who want choice within structure
- Trainer provides meal options by category
- Client chooses from recommendations
- Maintains macro targets
- Best for: Intermediate clients, meal prep flexibility

**Implementation:**
- Use `trainer_meal_recommendations` table
- Group by category (breakfast, lunch, dinner, snacks)
- Show multiple options per category
- Track selections in `client_meal_selections`

### 3. Hybrid Approach (Recommended)
**Use Case:** Best of both worlds
- Some meals assigned (e.g., breakfast)
- Some meals flexible (e.g., snacks)
- Structured core meals, flexible extras
- Best for: Most clients

**Implementation:**
- Combine both systems
- Show assigned meals prominently
- Show flexible options for unassigned slots
- Allow clients to swap assigned meals with alternatives

### 4. Recipe Books / Meal Library
**Use Case:** Educational and variety
- Curated recipe collection
- Filterable by dietary preferences
- Searchable
- Best for: Long-term habit building

**Implementation:**
- Use `recipes` table
- Add trainer-curated collections
- Filter by: dietary (vegan, gluten-free), time (quick meals), type (meal prep friendly)
- Search functionality

### 5. Weekly Nutrition Averages
**Use Case:** Track overall progress
- Show weekly macro averages
- Compare to targets
- Identify patterns
- Best for: Progress tracking

**Implementation:**
- Calculate from `client_meal_selections` and `nutrition_logs`
- Display in header card
- Show trend indicators
- Compare to plan targets

### 6. Shopping List Generation
**Use Case:** Meal prep planning
- Auto-generate from selected meals
- Group by category
- Calculate quantities
- Best for: Meal prep efficiency

**Implementation:**
- Aggregate ingredients from selected recipes
- Group by food category
- Calculate total quantities
- Export/print functionality

### 7. Meal Swap Functionality
**Use Case:** Flexibility within structure
- Swap assigned meals with alternatives
- Maintain macro balance
- Filter by preferences
- Best for: Variety and preferences

**Implementation:**
- Find meals with similar macros
- Filter by dietary preferences
- Show alternatives in modal
- Update meal assignment

### 8. Dietary Filters
**Use Case:** Accommodate restrictions
- Filter by: Vegan, Vegetarian, Gluten-Free, Dairy-Free, Nut-Free
- Show badges on meals
- Best for: Dietary restrictions

**Implementation:**
- Use existing dietary flags in `recipes` table
- Add filter UI
- Show badges on meal cards
- Filter recommendations

### 9. Quick Meals / Quick Eats
**Use Case:** Time-constrained clients
- Meals that take < 15 minutes
- One-pan meals
- Minimal prep
- Best for: Busy clients

**Implementation:**
- Add `is_quick_meal` flag to recipes
- Filter by prep time
- Special "Quick Eats" category
- Highlight in UI

### 10. Meal Prep Friendly
**Use Case:** Batch cooking
- Meals that store well
- Can be prepped in advance
- Reheat-friendly
- Best for: Meal prep clients

**Implementation:**
- Add `is_meal_prep_friendly` flag
- Storage instructions
- Prep tips
- Batch quantity suggestions

### 11. Educational Content
**Use Case:** Teach correct eating habits
- Nutrition tips per meal
- Meal timing guidance
- Portion control education
- Macro balance explanations
- Best for: Long-term habit building

**Implementation:**
- Add tips to recipes
- Tooltips on meal cards
- Weekly nutrition insights
- Educational modals

### 12. Visual Meal Cards
**Use Case:** Better engagement
- Recipe images
- Visual appeal
- Better meal recognition
- Best for: User engagement

**Implementation:**
- Store recipe images (URLs or files)
- Display on meal cards
- Lazy loading for performance
- Placeholder images

---

## Data Flow Examples

### Example 1: Trainer Assigns Structured Meal Plan
```
1. Trainer navigates to Nutrition Builder
2. Selects client and creates nutrition plan
3. For each day, assigns specific meals:
   - Monday Breakfast: Recipe #123 (Egg & Salsa Pepper Boats)
   - Monday Lunch: Recipe #456 (Pressure Cooked Orange & Ginger Salmon)
   - Monday Dinner: Recipe #789 (Lemony Rapini & Mozzarella)
4. Saves plan
5. Data stored in `meal_plan_meals` table
6. Client sees assigned meals in "Meals" tab
```

### Example 2: Trainer Adds Flexible Recommendations
```
1. Trainer navigates to client's nutrition plan
2. Goes to "Meal Recommendations" section
3. Adds meals by category:
   - Breakfast: Recipe #111, #222, #333
   - Lunch: Recipe #444, #555, #666
   - Dinner: Recipe #777, #888, #999
4. Sets priority for each
5. Data stored in `trainer_meal_recommendations` table
6. Client sees recommendations in "Meals" tab under each category
7. Client selects meals as needed
```

### Example 3: Client Selects Flexible Meal
```
1. Client opens "Meals" tab
2. Sees "Breakfast" section with 3 recommended options
3. Clicks on "Egg & Salsa Pepper Boats" card
4. Views recipe details
5. Clicks "Add to Today"
6. Meal added to today's breakfast slot
7. Data stored in `client_meal_selections` table
8. Automatically logged to `nutrition_logs` (optional)
```

### Example 4: Client Swaps Assigned Meal
```
1. Client sees assigned breakfast for Monday
2. Doesn't like the meal or has dietary restriction
3. Clicks "Swap Meal" button
4. Modal shows alternatives with similar macros
5. Client selects alternative
6. Original meal unassigned, new meal assigned
7. Update `meal_plan_meals` or create new `client_meal_selections`
```

---

## Technical Recommendations

### 1. Image Storage
- **Option A:** Use image URLs (external CDN)
- **Option B:** Store in database as base64 (not recommended for large images)
- **Option C:** Use cloud storage (AWS S3, Cloudinary)
- **Recommendation:** Start with URLs, migrate to cloud storage later

### 2. Recipe Data Source
- **Option A:** Build internal recipe database
- **Option B:** Integrate with recipe API (Spoonacular, Edamam)
- **Option C:** Allow trainers to create custom recipes
- **Recommendation:** Start with trainer-created recipes, add API integration later

### 3. Meal Recommendation Algorithm
- **Simple:** Filter by category and dietary preferences
- **Advanced:** Consider macro balance, client preferences, meal history
- **Recommendation:** Start simple, add ML-based recommendations later

### 4. Shopping List Generation
- Aggregate ingredients from selected recipes
- Group by food category
- Calculate quantities (handle unit conversions)
- **Recommendation:** Start with basic aggregation, add smart grouping later

### 5. Performance Optimization
- Lazy load meal images
- Paginate meal recommendations
- Cache weekly nutrition averages
- **Recommendation:** Implement pagination and caching from start

---

## Success Metrics

### User Engagement
- % of clients viewing meal recommendations daily
- Average meals selected per week
- Recipe detail views
- Shopping list generations

### Adherence
- % of assigned meals consumed
- % of days with meals logged
- Weekly macro target adherence
- Meal swap frequency

### Trainer Usage
- % of trainers creating meal recommendations
- Average recommendations per client
- Recipe creation rate
- Meal assignment frequency

---

## Future Enhancements (Post-MVP)

1. **AI Meal Recommendations**: ML-based meal suggestions
2. **Meal Prep Scheduler**: Auto-schedule meal prep days
3. **Restaurant Guide**: Nutrition info for common restaurants
4. **Barcode Scanner**: Quick food logging
5. **Meal Photo Logging**: Clients can log meals with photos
6. **Social Features**: Share recipes, meal prep photos
7. **Nutrition Coaching**: In-app nutrition education modules
8. **Meal Timing Optimization**: Suggest meal times based on workouts
9. **Grocery Delivery Integration**: Order ingredients directly
10. **Voice Commands**: Voice-activated meal logging

---

## Next Steps

1. **Review and approve this MVP plan**
2. **Create database migration** for new tables
3. **Implement Phase 1** (Foundation)
4. **Test with trainers and clients**
5. **Iterate based on feedback**
6. **Continue with subsequent phases**

---

## Questions to Consider

1. Should meal swaps require trainer approval?
2. How many flexible recommendations per category?
3. Should clients be able to create custom meals?
4. Should there be a meal rating system?
5. How to handle meal substitutions (allergies, dislikes)?
6. Should there be meal prep scheduling?
7. How to handle meal leftovers?
8. Should there be meal cost tracking?

---

This MVP provides a comprehensive foundation for a robust meals system that combines structure with flexibility, teaching clients correct eating habits while maintaining adherence to their nutrition goals.


