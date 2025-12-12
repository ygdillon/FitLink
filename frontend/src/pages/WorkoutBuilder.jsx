import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import './WorkoutBuilder.css'

function WorkoutBuilder() {
  const [workoutName, setWorkoutName] = useState('')
  const [description, setDescription] = useState('')
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const addExercise = () => {
    setExercises([...exercises, {
      name: '',
      sets: '',
      reps: '',
      weight: '',
      rest: '',
      notes: ''
    }])
  }

  const updateExercise = (index, field, value) => {
    const updated = [...exercises]
    updated[index][field] = value
    setExercises(updated)
  }

  const removeExercise = (index) => {
    setExercises(exercises.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await api.post('/trainer/workouts', {
        name: workoutName,
        description,
        exercises: exercises.filter(ex => ex.name.trim() !== '')
      })
      navigate('/trainer')
    } catch (error) {
      console.error('Error creating workout:', error)
      alert('Failed to create workout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="workout-builder-container">
      <div className="workout-builder-card">
        <h1>Create Workout</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Workout Name</label>
            <input
              type="text"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
            />
          </div>

          <div className="exercises-section">
            <div className="exercises-header">
              <h2>Exercises</h2>
              <button type="button" onClick={addExercise} className="btn-add">
                + Add Exercise
              </button>
            </div>

            {exercises.map((exercise, index) => (
              <div key={index} className="exercise-card">
                <button
                  type="button"
                  onClick={() => removeExercise(index)}
                  className="btn-remove"
                >
                  ×
                </button>
                <div className="exercise-form">
                  <input
                    type="text"
                    placeholder="Exercise name"
                    value={exercise.name}
                    onChange={(e) => updateExercise(index, 'name', e.target.value)}
                    required
                  />
                  <div className="exercise-details">
                    <input
                      type="number"
                      placeholder="Sets"
                      value={exercise.sets}
                      onChange={(e) => updateExercise(index, 'sets', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Reps"
                      value={exercise.reps}
                      onChange={(e) => updateExercise(index, 'reps', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Weight (optional)"
                      value={exercise.weight}
                      onChange={(e) => updateExercise(index, 'weight', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Rest (optional)"
                      value={exercise.rest}
                      onChange={(e) => updateExercise(index, 'rest', e.target.value)}
                    />
                  </div>
                  <textarea
                    placeholder="Notes (optional)"
                    value={exercise.notes}
                    onChange={(e) => updateExercise(index, 'notes', e.target.value)}
                    rows="2"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading || exercises.length === 0}>
              {loading ? 'Creating...' : 'Create Workout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default WorkoutBuilder

