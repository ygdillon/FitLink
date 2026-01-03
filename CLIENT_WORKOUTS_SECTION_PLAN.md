# Client Workouts Section - MVP Plan

## Overview
This document outlines the design and implementation plan for a new "Workouts" section on the client dashboard, featuring assigned workouts, recommended supplemental workouts, and an explore tab for discovering different workout types.

---

## Section Structure

### Location & Navigation
- **Placement**: Left sidebar or dedicated "Workouts" tab/page
- **Access**: From client dashboard, navigation menu, or direct route `/client/workouts`
- **Visual Hierarchy**: Prominent, easily accessible, mobile-friendly

---

## Core Sections

### 1. "Your Workouts" Section

#### 1.1 Purpose
- Display workouts assigned through the client's active program(s)
- Quick access to today's and upcoming workouts
- Show workout history and completion status

#### 1.2 Content Structure

**Today's Workout (Prominent)**
- Large card showing today's scheduled workout
- Status indicator (Not Started, In Progress, Completed)
- Quick stats: exercise count, estimated duration
- Primary action: "Start Workout" button
- Secondary action: "View Details" link

**Upcoming Workouts**
- List/card view of next 3-5 workouts
- Organized by date (tomorrow, this week, next week)
- Each card shows:
  - Workout name
  - Date/day (e.g., "Tomorrow", "Monday, Jan 15")
  - Workout type badge (Strength, Cardio, HIIT, etc.)
  - Exercise count
  - Estimated duration
  - Status (Upcoming, Overdue if missed)
- Click to view details or start workout

**Workout History**
- Recently completed workouts (last 7-10)
- Quick stats: completion date, duration, exercises completed
- Link to full history page
- Visual indicators: completion badges, PR achievements

**Program Context**
- Show which program each workout belongs to
- Display week name (e.g., "Push Pull Legs Week")
- Progress indicator (e.g., "Week 2 of 4")
- Link to full program view

#### 1.3 Features
- Filter by program
- Filter by status (upcoming, completed, overdue)
- Search workouts
- Sort by date, type, or program
- Quick actions: Start, View, Reschedule (if allowed)

---

### 2. "Recommended Workouts" Section

#### 2.1 Purpose
- Suggest supplemental workouts based on:
  - Client's program gaps (e.g., if program is strength-focused, suggest cardio)
  - Client goals and preferences
  - Trainer recommendations
  - Workout frequency (if client wants to do extra)
- Help clients stay active on rest days or add variety

#### 2.2 Recommendation Logic

**Smart Recommendations**
- **Complementary Workouts**: If program is strength-focused, recommend cardio/HIIT
- **Rest Day Activities**: Light workouts, stretching, mobility
- **Goal-Based**: Weight loss → cardio, muscle gain → strength
- **Frequency-Based**: If client completes workouts early, suggest additional sessions
- **Recovery-Based**: Suggest active recovery workouts after intense sessions

**Trainer Recommendations**
- Trainer can mark specific workouts as "recommended" for client
- Trainer can create custom recommendations
- Priority display for trainer-recommended workouts

**AI/System Recommendations** (Future)
- Based on client's workout history
- Based on program structure
- Based on time availability
- Based on equipment access

#### 2.3 Content Structure

**Recommended This Week**
- 3-5 workout suggestions
- Cards showing:
  - Workout name
  - Type badge (Cardio, Strength, Mobility, etc.)
  - Duration
  - Difficulty level
  - Why it's recommended (e.g., "Complements your strength program")
  - "Try This" button

**By Goal**
- Tabs or sections for different goals:
  - Weight Loss
  - Muscle Gain
  - Endurance
  - Flexibility
  - General Fitness
- Each section shows relevant workouts

**By Time Available**
- Quick filters: "15 min", "30 min", "45+ min"
- Show workouts that fit available time

**By Equipment**
- Filter by: Full Gym, Home, Bodyweight, Dumbbells Only
- Show workouts client can do with available equipment

#### 2.4 Workout Types to Include

**Cardio Workouts**
- HIIT sessions
- Steady-state cardio
- Interval training
- Cardio circuits

**Strength Workouts**
- Upper body focus
- Lower body focus
- Full body strength
- Power/explosive training

**Mobility & Flexibility**
- Stretching routines
- Yoga flows
- Mobility work
- Recovery sessions

**Conditioning**
- Metabolic conditioning
- Endurance training
- Sport-specific conditioning

**Active Recovery**
- Light movement
- Walking routines
- Low-intensity sessions

---

### 3. "Explore" Tab/Section

#### 3.1 Purpose
- Browse all available workout types
- Discover new workout styles
- Find workouts by category, duration, difficulty
- Similar to a workout library or marketplace

#### 3.2 Organization Structure

**By Category**
- **Strength Training**
  - Upper Body
  - Lower Body
  - Full Body
  - Powerlifting
  - Bodybuilding
- **Cardio**
  - HIIT
  - Steady State
  - Interval Training
  - Running Programs
- **Functional Fitness**
  - CrossFit-style
  - Functional movements
  - Athletic training
- **Mobility & Flexibility**
  - Yoga
  - Stretching
  - Mobility work
  - Recovery
- **Specialty**
  - Core-focused
  - Balance & Stability
  - Sport-specific
  - Rehabilitation

**By Duration**
- Quick (15 min or less)
- Standard (30-45 min)
- Extended (60+ min)
- Custom duration filter

**By Difficulty**
- Beginner
- Intermediate
- Advanced
- All Levels

**By Equipment**
- Full Gym
- Home Gym
- Dumbbells Only
- Bodyweight Only
- Resistance Bands
- Kettlebells
- Custom equipment filter

**By Goal**
- Weight Loss
- Muscle Gain
- Endurance
- Strength
- Flexibility
- General Fitness
- Athletic Performance

#### 3.3 Workout Cards Design

Each workout card should display:
- **Workout Name** (prominent)
- **Type Badge** (color-coded by category)
- **Duration** (e.g., "30 min")
- **Difficulty Badge** (Beginner/Intermediate/Advanced)
- **Exercise Count** (e.g., "8 exercises")
- **Equipment Needed** (icons or text)
- **Preview Image/Icon** (optional)
- **Quick Stats**:
  - Estimated calories burned (if available)
  - Target muscle groups
  - Workout style tags
- **Action Buttons**:
  - "Preview" (view details)
  - "Start Workout" (begin immediately)
  - "Add to Favorites" (save for later)

#### 3.4 Search & Filter

**Search Bar**
- Search by workout name
- Search by exercise name
- Search by trainer name (if applicable)

**Advanced Filters**
- Duration range slider
- Difficulty multi-select
- Equipment multi-select
- Goal multi-select
- Workout type multi-select
- Trainer-created vs. system templates
- Recently added
- Most popular
- Highest rated (if ratings exist)

**Sort Options**
- Most Popular
- Newest
- Shortest Duration
- Longest Duration
- Alphabetical
- Recommended for You

---

## Integration with Programs

### Program Context Display
- When viewing a workout from explore, show:
  - "This workout is part of [Program Name]" (if applicable)
  - "Similar to workouts in your [Program Name]"
  - "Complements your current program"
- Link back to program view
- Show how workout fits into overall program structure

### Program-Based Recommendations
- "Complete your program workouts first" reminder
- "This workout complements Week 2 of your program"
- "Add this to your rest day"
- "This is similar to your scheduled [Workout Name]"

### Workout Assignment
- Option to "Add to Program" (if trainer allows)
- Request workout from trainer
- Save workout for later
- Schedule workout for specific day

---

## UI/UX Design Recommendations

### Layout Options

**Option 1: Sidebar Navigation**
- Left sidebar with:
  - "Your Workouts" (default/active)
  - "Recommended"
  - "Explore"
- Main content area shows selected section
- Sticky sidebar on desktop, bottom nav on mobile

**Option 2: Tab-Based Navigation**
- Horizontal tabs at top:
  - "Your Workouts" | "Recommended" | "Explore"
- Content below tabs
- Mobile: Scrollable tabs or dropdown

**Option 3: Dashboard Widgets**
- All sections visible on one page
- Scrollable sections
- Quick access to each section
- Most relevant content at top

**Recommendation: Option 2 (Tabs)**
- Clean, familiar interface
- Easy to navigate
- Works well on mobile
- Clear separation of content

### Visual Design

**Color Coding**
- **Your Workouts**: Blue/Primary (assigned, official)
- **Recommended**: Green (suggested, beneficial)
- **Explore**: Purple/Secondary (discovery, optional)
- **Completed**: Gray with checkmark
- **Overdue**: Red/Orange warning

**Card Design**
- Rounded corners
- Subtle shadows
- Hover effects
- Status indicators (badges, icons)
- Clear hierarchy (title, stats, actions)

**Mobile Optimization**
- Swipeable cards
- Bottom sheet modals for details
- Sticky action buttons
- Collapsible sections
- Touch-friendly targets (min 44px)

### Information Architecture

**Hierarchy:**
1. **Your Workouts** (highest priority - assigned workouts)
2. **Recommended** (medium priority - suggested workouts)
3. **Explore** (lowest priority - discovery/browsing)

**Within Each Section:**
1. Most relevant/urgent content first
2. Today's workout (if applicable)
3. Upcoming items
4. Historical items
5. Browse/discovery content

---

## Data Requirements

### Workout Data Structure
- Workout ID
- Workout name
- Workout type/category
- Duration
- Difficulty level
- Equipment needed
- Exercise list
- Target goals
- Trainer ID (if trainer-created)
- Is template (system vs. custom)
- Is recommended (trainer flag)
- Recommendation reason
- Completion history (for client)
- Favorite status

### Program Integration
- Link workouts to programs
- Track which workouts are part of active programs
- Track completion status per program
- Calculate program progress

### Recommendation Engine Data
- Client goals
- Client preferences
- Program structure
- Workout history
- Completion patterns
- Trainer recommendations
- Time availability
- Equipment access

---

## API Endpoints Needed

### Existing (May Need Enhancement)
- `GET /programs/client/assigned` - Get assigned programs
- `GET /programs/:id` - Get program details with workouts
- `POST /programs/workout/:workoutId/complete` - Complete workout

### New Endpoints Needed

**Workouts**
- `GET /workouts/explore` - Browse all available workouts
- `GET /workouts/recommended` - Get recommended workouts for client
- `GET /workouts/:id` - Get workout details
- `GET /workouts/client/history` - Get client's workout history
- `GET /workouts/client/favorites` - Get favorited workouts
- `POST /workouts/:id/favorite` - Add workout to favorites
- `DELETE /workouts/:id/favorite` - Remove from favorites
- `GET /workouts/categories` - Get workout categories/types
- `GET /workouts/filter` - Filter workouts by criteria

**Recommendations**
- `GET /recommendations/workouts` - Get personalized recommendations
- `POST /recommendations/workouts/:id/dismiss` - Dismiss recommendation
- `GET /recommendations/reasons` - Get why workouts are recommended

**Program Integration**
- `GET /programs/:id/workouts/upcoming` - Get upcoming workouts in program
- `GET /programs/:id/workouts/completed` - Get completed workouts
- `GET /programs/:id/progress` - Get program progress summary

---

## User Flows

### Flow 1: Viewing Your Workouts
1. Client opens app → Navigates to "Workouts" section
2. Defaults to "Your Workouts" tab
3. Sees today's workout prominently displayed
4. Scrolls to see upcoming workouts
5. Can filter by program, status, or date
6. Clicks on workout → Views details or starts workout

### Flow 2: Using Recommended Workouts
1. Client opens "Workouts" → "Recommended" tab
2. Sees personalized recommendations
3. Each card shows why it's recommended
4. Client browses recommendations
5. Clicks "Try This" on a workout
6. Views workout details
7. Can start immediately or save for later

### Flow 3: Exploring Workouts
1. Client opens "Workouts" → "Explore" tab
2. Sees categories (Strength, Cardio, etc.)
3. Selects a category (e.g., "Cardio")
4. Sees filtered list of cardio workouts
5. Applies additional filters (duration, difficulty)
6. Searches for specific workout
7. Views workout details
8. Can start workout, favorite it, or request from trainer

### Flow 4: Adding Supplemental Workout
1. Client is on rest day but wants to do something
2. Opens "Recommended" tab
3. Sees "Active Recovery" or "Light Cardio" suggestions
4. Selects a workout
5. Starts workout
6. Completes workout
7. Workout is logged but doesn't affect program progress

---

## Implementation Phases

### Phase 1: Core Structure (MVP)
1. Create "Workouts" page/section
2. Implement "Your Workouts" tab
   - Today's workout display
   - Upcoming workouts list
   - Workout history
3. Basic navigation between sections
4. Link to active workout component

### Phase 2: Recommendations (MVP)
1. Implement "Recommended" tab
2. Basic recommendation logic (complementary workouts)
3. Display recommended workouts
4. Simple filtering (by type, duration)
5. Start workout from recommendations

### Phase 3: Explore Tab (MVP)
1. Implement "Explore" tab
2. Category-based browsing
3. Basic filtering (type, duration, difficulty)
4. Workout detail view
5. Start workout from explore

### Phase 4: Enhanced Features
1. Advanced filtering and search
2. Favorites functionality
3. Workout preview mode
4. Trainer recommendations integration
5. Program context display
6. Workout scheduling

### Phase 5: Advanced Features
1. AI-powered recommendations
2. Workout ratings and reviews
3. Social features (share workouts)
4. Workout templates library
5. Custom workout creation (if allowed)

---

## Design Mockup Recommendations

### Desktop Layout
```
┌─────────────────────────────────────────────────┐
│  Workouts                                       │
├──────────┬──────────────────────────────────────┤
│          │  [Your Workouts] [Recommended]       │
│  Sidebar │  [Explore]                          │
│          │                                      │
│  Nav     │  ┌──────────────────────────────┐   │
│          │  │ Today's Workout (Large Card) │   │
│          │  └──────────────────────────────┘   │
│          │                                      │
│          │  Upcoming Workouts                  │
│          │  ┌────┐ ┌────┐ ┌────┐              │
│          │  │Card│ │Card│ │Card│              │
│          │  └────┘ └────┘ └────┘              │
│          │                                      │
│          │  Recent History                      │
│          │  ┌────┐ ┌────┐                      │
│          │  │Card│ │Card│                      │
│          │  └────┘ └────┘                      │
└──────────┴──────────────────────────────────────┘
```

### Mobile Layout
```
┌─────────────────────┐
│ Workouts            │
├─────────────────────┤
│ [Your] [Rec] [Exp]  │ ← Tabs
├─────────────────────┤
│                     │
│ ┌─────────────────┐ │
│ │ Today's Workout │ │ ← Large Card
│ │   [Start]       │ │
│ └─────────────────┘ │
│                     │
│ Upcoming            │
│ ┌─────────────────┐ │
│ │ Workout Name   │ │
│ │ Tomorrow • 30min │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ Workout Name    │ │
│ │ Mon, Jan 15     │ │
│ └─────────────────┘ │
│                     │
│ [View All]          │
└─────────────────────┘
```

---

## Key Features to Highlight

### 1. Seamless Integration
- Workouts from programs are clearly marked
- Easy navigation between program view and workout view
- Progress tracking across both

### 2. Smart Recommendations
- Context-aware suggestions
- Explains why workouts are recommended
- Respects program structure

### 3. Discovery
- Easy browsing by category
- Powerful search and filters
- Preview before starting

### 4. Flexibility
- Can do extra workouts without disrupting program
- Can explore new workout types
- Can save favorites for later

---

## Questions to Consider

1. **Should clients be able to create custom workouts?**
   - MVP: No (trainer-only)
   - Future: Yes, with trainer approval

2. **How do supplemental workouts affect program progress?**
   - MVP: Tracked separately, don't affect program completion
   - Future: Optional integration with program goals

3. **Should workouts be trainer-created only or include system templates?**
   - MVP: Both (trainer workouts + system templates)
   - System templates provide variety and options

4. **How detailed should workout previews be?**
   - MVP: Basic info (name, type, duration, exercise count)
   - Phase 2: Full exercise list, equipment needed

5. **Should clients be able to request specific workouts from trainer?**
   - MVP: No (keep it simple)
   - Phase 2: Yes, with request feature

6. **How do we handle workout conflicts?**
   - If client does recommended workout on program workout day
   - MVP: Allow both, track separately
   - Show warning if doing too much

7. **Should there be workout ratings/reviews?**
   - MVP: No
   - Phase 2: Yes, to improve recommendations

8. **How do we prevent workout overload?**
   - Show rest day reminders
   - Warn if doing too many workouts
   - Suggest recovery workouts

---

## Success Metrics

### Engagement Metrics
- % of clients who use "Your Workouts" section
- % of clients who try recommended workouts
- % of clients who explore additional workouts
- Average workouts completed per week
- Time spent in workouts section

### Program Adherence
- Program workout completion rate
- Supplemental workout frequency
- Balance between program and extra workouts

### User Satisfaction
- Ease of finding workouts
- Relevance of recommendations
- Overall satisfaction with workout variety

---

## Technical Considerations

### Performance
- Lazy load workout lists
- Cache workout data
- Optimize image loading
- Pagination for large lists

### Offline Support
- Cache "Your Workouts" for offline access
- Download workout details for offline viewing
- Sync when online

### Data Management
- Efficient workout data structure
- Optimize recommendation calculations
- Cache recommendations
- Update recommendations periodically

---

## Next Steps

1. **Review & Refine Plan**
   - Get feedback on structure
   - Adjust priorities
   - Finalize design approach

2. **Design Mockups**
   - Create wireframes for each section
   - Design workout cards
   - Design navigation structure
   - Mobile responsive designs

3. **Technical Planning**
   - Design database schema for workouts (if needed)
   - Plan API endpoints
   - Design recommendation algorithm
   - Plan component structure

4. **Implementation**
   - Start with "Your Workouts" section
   - Add "Recommended" section
   - Add "Explore" section
   - Integrate with existing program system
   - Test and iterate

---

## Notes

- Keep it simple for MVP - focus on core functionality
- Ensure mobile-first design
- Make it easy to find and start workouts
- Balance program adherence with flexibility
- Provide clear context and guidance
- Make recommendations feel helpful, not pushy


