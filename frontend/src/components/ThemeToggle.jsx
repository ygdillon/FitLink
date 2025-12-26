import { ActionIcon, useMantineColorScheme } from '@mantine/core'

function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()

  return (
    <ActionIcon
      onClick={toggleColorScheme}
      variant="light"
      size="lg"
      radius="sm"
      aria-label="Toggle color scheme"
      style={{ fontSize: '1.2rem' }}
    >
      {colorScheme === 'dark' ? '☀️' : '🌙'}
    </ActionIcon>
  )
}

export default ThemeToggle
