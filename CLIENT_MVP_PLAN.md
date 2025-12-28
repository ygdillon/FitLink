# Client-Side MVP - Product Plan

## Overview
This document outlines the MVP features for the client-facing side of the Personal Trainer App, focusing on program viewing, workout execution, and progress tracking.

---

## Core Features

### 1. Program Overview & Navigation

#### 1.1 Program Dashboard
- **View All Assigned Programs**
  - List of active programs assigned by trainer
  - Program cards showing:
    - Program name
    - Split type (e.g., "Push Pull Legs", "Upper Lower")
    - Duration (weeks)
    - Progress indicator (e.g., "Week 2 of 4")
    - Completion status
  - Quick stats:
    - Total workouts completed
    - Current week
    - Days completed

- **Program Details View**
  - Full program information
  - Week-by-week breakdown with custom week names
  - Overall program description
  - Start date and expected completion date

#### 1.2 Week Organization
- **Week Selector/Navigation**
  - Dropdown or tabs to switch between weeks
  - Display custom week names (e.g., "Push Pull Legs", "Upper Lower")
  - Visual indicator of current week
  - Progress bar showing week completion

- **Week Overview**
  - All 7 days of the week visible
  - Day cards showing:
    - Day number (Day 1, Day 2, etc.)
    - Assigned workout name (if any)
    - Workout status (Not Started, In Progress, Completed)
    - Rest day indicator
  - Quick stats for the week:
    - Workouts completed
    - Workouts remaining
    - Rest days

#### 1.3 Day Organization
- **Day View**
  - Individual day card/panel
  - Shows:
    - Day number and date (if program has start date)
    - Assigned workout(s) for that day
    - Workout status
    - Quick preview of exercises
  - Action buttons:
    - "Start Workout" (if not completed)
    - "View Workout" (to see details)
    - "View Log" (if completed)

- **Today's Workout Quick Access**
  - Prominent card/button on dashboard
  - Shows today's scheduled workout
  - One-click access to start workout
  - "No workout today" message if rest day

---

### 2. Workout Viewing & Details

#### 2.1 Workout List View
- **All Workouts in Program**
  - Scrollable list of all workouts
  - Organized by week and day
  - Filter options:
    - By week
    - By workout type
    - Completed vs. Not completed
  - Search functionality

#### 2.2 Workout Detail View
- **Workout Information**
  - Workout name
  - Week and day assignment
  - Estimated duration
  - Exercise count
  - Workout type tags (e.g., "Strength", "Cardio", "HIIT")

- **Exercise List**
  - All exercises in the workout
  - For each exercise:
    - Exercise name
    - Exercise type badge (AMRAP, INTERVAL, REGULAR, TABATA, EMOM)
    - Sets, Reps, Weight
    - Duration (if applicable)
    - Rest time
    - Tempo (if applicable)
    - Notes/instructions
  - Exercise order/sequence clearly indicated

- **Workout Preview Mode**
  - Read-only view of workout
  - "Start Workout" button to begin active session

---

### 3. Active Workout Execution

#### 3.1 Workout Session Interface
- **Workout Header**
  - Workout name
  - Timer (elapsed time)
  - Exercise counter (e.g., "Exercise 2 of 5")
  - Pause/Resume button
  - Exit workout button (with confirmation)

#### 3.2 Exercise Execution
- **Current Exercise Card**
  - Large, clear display of current exercise
  - Exercise name (prominent)
  - Exercise type indicator
  - Target sets, reps, weight
  - Instructions/notes

- **Set Tracking**
  - For each set:
    - Set number indicator
    - Input fields for:
      - Weight used (with +/- buttons)
      - Reps completed
      - RPE (Rate of Perceived Exertion) - optional
      - Notes (optional)
    - "Complete Set" button
    - Rest timer (auto-starts after completing set)
    - Skip set option

- **Exercise Completion**
  - Mark exercise as complete
  - Show summary of sets completed
  - Auto-advance to next exercise
  - Option to go back to previous exercise

#### 3.3 Workout Flow
- **Navigation**
  - Previous/Next exercise buttons
  - Exercise list sidebar (shows all exercises, current highlighted)
  - Quick jump to any exercise

- **Rest Timer**
  - Automatic countdown after completing set
  - Visual and audio alerts (optional)
  - "Skip Rest" button
  - Shows next exercise during rest

- **Workout Completion**
  - Summary screen showing:
    - Total time
    - Exercises completed
    - Total volume (if applicable)
    - Personal records achieved (if any)
  - Option to add notes about the workout
  - "Save & Complete" button
  - Option to share completion (future feature)

#### 3.4 Workout History
- **Completed Workouts Log**
  - List of all completed workout sessions
  - Date and time completed
  - Duration
  - Exercises completed
  - Personal records
  - Notes
  - View detailed log of sets/reps/weights used

---

### 4. Schedule & Calendar View

#### 4.1 Weekly Calendar
- **Calendar Grid**
  - 7-day week view
  - Each day shows:
    - Date
    - Assigned workout (if any)
    - Completion status (checkmark if done)
    - Rest day indicator
  - Current day highlighted
  - Past days (grayed out if not completed)
  - Future days (upcoming workouts)

- **Month View** (optional for MVP)
  - Full month calendar
  - Workout days marked
  - Completion status visible
  - Click day to see details

#### 4.2 Schedule Organization
- **Workout Schedule**
  - List view of upcoming workouts
  - Sorted by date
  - Shows:
    - Day and date
    - Workout name
    - Estimated duration
    - Status (Upcoming, Today, Overdue)

- **Progress Tracking**
  - Weekly progress bar
  - Completion percentage
  - Streak counter (consecutive days with completed workouts)
  - Missed workouts indicator

---

### 5. Day Organization & Quick Access

#### 5.1 Today's View
- **Dashboard Widget**
  - Large, prominent card showing today's workout
  - Quick stats:
    - Workout name
    - Number of exercises
    - Estimated duration
    - Last completed (if repeating workout)
  - Primary action: "Start Workout"
  - Secondary action: "View Details"

#### 5.2 Day-by-Day Navigation
- **Day Selector**
  - Easy navigation between days
  - Previous/Next day buttons
  - Jump to today button
  - Calendar picker (optional)

- **Day Details Panel**
  - Full day information
  - All workouts assigned to that day
  - Rest day message if no workouts
  - Historical data (if day has passed)
  - Upcoming workouts preview

---

## User Flows

### Flow 1: Starting a Workout
1. Client opens app → Dashboard
2. Sees "Today's Workout" card
3. Clicks "Start Workout"
4. Workout detail screen appears (preview mode)
5. Clicks "Begin Workout" button
6. Active workout session starts
7. Client completes exercises, tracks sets
8. Completes workout → Summary screen
9. Saves workout → Returns to dashboard

### Flow 2: Viewing Program
1. Client opens app → Dashboard
2. Clicks on assigned program card
3. Program detail view opens
4. Sees week selector, selects week
5. Views all days in that week
6. Clicks on specific day
7. Sees workout details for that day
8. Can start workout or just view details

### Flow 3: Checking Schedule
1. Client opens app → Dashboard
2. Navigates to "Schedule" or "Calendar" tab
3. Sees weekly calendar view
4. Views upcoming workouts
5. Clicks on specific day
6. Sees workout details
7. Can start workout from schedule view

### Flow 4: Reviewing Progress
1. Client opens app → Dashboard
2. Sees progress indicators
3. Clicks "View History" or "Completed Workouts"
4. Sees list of completed workouts
5. Clicks on specific workout
6. Views detailed log of what was done
7. Can see progress over time

---

## UI/UX Considerations

### Design Principles
- **Simplicity**: Easy to navigate, minimal clicks to start workout
- **Clarity**: Large, readable text during active workout
- **Feedback**: Clear visual indicators for completed/upcoming workouts
- **Motivation**: Progress indicators, completion celebrations
- **Accessibility**: Works well on mobile devices (primary use case)

### Key Screens
1. **Dashboard/Home**
   - Today's workout (prominent)
   - Program cards
   - Quick stats
   - Navigation to schedule, history, etc.

2. **Program View**
   - Week selector
   - Day grid (7 days)
   - Workout cards per day
   - Navigation to workout details

3. **Workout Preview**
   - Workout information
   - Exercise list
   - "Start Workout" button
   - Back to program view

4. **Active Workout**
   - Current exercise (large, clear)
   - Set tracking interface
   - Rest timer
   - Exercise navigation
   - Completion flow

5. **Schedule/Calendar**
   - Weekly grid
   - Day details
   - Workout assignments
   - Completion status

6. **History/Progress**
   - Completed workouts list
   - Workout details/logs
   - Progress charts (optional for MVP)

---

## Technical Considerations

### Data Requirements
- Program data (already exists)
- Workout data (already exists)
- Workout completion records (needs to be created/used)
- Client progress tracking
- Schedule/calendar data

### API Endpoints Needed

**Existing Endpoints:**
- `GET /programs/client/assigned` ✅
- `GET /programs/:id` ✅
- `POST /programs/workout/:workoutId/complete` ✅ (may need enhancement)

**New Endpoints Needed:**
- `GET /programs/workout/:workoutId/completions` - Get workout completion history
- `GET /programs/:id/progress` - Get program progress summary
- `GET /programs/:id/schedule` - Get schedule/calendar data
- `GET /programs/:id/week/:weekNumber` - Get specific week data
- `POST /programs/workout/:workoutId/start` - Mark workout as started (optional)
- `PUT /programs/workout/:workoutId/completion/:completionId` - Update completion details
- `GET /programs/:id/stats` - Get program statistics (completion rate, PRs, etc.)
- `GET /exercises/:exerciseName/details` - Get exercise instructions/details (if exercise library)
- `POST /notifications/preferences` - Set notification preferences
- `GET /client/check-ins` - Get check-in history (Phase 2)
- `POST /client/check-ins` - Submit check-in (Phase 2)

### State Management
- Current workout session state
- Program data caching
- Workout completion tracking
- Schedule/calendar state

---

## Additional Recommended Features

### 6. Workout Preparation & Guidance

#### 6.1 Pre-Workout Preparation
- **Equipment Checklist**
  - List of required equipment for the workout
  - Check off items as you gather them
  - Alternative equipment suggestions if unavailable

- **Warm-up Reminder**
  - Suggested warm-up routine before workout
  - Quick warm-up exercises
  - Duration estimate
  - Option to skip (but with reminder)

- **Workout Preview Before Starting**
  - Estimated total duration
  - Exercise count
  - Difficulty level indicator
  - Equipment needed summary
  - "Ready to Start?" confirmation screen

#### 6.2 Exercise Guidance
- **Exercise Instructions**
  - Form tips and cues
  - Common mistakes to avoid
  - Muscle groups targeted
  - Exercise variations/modifications

- **Exercise Substitution** (Phase 2)
  - If client can't perform an exercise
  - Suggest alternative exercises
  - Maintain similar muscle group targeting
  - Trainer-approved substitutions

- **Exercise Library Integration** (Phase 2)
  - Video demonstrations
  - Animated form guides
  - Written instructions
  - Searchable exercise database

### 7. Progress Tracking & Analytics

#### 7.1 Visual Progress
- **Progress Charts**
  - Volume progression over time
  - Weight progression per exercise
  - Workout completion rate
  - Weekly/monthly trends

- **Personal Records (PRs)**
  - Automatic PR detection
  - Celebration when PR achieved
  - PR history per exercise
  - "PR Badge" system

- **Streak Tracking**
  - Consecutive workout days
  - Weekly completion streaks
  - Longest streak display
  - Streak recovery after missed days

#### 7.2 Body Measurements (Phase 2)
- **Progress Photos**
  - Before/after photo uploads
  - Date-stamped photos
  - Side-by-side comparison
  - Private gallery (only client and trainer see)

- **Body Metrics**
  - Weight tracking
  - Body measurements (chest, waist, etc.)
  - Body fat percentage (if tracked)
  - Integration with program goals

### 8. Communication & Feedback

#### 8.1 Trainer Communication
- **Workout Comments**
  - Trainer can leave notes on workouts
  - Client can see trainer feedback
  - Form corrections or encouragement
  - Questions/answers thread

- **Check-in System** (Phase 2)
  - Daily check-in prompts
  - How did the workout feel?
  - Energy level rating
  - Pain/discomfort reporting
  - Quick message to trainer

- **Achievement Sharing**
  - Share completed workouts
  - Share PRs with trainer
  - Receive trainer congratulations
  - Motivation messages

### 9. Notifications & Reminders

#### 9.1 Workout Reminders
- **Scheduled Reminders**
  - Push notifications for workout days
  - Customizable reminder times
  - "Time to workout!" notifications
  - Reminder for overdue workouts

- **Motivational Messages**
  - Daily motivation quotes
  - Progress celebration messages
  - Trainer encouragement
  - Milestone notifications

#### 9.2 Smart Notifications
- **Context-Aware Reminders**
  - Remind if workout not started by usual time
  - Remind about upcoming rest days
  - Remind about program milestones
  - Weekly summary notifications

### 10. Offline Capability

#### 10.1 Offline Workout Mode
- **Download Workouts**
  - Cache workout data locally
  - Workout available without internet
  - Sync when connection restored

- **Offline Tracking**
  - Complete workouts offline
  - Track sets/reps/weights offline
  - Save locally, sync later
  - No data loss if connection drops

### 11. Accessibility & Usability

#### 11.1 Accessibility Features
- **Text Size Options**
  - Adjustable font sizes
  - High contrast mode
  - Large touch targets
  - Screen reader support

- **Voice Commands** (Future)
  - Voice navigation during workout
  - "Next exercise" voice command
  - "Complete set" voice command
  - Hands-free operation

#### 11.2 Customization
- **Workout Preferences**
  - Default weight units (lbs/kg)
  - Rest timer preferences
  - Sound/vibration preferences
  - Display preferences

- **Quick Actions**
  - Favorite exercises
  - Frequently used weights
  - Quick weight increment buttons
  - Custom rest time presets

### 12. Data & Export

#### 12.1 Workout History
- **Detailed Logs**
  - Complete workout history
  - Filter by date range
  - Filter by workout type
  - Search functionality

- **Export Options** (Phase 2)
  - Export workout data (CSV/PDF)
  - Share workout summaries
  - Print workout logs
  - Backup data

### 13. Integration Readiness

#### 13.1 Future Integrations (Prepare Architecture)
- **Fitness Trackers**
  - Apple Health integration
  - Google Fit integration
  - Heart rate monitoring
  - Step counting

- **Wearables**
  - Apple Watch support
  - Smartwatch workout tracking
  - Heart rate zones
  - Activity rings

### 14. Motivation & Gamification

#### 14.1 Achievement System
- **Badges & Rewards**
  - Workout completion badges
  - Consistency badges
  - PR badges
  - Milestone achievements

- **Progress Visualization**
  - Visual progress bars
  - Completion percentages
  - Goal tracking
  - Celebration animations

#### 14.2 Social Elements (Future)
- **Community Features**
  - Share achievements (optional)
  - See trainer's other clients' progress (anonymized)
  - Leaderboards (if desired)
  - Workout challenges

## MVP Scope (Phase 1)

### Must Have
1. ✅ View assigned programs
2. ✅ View program details with week/day organization
3. ✅ View workout details (exercises, sets, reps)
4. ✅ Start active workout session
5. ✅ Track sets/reps/weight during workout
6. ✅ Complete and save workout
7. ✅ View workout history/completions
8. ✅ Weekly schedule view
9. ✅ Today's workout quick access
10. ✅ **Workout preparation (equipment checklist, warm-up reminder)**
11. ✅ **Exercise instructions/form tips**
12. ✅ **Progress tracking (basic charts, PR detection)**
13. ✅ **Workout reminders/notifications**
14. ✅ **Offline workout capability**

### Nice to Have (Phase 2)
- Progress charts/graphs (advanced)
- Personal records tracking (detailed)
- Workout notes/comments
- Rest timer with audio
- Workout sharing
- Month calendar view
- Exercise substitution
- RPE tracking
- **Progress photos**
- **Body measurements tracking**
- **Trainer communication/feedback**
- **Check-in system**
- **Achievement badges**
- **Data export**

### Future Enhancements
- Social features (share workouts)
- Photo/video logging (advanced)
- Integration with fitness trackers
- Nutrition tracking integration
- Advanced analytics
- Workout recommendations
- **Voice commands**
- **Exercise library with videos**
- **Wearable device integration**
- **Community features**

---

## Next Steps

1. **Review & Refine Plan**
   - Get feedback on feature priorities
   - Adjust scope if needed
   - Finalize user flows

2. **Design Mockups**
   - Create wireframes for key screens
   - Design active workout interface
   - Design schedule/calendar view

3. **Technical Planning**
   - Review existing API endpoints
   - Identify new endpoints needed
   - Plan database schema changes (if any)
   - Plan component structure

4. **Implementation**
   - Start with core features
   - Build incrementally
   - Test with real users
   - Iterate based on feedback

---

## Questions to Consider

1. Should clients be able to modify workouts or only view/complete them?
2. Do we need offline capability for workout execution? **→ YES (Recommended)**
3. Should there be a rest timer with sound, or just visual? **→ Visual for MVP, sound in Phase 2**
4. How detailed should the workout history be? **→ Full set-by-set tracking**
5. Should clients see their trainer's notes/comments on workouts? **→ YES (Recommended)**
6. Do we need notifications/reminders for scheduled workouts? **→ YES (Recommended)**
7. Should clients be able to reschedule workouts or only trainers? **→ Only trainers for MVP**
8. How do we handle missed workouts? (Mark as skipped? Allow late completion?) **→ Allow late completion, mark as "completed late"**
9. **Should clients be able to substitute exercises? → Phase 2, with trainer approval**
10. **Do we want progress photos in MVP? → Phase 2 (nice to have)**
11. **Should workout data sync in real-time or batch? → Batch sync is fine for MVP**
12. **Do we need exercise video demos in MVP? → Phase 2 (text instructions sufficient for MVP)**
13. **Should clients see other clients' progress? → No, keep private**
14. **How do we handle workout modifications mid-session? → Allow skipping exercises, note why**

---

## Recommended Implementation Priority

### Phase 1 (Core MVP) - Weeks 1-3
1. Program viewing (dashboard, program details, week/day organization)
2. Workout viewing (details, exercise list)
3. Active workout execution (tracking, completion)
4. Basic schedule view
5. Workout history
6. Offline capability (critical for gym use)

### Phase 1.5 (Enhanced MVP) - Weeks 4-5
7. Workout reminders/notifications
8. Progress tracking (basic charts, PR detection)
9. Exercise instructions/form tips
10. Workout preparation (equipment checklist)

### Phase 2 (Nice to Have) - Weeks 6-8
11. Advanced progress charts
12. Trainer communication/feedback
13. Achievement badges
14. Exercise substitution
15. Progress photos
16. Check-in system

### Phase 3 (Future)
17. Social features
18. Advanced integrations
19. Advanced analytics
20. Community features

## Technical Recommendations

### Performance
- **Optimize for mobile**: Lightweight, fast loading
- **Image optimization**: Compress workout images, lazy load
- **Caching strategy**: Cache program/workout data locally
- **Offline-first**: Design for offline, sync when online

### User Experience
- **Progressive enhancement**: Core features work without JS (if possible)
- **Error handling**: Graceful degradation, clear error messages
- **Loading states**: Show progress indicators, skeleton screens
- **Feedback**: Immediate visual feedback for all actions

### Security & Privacy
- **Data privacy**: Client data only visible to client and their trainer
- **Secure storage**: Encrypt sensitive data locally
- **Authentication**: Secure login, session management
- **Permissions**: Request only necessary permissions

## Notes

- This MVP focuses on the core workout execution experience
- Keep it simple and focused on the primary use case: completing workouts
- Build for mobile-first experience
- Ensure smooth, intuitive workout flow
- Make progress visible and motivating
- **Offline capability is critical** - many gyms have poor connectivity
- **Notifications are important** - help with consistency and engagement
- **Progress tracking motivates** - make achievements visible
- **Trainer communication builds trust** - enable feedback loop

