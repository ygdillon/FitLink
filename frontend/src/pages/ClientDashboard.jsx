import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import './ClientDashboard.css'

function ClientDashboard() {
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const sessionsRes = await api.get('/schedule/client/upcoming').catch(() => ({ data: [] }))
      setUpcomingSessions(sessionsRes.data || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="client-dashboard-container">Loading...</div>
  }

  return (
    <div className="client-dashboard-container">
      <div className="client-dashboard-header">
        <h1>My Space</h1>
      </div>

      <div className="client-dashboard-layout">
        <div className="client-dashboard-panel schedule-panel">
          <div className="panel-header">
            <h2>Upcoming Sessions</h2>
          </div>
          {upcomingSessions.length === 0 ? (
            <div className="empty-state">
              <p>No upcoming sessions scheduled</p>
              <p className="empty-hint">Your trainer will schedule sessions for you</p>
            </div>
          ) : (
            <div className="sessions-list">
              {upcomingSessions.slice(0, 10).map(session => (
                <div key={session.id} className="session-item">
                  <div className="session-date">
                    <div className="session-day">{new Date(session.session_date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div className="session-number">{new Date(session.session_date).getDate()}</div>
                  </div>
                  <div className="session-details">
                    <div className="session-time">
                      {new Date(`2000-01-01T${session.session_time}`).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit' 
                      })}
                    </div>
                    {session.workout_name && (
                      <div className="session-workout">{session.workout_name}</div>
                    )}
                    {session.session_type && (
                      <div className="session-type">{session.session_type}</div>
                    )}
                  </div>
                  <div className="session-status">
                    <span className={`status-badge ${session.status || 'scheduled'}`}>
                      {session.status || 'scheduled'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ClientDashboard

