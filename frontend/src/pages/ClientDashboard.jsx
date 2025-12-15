import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import './Dashboard.css'

function ClientDashboard() {
  const [assignedWorkouts, setAssignedWorkouts] = useState([])
  const [recentProgress, setRecentProgress] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [workoutsRes, progressRes] = await Promise.all([
        api.get('/client/workouts'),
        api.get('/client/progress/recent')
      ])
      setAssignedWorkouts(workoutsRes.data)
      setRecentProgress(progressRes.data)
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
        <h1>My Dashboard</h1>
        <div className="header-actions">
          <Link to="/check-in" className="btn-primary">
            Daily Check-in
          </Link>
          <Link to="/progress" className="btn-secondary">
            Track Progress
          </Link>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h2>Assigned Workouts ({assignedWorkouts.length})</h2>
          {assignedWorkouts.length === 0 ? (
            <p>No workouts assigned yet</p>
          ) : (
            <ul className="workout-list">
              {assignedWorkouts.map(workout => (
                <li key={workout.id}>
                  <Link to={`/workout/${workout.id}`}>
                    {workout.name}
                  </Link>
                  <span className="workout-status">{workout.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dashboard-card">
          <h2>Recent Progress</h2>
          {recentProgress.length === 0 ? (
            <p>No progress entries yet</p>
          ) : (
            <ul className="progress-list">
              {recentProgress.map(entry => (
                <li key={entry.id}>
                  <div>
                    <strong>{new Date(entry.date).toLocaleDateString()}</strong>
                    {entry.weight && <span>Weight: {entry.weight} lbs</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default ClientDashboard

