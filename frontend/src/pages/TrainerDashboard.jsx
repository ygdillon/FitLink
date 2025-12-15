import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import './Dashboard.css'
import './TrainerDashboard.css'

function TrainerDashboard() {
  const [clients, setClients] = useState([])
  const [revenue, setRevenue] = useState({ total: 0, thisMonth: 0, thisWeek: 0 })
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [clientsRes, revenueRes, sessionsRes] = await Promise.all([
        api.get('/trainer/clients'),
        api.get('/payments/trainer/history').catch(() => ({ data: [] })),
        api.get('/trainer/sessions/upcoming').catch(() => ({ data: [] }))
      ])
      setClients(clientsRes.data)
      
      // Calculate revenue
      if (revenueRes.data && revenueRes.data.length > 0) {
        const now = new Date()
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        
        const total = revenueRes.data
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
        
        const monthRevenue = revenueRes.data
          .filter(p => p.status === 'completed' && new Date(p.completed_at || p.created_at) >= thisMonth)
          .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
        
        const weekRevenue = revenueRes.data
          .filter(p => p.status === 'completed' && new Date(p.completed_at || p.created_at) >= thisWeek)
          .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
        
        setRevenue({ total, thisMonth: monthRevenue, thisWeek: weekRevenue })
      }
      
      setUpcomingSessions(sessionsRes.data || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="dashboard-container">Loading...</div>
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-layout">
        {/* Left Panel - Total Revenue (1/3 width, full height) */}
        <div className="dashboard-panel revenue-panel">
          <h2>Total Revenue</h2>
          <div className="revenue-display">
            <div className="revenue-amount">
              ${revenue.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="revenue-breakdown">
              <div className="revenue-item">
                <span className="revenue-label">This Month</span>
                <span className="revenue-value">${revenue.thisMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="revenue-item">
                <span className="revenue-label">This Week</span>
                <span className="revenue-value">${revenue.thisWeek.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            <Link to="/payments" className="revenue-link">
              View Payment Details →
            </Link>
          </div>
        </div>

        {/* Right Panels (2/3 width) */}
        <div className="dashboard-right-panels">
          {/* Upper Right Panel - Schedule with Upcoming Sessions (2/3 height) */}
          <div className="dashboard-panel schedule-panel">
            <div className="panel-header">
              <h2>Schedule with Upcoming Sessions</h2>
              <Link to="/trainer/clients" className="view-all-link">View All →</Link>
            </div>
            {upcomingSessions.length === 0 ? (
              <div className="empty-state">
                <p>No upcoming sessions scheduled</p>
                <p className="empty-hint">Schedule sessions from client profiles</p>
              </div>
            ) : (
              <div className="sessions-list">
                {upcomingSessions.slice(0, 5).map(session => (
                  <div key={session.id} className="session-item">
                    <div className="session-date">
                      <div className="session-day">{new Date(session.date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div className="session-number">{new Date(session.date).getDate()}</div>
                    </div>
                    <div className="session-details">
                      <div className="session-client">{session.client_name}</div>
                      <div className="session-time">{session.time || 'Time TBD'}</div>
                      {session.workout_name && (
                        <div className="session-workout">{session.workout_name}</div>
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

          {/* Lower Right Panel - Clients (1/3 height) */}
          <div className="dashboard-panel clients-panel">
            <div className="panel-header">
              <h2>Clients</h2>
              <Link to="/trainer/clients" className="view-all-link">View All →</Link>
            </div>
            {clients.length === 0 ? (
              <div className="empty-state">
                <p>No clients yet</p>
                <Link to="/trainer/add-client" className="btn-primary-small">
                  Add Your First Client
                </Link>
              </div>
            ) : (
              <div className="clients-list-compact">
                {clients.map(client => {
                  // Get next session date (mock for now - would come from schedule data)
                  const nextSession = upcomingSessions.find(s => s.client_id === client.user_id || s.client_id === client.id)
                  return (
                    <div 
                      key={client.id} 
                      className="client-item-compact"
                      onClick={() => navigate(`/trainer/clients/${client.id}`)}
                    >
                      <div className="client-info-compact">
                        <div className="client-avatar-small">
                          {client.name?.charAt(0).toUpperCase() || 'C'}
                        </div>
                        <div className="client-details-compact">
                          <div className="client-name-compact">{client.name}</div>
                          {nextSession ? (
                            <div className="client-session-date">
                              Next: {new Date(nextSession.date).toLocaleDateString()}
                            </div>
                          ) : (
                            <div className="client-session-date">No session scheduled</div>
                          )}
                        </div>
                      </div>
                      <span className={`status-badge-small ${client.status || 'active'}`}>
                        {client.status || 'active'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrainerDashboard

