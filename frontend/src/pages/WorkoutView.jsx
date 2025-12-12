import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../services/api'
import './WorkoutView.css'

function WorkoutView() {
  const { id } = useParams()
  const [workout, setWorkout] = useState(null)
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    fetchWorkout()
  }, [id])

  const fetchWorkout = async () => {
    try {
      const response = await api.get(`/workouts/${id}`)
      setWorkout(response.data)
    } catch (error) {
      console.error('Error fetching workout:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    try {
      await api.post(`/workouts/${id}/complete`)
      setCompleted(true)
    } catch (error) {
      console.error('Error completing workout:', error)
      alert('Failed to mark workout as complete')
    }
  }

  if (loading) {
    return <div className="workout-view-container">Loading...</div>
  }

  if (!workout) {
    return <div className="workout-view-container">Workout not found</div>
  }

  return (
    <div className="workout-view-container">
      <div className="workout-view-card">
        <h1>{workout.name}</h1>
        {workout.description && <p className="workout-description">{workout.description}</p>}

        <div className="exercises-list">
          <h2>Exercises</h2>
          {workout.exercises && workout.exercises.length > 0 ? (
            workout.exercises.map((exercise, index) => (
              <div key={index} className="exercise-item">
                <h3>{exercise.name}</h3>
                <div className="exercise-details">
                  {exercise.sets && <span>Sets: {exercise.sets}</span>}
                  {exercise.reps && <span>Reps: {exercise.reps}</span>}
                  {exercise.weight && <span>Weight: {exercise.weight}</span>}
                  {exercise.rest && <span>Rest: {exercise.rest}</span>}
                </div>
                {exercise.notes && <p className="exercise-notes">{exercise.notes}</p>}
              </div>
            ))
          ) : (
            <p>No exercises in this workout</p>
          )}
        </div>

        {!completed && (
          <button onClick={handleComplete} className="btn-complete">
            Mark as Complete
          </button>
        )}
        {completed && (
          <div className="completion-message">
            ✓ Workout completed!
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkoutView

