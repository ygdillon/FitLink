# Client Nutrition Tab - MVP Layout Plan

## Overview
This document outlines the layout and structure for the enhanced client-facing nutrition tab, using Mantine UI components with ring progress indicators for macro tracking.

---

## Page Structure

### Main Container
- **Full-width container** with padding
- **Tabs component** for navigation between sections
- **Responsive grid layout** for all content

---

## Tab 1: Dashboard / Overview

### Top Section: Daily Macro Targets (Ring Progress Stats)
**Layout:** Horizontal grid with 4 stat cards (similar to Mantine ring progress example)

#### Card 1: Calories
- **Ring Progress Indicator:**
  - Outer ring: Dark gray background
  - Progress ring: Green/Blue (based on progress)
  - Percentage filled based on: `(consumed / target) * 100`
  - Center icon: Fire/flame icon (white)
- **Right side content:**
  - Label: "CALORIES" (light gray, uppercase, small)
  - Large number: `{consumed} / {target}` (white, bold)
  - Sub-text: `{remaining} cal remaining` or `{over} cal over` (small, colored)
  - Trend indicator: Up/down arrow with percentage change from yesterday

#### Card 2: Protein
- **Ring Progress Indicator:**
  - Progress ring: Blue color
  - Percentage: `(protein_consumed / protein_target) * 100`
  - Center icon: Muscle/protein icon (white)
- **Right side content:**
  - Label: "PROTEIN" (light gray, uppercase, small)
  - Large number: `{consumed}g / {target}g` (white, bold)
  - Sub-text: `{remaining}g remaining` or `{over}g over`
  - Trend indicator: Up/down arrow

#### Card 3: Carbs
- **Ring Progress Indicator:**
  - Progress ring: Orange/Amber color
  - Percentage: `(carbs_consumed / carbs_target) * 100`
  - Center icon: Bread/grain icon (white)
- **Right side content:**
  - Label: "CARBS" (light gray, uppercase, small)
  - Large number: `{consumed}g / {target}g` (white, bold)
  - Sub-text: `{remaining}g remaining` or `{over}g over`
  - Trend indicator: Up/down arrow

#### Card 4: Fats
- **Ring Progress Indicator:**
  - Progress ring: Yellow/Gold color
  - Percentage: `(fats_consumed / fats_target) * 100`
  - Center icon: Avocado/fat icon (white)
- **Right side content:**
  - Label: "FATS" (light gray, uppercase, small)
  - Large number: `{consumed}g / {target}g` (white, bold)
  - Sub-text: `{remaining}g remaining` or `{over}g over`
  - Trend indicator: Up/down arrow

---

### Middle Section: Today's Meals Breakdown
**Layout:** Vertical stack of meal cards

#### Meal Cards (Breakfast, Lunch, Dinner, Snacks)
Each meal card shows:
- **Header:**
  - Meal name (e.g., "Breakfast") - bold
  - Time/status badge
  - "Add Food" button (icon + text)
- **Content:**
  - List of logged foods for this meal
  - Each food item shows:
    - Food name
    - Quantity (e.g., "200g")
    - Macro breakdown (cal, P, C, F) in small text
    - Delete/edit icon
  - If no foods logged: Empty state with "Add your first food" message
- **Footer:**
  - Total macros for this meal (small text)
  - Progress bar showing meal completion vs. daily target

---

### Bottom Section: Quick Actions & Insights
**Layout:** Horizontal grid (2-3 columns)

#### Card 1: Quick Log
- **Button:** "Quick Log Food" (primary color, large)
- **Sub-text:** "Log a meal in seconds"
- **Icon:** Plus icon

#### Card 2: Weekly Summary
- **Title:** "This Week"
- **Content:**
  - Average daily calories
  - Average daily macros
  - Days on track (e.g., "5/7 days")
  - Mini chart or progress indicator

#### Card 3: Tips & Insights (Optional)
- **Title:** "Today's Tip"
- **Content:** Rotating nutrition tips or insights
- **Source:** From trainer or system

---

## Tab 2: Meal Plan

### Top Section: Active Plan Info
- **Card showing:**
  - Plan name
  - Nutrition approach badge (Macro Tracking, Meal Plan, etc.)
  - Start date
  - Days remaining (if applicable)

### Main Section: Weekly Meal Plan View
**Layout:** Calendar-style grid or day-by-day list

#### Option A: Calendar Grid View
- **7 columns** (one per day of week)
- **Each day column shows:**
  - Day name (Mon, Tue, etc.)
  - Date
  - Meal slots (Breakfast, Lunch, Dinner, Snacks)
  - Each meal slot shows:
    - Meal name/recipe (if meal plan approach)
    - Or macro targets (if macro tracking approach)
    - Checkmark if completed
    - "Swap Meal" button (if applicable)

#### Option B: Day-by-Day List View
- **Vertical list** of days
- **Each day card:**
  - Day header (Monday, Jan 15)
  - Expandable sections for each meal
  - Meal details when expanded
  - Completion status

### Bottom Section: Meal Actions
- **"View Recipe"** button (if meal plan has recipes)
- **"Swap Meal"** button (if meal swap feature available)
- **"Generate Shopping List"** button (future feature)

---

## Tab 3: Food Log

### Top Section: Date Selector & Filters
- **Date picker:** Select any date to view logs
- **Filter buttons:** Today, Yesterday, This Week, Custom Range
- **Search bar:** Search logged foods

### Main Section: Logged Foods Table/List
**Layout:** Table or card list

#### Table View (Desktop)
- **Columns:**
  - Time/Meal
  - Food Name
  - Quantity
  - Calories
  - Protein
  - Carbs
  - Fats
  - Actions (Edit/Delete)

#### Card View (Mobile)
- **Each log entry card:**
  - Header: Meal type + time
  - Food name (bold)
  - Quantity
  - Macro breakdown (horizontal bars or text)
  - Actions (Edit/Delete icons)

### Bottom Section: Daily Totals Summary
- **Card showing:**
  - Total calories consumed
  - Total macros consumed
  - Comparison to targets (over/under)
  - Visual progress bars

---

## Tab 4: Progress & History

### Top Section: Time Period Selector
- **Buttons:** Today, This Week, This Month, Last 3 Months, Custom Range

### Main Section: Charts & Metrics
**Layout:** Grid of charts and stat cards

#### Chart 1: Calorie Trend
- **Line chart** showing daily calories over time
- **Target line** overlay
- **X-axis:** Dates
- **Y-axis:** Calories

#### Chart 2: Macro Distribution
- **Stacked area chart** or **bar chart**
- Shows protein, carbs, fats over time
- Color-coded by macro type

#### Chart 3: Adherence Score
- **Gauge chart** or **progress ring**
- Shows percentage of days meeting targets
- Color-coded (green = good, yellow = moderate, red = poor)

#### Stat Cards (Grid):
- **Average Daily Calories:** Number + trend
- **Average Daily Protein:** Number + trend
- **Average Daily Carbs:** Number + trend
- **Average Daily Fats:** Number + trend
- **Days Logged:** Count + percentage
- **Best Streak:** Number of consecutive days

### Bottom Section: Insights & Recommendations
- **Card with:**
  - Key insights (e.g., "You've been consistent with protein this week")
  - Recommendations (e.g., "Try to increase carbs on workout days")
  - Trainer notes (if any)

---

## Tab 5: Food Database (Optional)

### Top Section: Search Bar
- **Large search input** with search icon
- **Filter buttons:** By category (Fruits, Vegetables, Proteins, etc.)

### Main Section: Food Grid/List
- **Card-based grid** of foods
- **Each food card shows:**
  - Food name
  - Image (if available)
  - Serving size
  - Calories per serving
  - Quick macro breakdown
  - "Add to Log" button

### Bottom Section: Popular Foods
- **Horizontal scroll** of frequently logged foods
- Quick-add buttons

---

## Common Components Across All Tabs

### Floating Action Button (FAB)
- **Position:** Bottom right corner
- **Icon:** Plus icon
- **Action:** Opens "Log Food" modal
- **Always visible** (except when modal is open)

### Log Food Modal
- **Header:** "Log Food"
- **Tabs inside modal:**
  - Search Database
  - Quick Add (manual entry)
  - Recent Foods
- **Search tab:**
  - Search input
  - Results list
  - Select food → quantity input → add
- **Quick Add tab:**
  - Food name input
  - Quantity input
  - Unit selector
  - Macro inputs (calories, protein, carbs, fats)
  - Meal type selector
  - Date selector
  - Save button

### Empty States
- **When no plan assigned:**
  - Large icon
  - Message: "No nutrition plan assigned yet"
  - Sub-text: "Your trainer will create a plan for you soon"
  
- **When no foods logged:**
  - Large icon
  - Message: "Start logging your meals"
  - Sub-text: "Track your nutrition to reach your goals"
  - "Log First Meal" button

---

## Responsive Design

### Desktop (> 768px)
- **4-column grid** for macro stats
- **2-3 column grid** for action cards
- **Table view** for food logs
- **Side-by-side** charts

### Tablet (768px - 1024px)
- **2-column grid** for macro stats
- **2-column grid** for action cards
- **Card view** for food logs
- **Stacked charts**

### Mobile (< 768px)
- **1-column stack** for macro stats
- **1-column stack** for action cards
- **Card view** for food logs
- **Stacked charts**
- **Bottom navigation** for tabs (optional)

---

## Color Scheme & Styling

### Ring Progress Colors
- **Calories:** Green (#51cf66) or Blue (#339af0)
- **Protein:** Blue (#339af0)
- **Carbs:** Orange/Amber (#ff922b)
- **Fats:** Yellow/Gold (#fcc419)

### Background
- **Cards:** Dark gray (matching current theme)
- **Text:** White for numbers, light gray for labels
- **Borders:** Subtle, matching current border radius (sm)

### Progress States
- **On Track (0-100%):** Green
- **Over Target (>100%):** Red/Orange
- **Under Target (<50%):** Yellow/Amber

---

## Data Requirements

### From Backend API:
1. **Daily totals endpoint:** `/nutrition/logs/totals?date={date}`
2. **Nutrition plan endpoint:** `/nutrition/plans/active`
3. **Food logs endpoint:** `/nutrition/logs?date={date}`
4. **Progress history endpoint:** `/nutrition/logs/history?start_date={start}&end_date={end}`
5. **Food database endpoint:** `/nutrition/foods?search={query}`

### State Management:
- Current date (defaults to today)
- Active nutrition plan
- Daily totals (calories, macros)
- Today's food logs (grouped by meal)
- Weekly/monthly aggregates
- Food database search results

---

## User Interactions

### Click Actions:
1. **Ring Progress Card:** Click to see detailed breakdown
2. **Meal Card:** Click to add food to that meal
3. **Food Item:** Click to edit or delete
4. **Date Selector:** Change date to view different day
5. **Chart Point:** Click to see details for that day

### Hover States:
- **Ring Progress:** Show tooltip with exact values
- **Meal Cards:** Slight elevation/shadow
- **Food Items:** Highlight row/card

---

## Future Enhancements (Not in MVP)

1. **Barcode Scanner:** Quick food logging
2. **Meal Swap System:** Alternative meal suggestions
3. **Shopping List Generator:** Auto-generate from meal plan
4. **Restaurant Guide:** Nutrition info for common restaurants
5. **Recipe Database:** View and save recipes
6. **Meal Timing:** Optimize meal timing around workouts
7. **Photo Logging:** Log meals with photos
8. **Voice Input:** Voice-to-text food logging
9. **Integration:** Connect with MyFitnessPal, Cronometer, etc.
10. **AI Insights:** Personalized recommendations based on progress

---

## Notes

- All components use Mantine UI library
- Ring progress uses Mantine's `RingProgress` component
- Charts use Mantine's `@mantine/charts` or Recharts
- Maintains current dark/light theme
- Follows existing border radius (sm) and styling patterns
- All text should be accessible and readable
- Loading states for all async operations
- Error states for failed API calls

