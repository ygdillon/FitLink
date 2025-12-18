# Mantine Migration Plan for FitLink

## Overview
This document outlines the step-by-step migration from custom CSS components to Mantine UI components while maintaining the existing pear green theme and functionality.

## Current State Analysis

### Components to Migrate
- **23 Page Components** (Login, Register, Dashboards, Forms, etc.)
- **Navigation**: Sidebar with NavLinks
- **Forms**: Registration, Onboarding, Check-ins, Workout Builder
- **Cards**: Client cards, Trainer cards, Request cards
- **Modals**: Request modals, Action modals
- **Tables/Lists**: Client lists, Workout lists, Request lists
- **Buttons**: Various styled buttons throughout
- **Inputs**: Text inputs, selects, textareas, checkboxes, radio buttons
- **Tabs**: Client profile tabs, Settings tabs
- **Progress Indicators**: Progress bars, step indicators

### Current Theme Colors
- Primary Green: `#9BCF53`
- Dark Green: `#7BA53E`
- Background: `#F5F9F0`
- Light Green: `#E8F5D8`
- Text: `#2c3e50`, `#666`, `#333`

## Phase 1: Setup & Foundation (Priority: Critical)

### 1.1 Installation
```bash
npm install @mantine/core @mantine/hooks @mantine/form @mantine/notifications
npm install @mantine/dates  # For date pickers if needed
```

### 1.2 Theme Configuration
- Create `frontend/src/theme.js` with pear green color scheme
- Configure MantineProvider in `App.jsx`
- Set up global styles to match current design
- Configure font family and default styles

### 1.3 Core Setup Files
- `frontend/src/theme.js` - Theme configuration
- Update `frontend/src/App.jsx` - Wrap with MantineProvider
- Update `frontend/src/main.jsx` - Import Mantine CSS

## Phase 2: Core Components (Priority: High)

### 2.1 Navigation (Week 1)
**File**: `components/Navbar.jsx`
- Replace custom sidebar with Mantine `Navbar` or `AppShell`
- Use `NavLink` from Mantine or custom navigation
- Migrate sidebar styling to Mantine theme

**Mantine Components**:
- `AppShell` or `Navbar`
- `NavLink` or custom navigation with Mantine `Button` variants

### 2.2 Buttons (Week 1)
**Files**: All pages
- Replace all `<button>` with Mantine `Button`
- Standardize button variants (primary, secondary, danger)
- Use Mantine button sizes and loading states

**Mantine Components**:
- `Button` with variants: `filled`, `outline`, `subtle`
- `ActionIcon` for icon buttons

### 2.3 Forms (Week 1-2)
**Files**: 
- `pages/Register.jsx`
- `pages/Login.jsx`
- `pages/ClientOnboarding.jsx`
- `pages/AddClient.jsx`
- `pages/DailyCheckIn.jsx`

**Mantine Components**:
- `TextInput` for text inputs
- `PasswordInput` for password fields
- `Select` for dropdowns
- `Textarea` for text areas
- `Checkbox` for checkboxes
- `Radio` for radio buttons
- `NumberInput` for numeric inputs
- `DatePicker` for dates (if needed)
- `Form` with `useForm` hook for form management

## Phase 3: Layout Components (Priority: High)

### 3.1 Cards (Week 2)
**Files**: 
- `pages/Clients.jsx`
- `pages/TrainerDashboard.jsx`
- `pages/ClientDashboard.jsx`
- `pages/TrainerRequests.jsx`
- `pages/Settings.jsx`

**Mantine Components**:
- `Card` for card containers
- `Card.Section` for card sections
- `Group` for card layouts

### 3.2 Containers & Layouts (Week 2)
**Files**: All dashboard pages
- Replace custom containers with Mantine `Container`
- Use `Stack` for vertical layouts
- Use `Group` for horizontal layouts
- Use `Grid` for grid layouts

**Mantine Components**:
- `Container` with size variants
- `Stack` for vertical spacing
- `Group` for horizontal grouping
- `Grid` for responsive grids
- `Paper` for elevated surfaces

### 3.3 Tabs (Week 2)
**Files**:
- `pages/ClientProfile.jsx`
- `pages/Settings.jsx`
- `pages/ClientNutrition.jsx`

**Mantine Components**:
- `Tabs` with `Tabs.List` and `Tabs.Panel`
- `Tabs.Tab` for individual tabs

## Phase 4: Advanced Components (Priority: Medium)

### 4.1 Modals (Week 3)
**Files**:
- `pages/Settings.jsx` (Request modal)
- `pages/TrainerRequests.jsx` (Action modals)
- `pages/WorkoutLibrary.jsx` (Assignment modal)

**Mantine Components**:
- `Modal` with `Modal.Title`, `Modal.Body`, `Modal.Close`
- `useDisclosure` hook for modal state

### 4.2 Notifications (Week 3)
**Files**: All pages with success/error messages
- Replace custom message divs with Mantine notifications
- Use `notifications.show()` for toasts

**Mantine Components**:
- `notifications` from `@mantine/notifications`
- `NotificationProvider` in App.jsx

### 4.3 Progress & Indicators (Week 3)
**Files**:
- `pages/ClientOnboarding.jsx` (Progress bar)
- `pages/ClientProgress.jsx` (Progress tracking)

**Mantine Components**:
- `Progress` for progress bars
- `Stepper` for multi-step forms
- `Badge` for status indicators
- `Loader` for loading states

### 4.4 Tables & Lists (Week 3-4)
**Files**:
- `pages/Clients.jsx` (Client list)
- `pages/WorkoutLibrary.jsx` (Workout list)
- `pages/TrainerRequests.jsx` (Request list)

**Mantine Components**:
- `Table` for data tables
- `ScrollArea` for scrollable lists
- `List` for simple lists

## Phase 5: Specialized Components (Priority: Medium-Low)

### 5.1 Calendar & Scheduling (Week 4)
**Files**:
- `pages/ClientSchedule.jsx`
- `pages/ClientDashboard.jsx` (Schedule view)

**Mantine Components**:
- `Calendar` from `@mantine/dates`
- `DatePickerInput` for date selection

### 5.2 Data Display (Week 4)
**Files**:
- `pages/ClientProgress.jsx` (Charts/graphs)
- `pages/TrainerDashboard.jsx` (Stats)

**Mantine Components**:
- `Text` for typography
- `Title` for headings
- `ThemeIcon` for icon containers
- Consider `recharts` or `@mantine/charts` for graphs

### 5.3 Form Enhancements (Week 4)
**Files**: All form pages
- Form validation with Mantine `useForm`
- Error states and messages
- Field arrays for dynamic forms

**Mantine Components**:
- `useForm` hook with validation
- `Input.Wrapper` for form field grouping
- `Input.Error` for error messages

## Phase 6: Cleanup & Optimization (Priority: Low)

### 6.1 Remove Custom CSS (Week 5)
- Gradually remove custom CSS files as components are migrated
- Keep only necessary custom styles
- Document any custom overrides

### 6.2 Theme Refinement (Week 5)
- Fine-tune theme colors to match exactly
- Adjust spacing and typography
- Ensure consistent component styling

### 6.3 Performance Optimization (Week 5)
- Remove unused CSS
- Optimize Mantine imports (tree-shaking)
- Check bundle size impact

## Migration Strategy

### Approach: Incremental Migration
1. **Start with low-risk components**: Buttons, Inputs, Cards
2. **Migrate page by page**: Complete one page fully before moving to next
3. **Maintain functionality**: Ensure no features break during migration
4. **Test after each phase**: Verify UI and functionality

### Testing Checklist (Per Component)
- [ ] Visual appearance matches design
- [ ] Functionality works as before
- [ ] Responsive design maintained
- [ ] Accessibility preserved
- [ ] Theme colors correct
- [ ] No console errors

## Component Mapping Reference

| Current Component | Mantine Replacement |
|------------------|---------------------|
| Custom buttons | `Button` |
| Custom inputs | `TextInput`, `Select`, `Textarea` |
| Custom cards | `Card` |
| Custom modals | `Modal` |
| Custom tabs | `Tabs` |
| Custom containers | `Container`, `Paper` |
| Custom forms | `useForm` hook + Mantine inputs |
| Custom notifications | `notifications` |
| Custom progress bars | `Progress` |
| Custom lists | `List`, `Table` |
| Custom navigation | `AppShell`, `Navbar` |

## Theme Configuration

```javascript
// theme.js structure
{
  primaryColor: 'green',
  colors: {
    green: [
      '#F5F9F0', // 0 - lightest
      '#E8F5D8', // 1
      '#D4EDB8', // 2
      '#B8E08A', // 3
      '#9BCF53', // 4 - primary
      '#7BA53E', // 5 - dark
      '#5A7A3A', // 6
      '#3F5A2A', // 7
      '#2C3E1F', // 8
      '#1A2412', // 9 - darkest
    ],
  },
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...',
  // ... other theme config
}
```

## Timeline Estimate

- **Week 1**: Setup + Navigation + Buttons + Basic Forms
- **Week 2**: Cards + Layouts + Tabs
- **Week 3**: Modals + Notifications + Progress + Tables
- **Week 4**: Calendar + Data Display + Form Enhancements
- **Week 5**: Cleanup + Optimization + Final Testing

**Total Estimated Time**: 4-5 weeks for complete migration

## Risk Mitigation

1. **Create feature branch**: `feature/mantine-migration`
2. **Migrate incrementally**: One component/page at a time
3. **Keep old CSS**: Don't delete until migration is verified
4. **Test thoroughly**: After each phase
5. **Document changes**: Update component docs as you go

## Success Criteria

- [ ] All components use Mantine
- [ ] Theme matches current pear green design
- [ ] All functionality preserved
- [ ] No visual regressions
- [ ] Improved consistency across app
- [ ] Better accessibility
- [ ] Reduced custom CSS by 80%+

## Next Steps

1. Review and approve this plan
2. Create feature branch
3. Begin Phase 1: Setup & Foundation
4. Start with low-risk components (buttons, inputs)
5. Gradually migrate higher-level components

