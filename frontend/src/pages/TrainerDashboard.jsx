import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import './Dashboard.css'

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
          <Link to="/trainer/add-client" className="btn-primary">
            Add New Client
          </Link>
          <Link to="/workout/builder" className="btn-secondary">
            Create Workout
          </Link>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h2>My Clients ({clients.length})</h2>
          {clients.length === 0 ? (
            <p>No clients yet</p>
          ) : (
            <ul className="client-list">
              {clients.map(client => (
                <li key={client.id} onClick={() => navigate(`/trainer/clients/${client.id}`)} style={{ cursor: 'pointer' }}>
                  <div>
                    <strong>{client.name}</strong>
                    <div className="client-meta">
                      <span className="client-status">{client.status || 'active'}</span>
                      {client.onboarding_completed && <span className="badge-complete">✓ Onboarded</span>}
                      {client.checked_in_today > 0 && <span className="badge-checkin">✓ Checked in today</span>}
                    </div>
                    {client.primary_goal && (
                      <div className="client-goal">Goal: {client.primary_goal}</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
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

