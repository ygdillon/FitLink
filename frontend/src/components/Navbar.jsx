import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Stack, Button, Text, Divider, UnstyledButton, Group } from '@mantine/core'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from './ThemeToggle'
import './Navbar.css'

function Navbar() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return null
  }

  const NavButton = ({ to, label, children, end = false }) => {
    // For exact routes like /client or /trainer, use end prop to match exactly
    // For sub-routes like /client/workouts, allow matching deeper paths
    const isExactRoute = to === '/client' || to === '/trainer'
    return (
      <UnstyledButton
        component={NavLink}
        to={to}
        end={isExactRoute ? true : end}
        className="sidebar-link"
      >
        {label || children}
      </UnstyledButton>
    )
  }

  return (
    <nav className="navbar-sidebar">
      <Stack gap="md" p="md" h="100%">
        <Group justify="space-between" align="center">
          <Text
            component={Link}
            to="/"
            fw={700}
            size="xl"
            c="white"
            ta="center"
            style={{ textDecoration: 'none', flex: 1 }}
          >
            FitLink
          </Text>
          <ThemeToggle />
        </Group>

        <Stack gap={4} style={{ flex: 1 }}>
          {user.role === 'trainer' ? (
            <>
              <NavButton to="/trainer">My Space</NavButton>
              <NavButton to="/trainer/clients">Clients</NavButton>
              <NavButton to="/trainer/requests">Requests</NavButton>
              <NavButton to="/messages">Messages</NavButton>
              <NavButton to="/payments">Payments</NavButton>
              <NavButton to="/settings">Settings</NavButton>
            </>
          ) : (
            <>
              <NavButton to="/client">My Space</NavButton>
              <NavButton to="/client/workouts">Workouts</NavButton>
              <NavButton to="/client/progress">Progress</NavButton>
              <NavButton to="/client/nutrition">Nutrition</NavButton>
              <NavButton to="/check-in">Check-in</NavButton>
              <NavButton to="/messages">Messages</NavButton>
              <NavButton to="/settings">Settings</NavButton>
            </>
          )}
          <NavButton to="/profile">Profile</NavButton>
        </Stack>
      </Stack>
    </nav>
  )
}

export default Navbar

