import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/AuthContext'

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

// Components
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to={user.role === 'trainer' ? '/trainer' : '/client'} />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to={user.role === 'trainer' ? '/trainer' : '/client'} />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/trainer" element={<TrainerDashboard />} />
        <Route path="/client" element={<ClientDashboard />} />
        <Route path="/workout/builder" element={<WorkoutBuilder />} />
        <Route path="/workout/:id" element={<WorkoutView />} />
        <Route path="/progress" element={<ProgressTracking />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/" element={<Navigate to={user?.role === 'trainer' ? '/trainer' : '/client'} />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App

