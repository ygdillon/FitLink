import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import './Dashboard.css'
import './TrainerDashboard.css'

function TrainerDashboard() {
  const [clients, setClients] = useState([])
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [clientsRes, workoutsRes] = await Promise.all([
        api.get('/trainer/clients'),
        api.get('/trainer/workouts')
      ])
      setClients(clientsRes.data)
      setWorkouts(workoutsRes.data)
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
      <div className="dashboard-header">
        <h1>Trainer Dashboard</h1>
        <div className="header-actions">
          <Link to="/trainer/clients" className="btn-primary">
            View All Clients
          </Link>
          <Link to="/workout/builder" className="btn-secondary">
            Create Workout
          </Link>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card clients-overview">
          <div className="card-header">
            <h2>My Clients ({clients.length})</h2>
            <Link to="/trainer/clients" className="view-all-link">View All →</Link>
          </div>
          {clients.length === 0 ? (
            <div className="empty-clients">
              <p>No clients yet</p>
              <Link to="/trainer/add-client" className="btn-primary-small">
                Add Your First Client
              </Link>
            </div>
          ) : (
            <div className="clients-preview">
              {clients.slice(0, 5).map(client => (
                <div 
                  key={client.id} 
                  className="client-preview-item"
                  onClick={() => navigate(`/trainer/clients/${client.id}`)}
                >
                  <div className="preview-avatar">
                    {client.name?.charAt(0).toUpperCase() || 'C'}
                  </div>
                  <div className="preview-info">
                    <strong>{client.name}</strong>
                    <div className="preview-meta">
                      <span className="client-status-small">{client.status || 'active'}</span>
                      {client.checked_in_today > 0 && <span className="badge-checkin-small">✓ Today</span>}
                    </div>
                  </div>
                </div>
              ))}
              {clients.length > 5 && (
                <Link to="/trainer/clients" className="view-more-link">
                  View {clients.length - 5} more clients →
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="dashboard-card">
          <h2>Recent Workouts ({workouts.length})</h2>
          {workouts.length === 0 ? (
            <p>No workouts created yet</p>
          ) : (
            <ul className="workout-list">
              {workouts.slice(0, 5).map(workout => (
                <li key={workout.id}>
                  <Link to={`/workout/${workout.id}`}>
                    {workout.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default TrainerDashboard

