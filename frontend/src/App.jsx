import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { MantineProvider, ColorSchemeScript } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/AuthContext'
import { theme } from './theme'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import TrainerDashboard from './pages/TrainerDashboard'
import ClientDashboard from './pages/ClientDashboard'
import WorkoutBuilder from './pages/WorkoutBuilder'
import WorkoutView from './pages/WorkoutView'
import ProgressTracking from './pages/ProgressTracking'
import Messages from './pages/Messages'
import Profile from './pages/Profile'
import Payments from './pages/Payments'
import AddClient from './pages/AddClient'
import ClientProfile from './pages/ClientProfile'
import ClientProgress from './pages/ClientProgress'
import DailyCheckIn from './pages/DailyCheckIn'
import Clients from './pages/Clients'
import WorkoutLibrary from './pages/WorkoutLibrary'
import ClientWorkouts from './pages/ClientWorkouts'
import ClientNutrition from './pages/ClientNutrition'
import Settings from './pages/Settings'
import TrainerRequests from './pages/TrainerRequests'
import ClientOnboarding from './pages/ClientOnboarding'

// Components
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import ClientRouteGuard from './components/ClientRouteGuard'
import ErrorBoundary from './components/ErrorBoundary'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to={user.role === 'trainer' ? '/trainer' : '/client'} />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to={user.role === 'trainer' ? '/trainer' : '/client'} />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/trainer" element={<TrainerDashboard />} />
        <Route path="/trainer/clients/:clientId" element={<Clients />} />
        <Route path="/trainer/clients" element={<Clients />} />
        <Route path="/trainer/requests" element={<TrainerRequests />} />
        
        <Route element={<ClientRouteGuard />}>
          <Route path="/client/onboarding" element={<ClientOnboarding />} />
          <Route path="/client" element={<ClientDashboard />} />
          <Route path="/client/workouts" element={<ClientWorkouts />} />
          <Route path="/client/progress" element={<ProgressTracking />} />
          <Route path="/client/nutrition" element={<ClientNutrition />} />
        </Route>
        
        <Route path="/settings" element={<Settings />} />
        <Route path="/workout/builder" element={<WorkoutBuilder />} />
        <Route path="/trainer/workouts" element={<WorkoutLibrary />} />
        <Route path="/workout/:id" element={<WorkoutView />} />
        <Route path="/progress" element={<ProgressTracking />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/trainer/add-client" element={<AddClient />} />
        <Route path="/trainer/clients/:clientId/progress" element={<ClientProgress />} />
        <Route path="/check-in" element={<DailyCheckIn />} />
        <Route path="/" element={<Navigate to={user?.role === 'trainer' ? '/trainer' : '/client'} />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <MantineProvider theme={theme} defaultColorScheme="light">
        <Notifications position="top-right" />
        <AuthProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppWithNavbar />
          </Router>
        </AuthProvider>
      </MantineProvider>
    </ErrorBoundary>
  )
}

function AppWithNavbar() {
  const { user } = useAuth()
  
  if (!user) {
    return <AppRoutes />
  }
  
  return (
    <Navbar>
      <AppRoutes />
    </Navbar>
  )
}

export default App
