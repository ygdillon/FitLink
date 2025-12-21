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
    { label: 'My Space', to: '/trainer' },
    { label: 'Clients', to: '/trainer/clients' },
    { label: 'Requests', to: '/trainer/requests' },
    { label: 'Analytics', to: '/trainer/analytics' },
    { label: 'Payments', to: '/payments' },
  ]

  // Client navigation items
  const clientNavItems = [
    { label: 'My Space', to: '/client' },
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
            <Button
              component={NavLink}
              to="/profile"
              variant="subtle"
              size="sm"
              style={{ padding: '0.375rem 0.75rem' }}
            >
              Profile
            </Button>
            <MessagesBadge />
            {user?.role === 'trainer' && <AlertsBadge />}
            <Button
              component={NavLink}
              to="/settings"
              variant="subtle"
              size="sm"
              style={{ padding: '0.375rem 0.75rem' }}
            >
              Settings
            </Button>
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
