# Mantine Setup Instructions

## Installation

Run this command in the `frontend` directory:

```bash
cd frontend
npm install @mantine/core @mantine/hooks @mantine/form @mantine/notifications @mantine/dates
```

## What's Been Set Up

### ✅ Completed

1. **Theme Configuration** (`frontend/src/theme.js`)
   - Pear green color scheme configured
   - Typography settings
   - Component defaults

2. **MantineProvider Setup** (`frontend/src/App.jsx`)
   - Wrapped app with MantineProvider
   - Added Notifications component

3. **CSS Imports** (`frontend/src/main.jsx`)
   - Added Mantine core styles
   - Added dates styles
   - Added notifications styles

4. **Migrated Components** (Proof of Concept)
   - ✅ Login page - Fully migrated to Mantine
   - ✅ Register page - Fully migrated to Mantine

## Next Steps

After installing packages, you can:

1. **Test the migrated pages**:
   - Visit `/login` and `/register` to see Mantine components in action

2. **Continue migration**:
   - Follow the migration plan in `MANTINE_MIGRATION_PLAN.md`
   - Migrate components incrementally

3. **Verify theme**:
   - Check that colors match your pear green theme
   - Adjust theme.js if needed

## Component Examples

### Buttons
```jsx
import { Button } from '@mantine/core'

<Button>Click me</Button>
<Button variant="outline">Outline</Button>
<Button loading={isLoading}>Loading</Button>
```

### Inputs
```jsx
import { TextInput, PasswordInput, Select } from '@mantine/core'

<TextInput label="Email" placeholder="your@email.com" />
<PasswordInput label="Password" />
<Select label="Role" data={[...]} />
```

### Cards
```jsx
import { Card, Paper } from '@mantine/core'

<Paper p="md" shadow="sm" withBorder>
  Content here
</Paper>
```

## Notes

- The theme is configured to use your pear green colors
- All Mantine components will automatically use the theme
- Custom CSS files are still in place and will work alongside Mantine
- Gradually remove custom CSS as you migrate more components

