import { createTheme } from '@mantine/core'

// Robinhood-inspired color palette - clean, modern, professional
// Based on Robinhood's signature green and their modern "Robin Neon" accent
const robinhoodGreen = [
  '#f0fdf4', // 0 - lightest
  '#dcfce7', // 1
  '#bbf7d0', // 2
  '#86efac', // 3
  '#4ade80', // 4
  '#22c55e', // 5 - Classic Robinhood green
  '#16a34a', // 6 - Primary green
  '#15803d', // 7
  '#166534', // 8
  '#14532d', // 9 - darkest
]

const robinNeon = [
  '#f7fce8', // 0
  '#eff9d1', // 1
  '#dff3a3', // 2
  '#cfed75', // 3
  '#bfe747', // 4
  '#b0e313', // 5 - Robin Neon (bright yellow-green)
  '#9cc911', // 6
  '#88af0f', // 7
  '#74950d', // 8
  '#607b0b', // 9
]

const charcoalGray = [
  '#f8fafc', // 0
  '#f1f5f9', // 1
  '#e2e8f0', // 2
  '#cbd5e1', // 3
  '#94a3b8', // 4
  '#64748b', // 5
  '#475569', // 6
  '#334155', // 7 - Primary charcoal
  '#1e293b', // 8
  '#0f172a', // 9 - darkest
]

const slateBlue = [
  '#f8fafc',
  '#f1f5f9',
  '#e2e8f0',
  '#cbd5e1',
  '#94a3b8',
  '#64748b',
  '#475569',
  '#334155', // Primary slate
  '#1e293b',
  '#0f172a',
]

const neutralGray = [
  '#fafafa',
  '#f5f5f5',
  '#e5e5e5',
  '#d4d4d4',
  '#a3a3a3',
  '#737373',
  '#525252',
  '#404040',
  '#262626',
  '#171717',
]

export const theme = createTheme({
  primaryColor: 'robinhoodGreen',
  
  colors: {
    robinhoodGreen,
    robinNeon,
    charcoalGray,
    slateBlue,
    neutralGray,
  },

  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Inter", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',

  headings: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Inter", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    sizes: {
      h1: { fontSize: '2.25rem', lineHeight: '1.2', fontWeight: '700' },
      h2: { fontSize: '1.875rem', lineHeight: '1.3', fontWeight: '600' },
      h3: { fontSize: '1.5rem', lineHeight: '1.4', fontWeight: '600' },
      h4: { fontSize: '1.25rem', lineHeight: '1.4', fontWeight: '600' },
    },
  },

  defaultRadius: 'sm',

  white: '#ffffff',
  black: '#0a0a0a',

  components: {
    Button: {
      defaultProps: {
        radius: 'sm',
      },
      styles: {
        root: {
          fontWeight: 500,
          transition: 'all 0.2s ease',
        },
      },
    },
    Card: {
      defaultProps: {
        radius: 'sm',
        shadow: 'sm',
        withBorder: true,
      },
      styles: {
        root: {
          transition: 'box-shadow 0.2s ease',
          borderWidth: '1.5px',
        },
      },
    },
    Input: {
      defaultProps: {
        radius: 'sm',
      },
      styles: {
        input: {
          transition: 'border-color 0.2s ease',
          borderWidth: '1.5px',
        },
      },
    },
    Paper: {
      defaultProps: {
        radius: 'sm',
        shadow: 'sm',
        withBorder: true,
      },
      styles: {
        root: {
          borderWidth: '1.5px',
        },
      },
    },
    NavLink: {
      styles: {
        root: {
          borderRadius: 'var(--mantine-radius-sm)',
          transition: 'background-color 0.2s ease',
        },
      },
    },
    Modal: {
      defaultProps: {
        radius: 'sm',
      },
    },
    Select: {
      defaultProps: {
        radius: 'sm',
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'sm',
      },
    },
    NumberInput: {
      defaultProps: {
        radius: 'sm',
      },
    },
    Textarea: {
      defaultProps: {
        radius: 'sm',
      },
    },
    Badge: {
      defaultProps: {
        radius: 'sm',
      },
    },
  },

  other: {
    sidebarWidth: 240,
  },
})
