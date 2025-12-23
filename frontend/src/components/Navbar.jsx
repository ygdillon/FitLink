import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
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
  useMantineTheme,
  Collapse,
  Box
} from '@mantine/core'
import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'
import AlertsBadge from './AlertsBadge'
import MessagesBadge from './MessagesBadge'
import RequestsBadge from './RequestsBadge'
import './Navbar.css'

function Navbar({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useMantineTheme()
  const [mobileOpened, setMobileOpened] = useState(false)
  const [desktopOpened, setDesktopOpened] = useState(true)
  
  // State for collapsible sections
  const [openedSections, setOpenedSections] = useState({
    clients: false,
    workouts: false,
    payments: false,
    training: false,
    nutrition: false
  })

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
      <path d="M14.4 14.4 9.6 9.6" />
      <path d="M16 12h3a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3" />
      <path d="M8 12H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
      <path d="M16 20h3a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-3" />
      <path d="M8 20H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h3" />
    </svg>
  )

  const ChevronIcon = ({ opened }) => (
    <svg 
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      style={{ 
        transform: opened ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s ease'
      }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )

  // Auto-open sections based on current route
  useEffect(() => {
    const path = location.pathname
    if (user?.role === 'trainer') {
      if (path.startsWith('/trainer/clients')) {
        setOpenedSections(prev => ({ ...prev, clients: true }))
      }
      if (path.startsWith('/trainer/workouts')) {
        setOpenedSections(prev => ({ ...prev, workouts: true }))
      }
      if (path.startsWith('/payments')) {
        setOpenedSections(prev => ({ ...prev, payments: true }))
      }
    } else {
      if (path.startsWith('/client/workouts') || path.startsWith('/client/progress') || path.startsWith('/check-in')) {
        setOpenedSections(prev => ({ ...prev, training: true }))
      }
      if (path.startsWith('/client/nutrition')) {
        setOpenedSections(prev => ({ ...prev, nutrition: true }))
      }
    }
  }, [location.pathname, user?.role])

  const toggleSection = (section) => {
    setOpenedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Helper function to check if a route with query params is active
  const isRouteActive = (pathname, search) => {
    return location.pathname === pathname && location.search === search
  }

  // Helper component for sub-navigation items with exact query param matching
  const SubNavLink = ({ to, label, activeSearch, defaultActive = false }) => {
    const pathname = to.split('?')[0]
    const isActive = isRouteActive(pathname, activeSearch) || 
                     (defaultActive && location.pathname === pathname && !location.search)
    
    return (
      <UnstyledButton
        component={Link}
        to={to}
        className={`nav-link-sub ${isActive ? 'nav-link-sub-active' : ''}`}
        style={{ 
          padding: '0.375rem 0.5rem', 
          fontSize: '0.875rem',
          width: '100%',
          textAlign: 'left',
          borderRadius: 'var(--mantine-radius-sm)',
          transition: 'background-color 0.2s ease',
          color: 'inherit'
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = theme.colorScheme === 'dark' 
              ? 'var(--mantine-color-dark-5)' 
              : 'var(--mantine-color-gray-1)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'transparent'
          }
        }}
      >
        <Text size="sm">{label}</Text>
      </UnstyledButton>
    )
  }

  // Trainer navigation structure with collapsible sections
  const renderTrainerNav = () => {
    return (
      <Stack gap={2}>
        {/* Dashboard - standalone */}
        <MantineNavLink
          component={NavLink}
          to="/trainer"
          label="Dashboard"
          leftSection={<HomeIcon />}
          end
          className="nav-link"
          style={{ padding: '0.5rem 0.75rem' }}
        />

        {/* Clients - standalone */}
        <MantineNavLink
          component={NavLink}
          to="/trainer/clients"
          label="Clients"
          leftSection={<PeopleIcon />}
          className="nav-link"
          style={{ padding: '0.5rem 0.75rem' }}
        />

        {/* Workouts - collapsible */}
        <Box>
          <UnstyledButton
            onClick={() => toggleSection('workouts')}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--mantine-radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'background-color 0.2s ease',
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
            <WorkoutIcon />
            <Text size="sm" style={{ flex: 1, textAlign: 'left' }}>Workouts</Text>
            <ChevronIcon opened={openedSections.workouts} />
          </UnstyledButton>
          <Collapse in={openedSections.workouts} transitionDuration={200}>
            <Box pl="xl" pt={2} pb={2}>
              <Stack gap={2}>
                <SubNavLink 
                  to="/trainer/workouts?tab=create" 
                  label="Create Workouts" 
                  activeSearch="?tab=create" 
                />
                <SubNavLink 
                  to="/trainer/workouts?tab=manage" 
                  label="Manage Workouts" 
                  activeSearch="?tab=manage"
                  defaultActive={true}
                />
              </Stack>
            </Box>
          </Collapse>
        </Box>

        {/* Requests - standalone with badge */}
        {user.role === 'trainer' ? (
          <RequestsBadge />
        ) : (
          <MantineNavLink
            component={NavLink}
            to="/trainer/requests"
            label="Requests"
            leftSection={<RequestIcon />}
            className="nav-link"
            style={{ padding: '0.5rem 0.75rem' }}
          />
        )}

        {/* Analytics - standalone */}
        <MantineNavLink
          component={NavLink}
          to="/trainer/analytics"
          label="Analytics"
          leftSection={<AnalyticsIcon />}
          className="nav-link"
          style={{ padding: '0.5rem 0.75rem' }}
        />

        {/* Payments - collapsible */}
        <Box>
          <UnstyledButton
            onClick={() => toggleSection('payments')}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--mantine-radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'background-color 0.2s ease',
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
            <DollarIcon />
            <Text size="sm" style={{ flex: 1, textAlign: 'left' }}>Payments</Text>
            <ChevronIcon opened={openedSections.payments} />
          </UnstyledButton>
          <Collapse in={openedSections.payments} transitionDuration={200}>
            <Box pl="xl" pt={2} pb={2}>
              <Stack gap={2}>
                <SubNavLink 
                  to="/payments?tab=history" 
                  label="Payment History" 
                  activeSearch="?tab=history" 
                />
                <SubNavLink 
                  to="/payments?tab=setup" 
                  label="Setup" 
                  activeSearch="?tab=setup" 
                />
                <SubNavLink 
                  to="/payments?tab=manage" 
                  label="Manage Payments" 
                  activeSearch="?tab=manage" 
                />
              </Stack>
            </Box>
          </Collapse>
        </Box>
      </Stack>
    )
  }

  // Client navigation structure with collapsible sections
  const renderClientNav = () => {
    return (
      <Stack gap={2}>
        {/* Dashboard - standalone */}
        <MantineNavLink
          component={NavLink}
          to="/client"
          label="Dashboard"
          leftSection={<HomeIcon />}
          end
          className="nav-link"
          style={{ padding: '0.5rem 0.75rem' }}
        />

        {/* Training - collapsible */}
        <Box>
          <UnstyledButton
            onClick={() => toggleSection('training')}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--mantine-radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'background-color 0.2s ease',
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
            <WorkoutIcon />
            <Text size="sm" style={{ flex: 1, textAlign: 'left' }}>Training</Text>
            <ChevronIcon opened={openedSections.training} />
          </UnstyledButton>
          <Collapse in={openedSections.training} transitionDuration={200}>
            <Box pl="xl" pt={2} pb={2}>
              <Stack gap={2}>
                <MantineNavLink
                  component={NavLink}
                  to="/client/workouts"
                  label="Workouts"
                  className="nav-link-sub"
                  style={{ padding: '0.375rem 0.5rem', fontSize: '0.875rem' }}
                />
                <MantineNavLink
                  component={NavLink}
                  to="/client/progress"
                  label="Progress"
                  className="nav-link-sub"
                  style={{ padding: '0.375rem 0.5rem', fontSize: '0.875rem' }}
                />
                <MantineNavLink
                  component={NavLink}
                  to="/check-in"
                  label="Check-in"
                  className="nav-link-sub"
                  style={{ padding: '0.375rem 0.5rem', fontSize: '0.875rem' }}
                />
              </Stack>
            </Box>
          </Collapse>
        </Box>

        {/* Nutrition - collapsible */}
        <Box>
          <UnstyledButton
            onClick={() => toggleSection('nutrition')}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--mantine-radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'background-color 0.2s ease',
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
            <Text size="sm" style={{ flex: 1, textAlign: 'left' }}>Nutrition</Text>
            <ChevronIcon opened={openedSections.nutrition} />
          </UnstyledButton>
          <Collapse in={openedSections.nutrition} transitionDuration={200}>
            <Box pl="xl" pt={2} pb={2}>
              <Stack gap={2}>
                <MantineNavLink
                  component={NavLink}
                  to="/client/nutrition"
                  label="Nutrition Plan"
                  className="nav-link-sub"
                  style={{ padding: '0.375rem 0.5rem', fontSize: '0.875rem' }}
                />
              </Stack>
            </Box>
          </Collapse>
        </Box>
      </Stack>
    )
  }

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
              Trainr
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
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm" style={{ display: 'flex', flexDirection: 'column' }}>
        <Stack gap={2} style={{ flex: 1 }}>
          {user.role === 'trainer' ? renderTrainerNav() : renderClientNav()}
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
