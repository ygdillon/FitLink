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

  // Icon components
  const HomeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )

  const PeopleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )

  const RequestIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  )

  const AnalyticsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )

  const DollarIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )

  const WorkoutIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5h11v11h-11z" />
      <path d="M6.5 6.5L12 12l5.5-5.5" />
      <path d="M6.5 17.5L12 12l5.5 5.5" />
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
    </svg>
  )

  // Trainer navigation items
  const trainerNavItems = [
    { label: 'Dashboard', to: '/trainer', icon: <HomeIcon /> },
    { label: 'Clients', to: '/trainer/clients', icon: <PeopleIcon /> },
    { label: 'Workouts', to: '/trainer/workouts', icon: <WorkoutIcon /> },
    { label: 'Requests', to: '/trainer/requests', icon: <RequestIcon /> },
    { label: 'Analytics', to: '/trainer/analytics', icon: <AnalyticsIcon /> },
    { label: 'Payments', to: '/payments', icon: <DollarIcon /> },
  ]

  // Client navigation items
  const clientNavItems = [
    { label: 'Dashboard', to: '/client', icon: <HomeIcon /> },
    { label: 'Workouts', to: '/client/workouts' },
    { label: 'Progress', to: '/client/progress' },
    { label: 'Nutrition', to: '/client/nutrition' },
    { label: 'Check-in', to: '/check-in' },
  ]

  const navItems = user.role === 'trainer' ? trainerNavItems : clientNavItems

  return (
    <AppShell
      navbar={{
        width: 220,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      header={{ height: 60 }}
      padding="sm"
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
              size="lg"
              c="robinhoodGreen"
              style={{ textDecoration: 'none' }}
            >
              FitLink
            </Text>
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

      <AppShell.Navbar p="sm" style={{ display: 'flex', flexDirection: 'column' }}>
        <Stack gap={2} style={{ flex: 1 }}>
          {navItems.map((item) => {
            // Use exact matching for base routes to prevent highlighting on sub-routes
            const isExactRoute = item.to === '/client' || item.to === '/trainer'
            return (
              <MantineNavLink
                key={item.to}
                component={NavLink}
                to={item.to}
                label={item.label}
                leftSection={item.icon}
                end={isExactRoute}
                className="nav-link"
                style={{ padding: '0.5rem 0.75rem' }}
              />
            )
          })}
        </Stack>
        
        {/* Profile indicator at bottom */}
        <UnstyledButton
          component={Link}
          to="/profile"
          style={{ 
            textDecoration: 'none', 
            color: 'inherit',
            padding: '0.75rem',
            borderRadius: 'var(--mantine-radius-sm)',
            marginTop: 'auto',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colorScheme === 'dark' 
              ? 'var(--mantine-color-dark-5)' 
              : 'rgba(255, 255, 255, 0.08)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <Group gap="xs">
            <Avatar color="robinhoodGreen" radius="xl" size="sm">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
            <Stack gap={0} style={{ lineHeight: 1.2, flex: 1, minWidth: 0 }}>
              <Text size="sm" fw={500} lineClamp={1} c="white">
                {user.name || 'User'}
              </Text>
              <Text size="xs" c="dimmed" lineClamp={1}>
                {user.email}
              </Text>
            </Stack>
          </Group>
        </UnstyledButton>
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  )
}

export default Navbar
