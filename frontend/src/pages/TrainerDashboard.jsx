import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import './Dashboard.css'

function TrainerDashboard() {
  const [clients, setClients] = useState([])
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)

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
        <Link to="/workout/builder" className="btn-primary">
          Create New Workout
        </Link>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h2>My Clients ({clients.length})</h2>
          {clients.length === 0 ? (
            <p>No clients yet</p>
          ) : (
            <ul className="client-list">
              {clients.map(client => (
                <li key={client.id}>
                  <div>
                    <strong>{client.name}</strong>
                    <span className="client-status">{client.status}</span>
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

