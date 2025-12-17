import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import './ClientWorkouts.css'

function ClientWorkouts() {
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWorkouts()
  }, [])

  const fetchWorkouts = async () => {
    try {
      const response = await api.get('/client/workouts')
      setWorkouts(response.data)
    } catch (error) {
      console.error('Error fetching workouts:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="client-workouts-container">Loading...</div>
  }

  return (
    <div className="client-workouts-container">
      <div className="workouts-header">
        <h1>My Workouts</h1>
      </div>

      {workouts.length === 0 ? (
        <div className="empty-state">
          <p>No workouts assigned yet</p>
          <p className="empty-hint">Your trainer will assign workouts for you</p>
        </div>
      ) : (
        <div className="workouts-grid">
          {workouts.map(workout => (
            <div key={workout.id} className="workout-card">
              <div className="workout-header">
                <h3>{workout.name}</h3>
                <span className={`workout-status ${workout.status || 'assigned'}`}>
                  {workout.status || 'assigned'}
                </span>
              </div>
              {workout.description && (
                <p className="workout-description">{workout.description}</p>
              )}
              <div className="workout-meta">
                {workout.assigned_date && (
                  <div className="workout-date">
                    Assigned: {new Date(workout.assigned_date).toLocaleDateString()}
                  </div>
                )}
                {workout.due_date && (
                  <div className="workout-date">
                    Due: {new Date(workout.due_date).toLocaleDateString()}
                  </div>
                )}
              </div>
              <Link to={`/workout/${workout.id}`} className="view-workout-btn">
                View Workout →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ClientWorkouts
