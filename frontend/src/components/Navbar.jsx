import { Link, NavLink, useNavigate } from 'react-router-dom'
import { 
  AppShell, 
  Group, 
  Text, 
  UnstyledButton, 
  Stack, 
  NavLink as MantineNavLink,
  Button,
  Burger,
  Avatar,
  useMantineTheme
} from '@mantine/core'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'
import AlertsBadge from './AlertsBadge'
import MessagesBadge from './MessagesBadge'
import './Navbar.css'

function Navbar({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const theme = useMantineTheme()
  const [mobileOpened, setMobileOpened] = useState(false)
  const [desktopOpened, setDesktopOpened] = useState(true)

  if (!user) {
    return children
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Trainer navigation items
  const trainerNavItems = [
    { label: 'Dashboard', to: '/trainer' },
    { label: 'Clients', to: '/trainer/clients' },
    { label: 'Requests', to: '/trainer/requests' },
    { label: 'Analytics', to: '/trainer/analytics' },
    { label: 'Payments', to: '/payments' },
  ]

  // Client navigation items
  const clientNavItems = [
    { label: 'Dashboard', to: '/client' },
    { label: 'Workouts', to: '/client/workouts' },
    { label: 'Progress', to: '/client/progress' },
    { label: 'Nutrition', to: '/client/nutrition' },
    { label: 'Check-in', to: '/check-in' },
  ]

  const navItems = user.role === 'trainer' ? trainerNavItems : clientNavItems

  return (
    <AppShell
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      header={{ height: 60 }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="md">
            <Burger
              opened={mobileOpened}
              onClick={() => setMobileOpened(!mobileOpened)}
              hiddenFrom="sm"
              size="sm"
            />
            <Text
              component={Link}
              to="/"
              fw={700}
              size="xl"
              c="robinhoodGreen"
              style={{ textDecoration: 'none' }}
            >
              FitLink
            </Text>
            <UnstyledButton
              component={Link}
              to="/profile"
              visibleFrom="sm"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <Group gap="xs">
                <Avatar color="robinhoodGreen" radius="xl" size="sm">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
                <Stack gap={0} style={{ lineHeight: 1.2 }}>
                  <Text size="sm" fw={500}>
                    {user.name || 'User'}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={1} style={{ maxWidth: '200px' }}>
                    {user.email}
                  </Text>
                </Stack>
              </Group>
            </UnstyledButton>
          </Group>
          
          <Group gap="xs">
            <MessagesBadge />
            {user?.role === 'trainer' && <AlertsBadge />}
            <UnstyledButton
              component={NavLink}
              to="/settings"
              style={{ 
                position: 'relative',
                padding: '0.375rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--mantine-radius-sm)',
                transition: 'background-color 0.2s ease',
                textDecoration: 'none',
                color: 'inherit'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colorScheme === 'dark' 
                  ? 'var(--mantine-color-dark-5)' 
                  : 'var(--mantine-color-gray-1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              {/* Settings/Gear Icon SVG */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: 'block', flexShrink: 0 }}
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
              </svg>
            </UnstyledButton>
            <Button
              variant="subtle"
              size="sm"
              color="red"
              onClick={handleLogout}
              style={{ padding: '0.375rem 0.75rem' }}
            >
              Logout
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap={4}>
          {navItems.map((item) => {
            // Use exact matching for base routes to prevent highlighting on sub-routes
            const isExactRoute = item.to === '/client' || item.to === '/trainer'
            return (
              <MantineNavLink
                key={item.to}
                component={NavLink}
                to={item.to}
                label={item.label}
                end={isExactRoute}
                className="nav-link"
              />
            )
          })}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  )
}

export default Navbar
