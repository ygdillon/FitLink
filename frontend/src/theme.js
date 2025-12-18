import { createTheme } from '@mantine/core'

export const theme = createTheme({
  primaryColor: 'green',
  
  colors: {
    green: [
      '#F5F9F0', // 0 - lightest background
      '#E8F5D8', // 1 - light green
      '#D4EDB8', // 2
      '#B8E08A', // 3
      '#9BCF53', // 4 - primary pear green
      '#7BA53E', // 5 - dark green
      '#5A7A3A', // 6
      '#3F5A2A', // 7
      '#2C3E1F', // 8
      '#1A2412', // 9 - darkest
    ],
  },

  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',

  headings: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    sizes: {
      h1: { fontSize: '2rem', lineHeight: '1.2', fontWeight: '600' },
      h2: { fontSize: '1.75rem', lineHeight: '1.3', fontWeight: '600' },
      h3: { fontSize: '1.5rem', lineHeight: '1.4', fontWeight: '600' },
      h4: { fontSize: '1.25rem', lineHeight: '1.4', fontWeight: '600' },
    },
  },

  defaultRadius: 'md',

  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          fontWeight: 500,
        },
      },
    },
    Card: {
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
        withBorder: true,
      },
    },
    Input: {
      defaultProps: {
        radius: 'md',
      },
    },
    Paper: {
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
        withBorder: true,
      },
    },
  },

  other: {
    sidebarWidth: 240,
  },
})

