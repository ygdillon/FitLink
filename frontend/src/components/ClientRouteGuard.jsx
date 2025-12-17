import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

function ClientRouteGuard() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [onboardingCompleted, setOnboardingCompleted] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user || user.role !== 'client') {
        setChecking(false)
        return
      }

      // Skip check for onboarding page itself
      if (location.pathname === '/client/onboarding') {
        setOnboardingCompleted(true)
        setChecking(false)
        return
      }

      try {
        const response = await api.get('/client/profile/onboarding-status')
        setOnboardingCompleted(response.data.onboarding_completed)
      } catch (error) {
        console.error('Error checking onboarding:', error)
        // If error, assume not completed to be safe
        setOnboardingCompleted(false)
      } finally {
        setChecking(false)
      }
    }

    if (!loading) {
      checkOnboarding()
    }
  }, [user, loading, location.pathname])

  if (loading || checking) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  if (user.role !== 'client') {
    return <Navigate to={user.role === 'trainer' ? '/trainer' : '/'} />
  }

  // If onboarding not completed and not on onboarding page, redirect
  if (!onboardingCompleted && location.pathname !== '/client/onboarding') {
    return <Navigate to="/client/onboarding" />
  }

  // If on onboarding page but already completed, redirect to dashboard
  if (onboardingCompleted && location.pathname === '/client/onboarding') {
    return <Navigate to="/client" />
  }

  return <Outlet />
}

export default ClientRouteGuard

