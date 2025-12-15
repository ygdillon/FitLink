import { useState, useEffect } from 'react'
import api from '../services/api'
import './ClientWorkouts.css'

function ClientWorkouts({ clientId, clientName }) {
  const [assignedWorkouts, setAssignedWorkouts] = useState([])
  const [allWorkouts, setAllWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    category: '',
    isTemplate: false,
    exercises: []
  })
  const [assignForm, setAssignForm] = useState({
    assignedDate: '',
    dueDate: '',
    notes: ''
  })

  useEffect(() => {
    fetchData()
  }, [clientId])

  const fetchData = async () => {
    try {
      const [assignedRes, workoutsRes] = await Promise.all([
        api.get(`/trainer/clients/${clientId}/workouts`),
        api.get('/trainer/workouts')
      ])
      setAssignedWorkouts(assignedRes.data || [])
      setAllWorkouts(workoutsRes.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const addExercise = () => {
    setCreateForm({
      ...createForm,
      exercises: [...createForm.exercises, {
        name: '',
        sets: '',
        reps: '',
        weight: '',
        rest: '',
        notes: ''
      }]
    })
  }

  const updateExercise = (index, field, value) => {
    const updated = [...createForm.exercises]
    updated[index][field] = value
    setCreateForm({ ...createForm, exercises: updated })
  }

  const removeExercise = (index) => {
    setCreateForm({
      ...createForm,
      exercises: createForm.exercises.filter((_, i) => i !== index)
    })
  }

  const handleCreateWorkout = async (e) => {
    e.preventDefault()
    try {
      const response = await api.post('/trainer/workouts', {
        name: createForm.name,
        description: createForm.description,
        category: createForm.category,
        is_template: createForm.isTemplate,
        exercises: createForm.exercises.filter(ex => ex.name.trim() !== '')
      })

      // Auto-assign to this client
      const today = new Date().toISOString().split('T')[0]
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      await api.post(`/trainer/workouts/${response.data.workoutId}/assign`, {
        clientId: parseInt(clientId),
        assignedDate: today,
        dueDate: nextWeek
      })

      alert('Workout created and assigned successfully!')
      setShowCreateModal(false)
      setCreateForm({
        name: '',
        description: '',
        category: '',
        isTemplate: false,
        exercises: []
      })
      fetchData()
    } catch (error) {
      console.error('Error creating workout:', error)
      alert('Failed to create workout')
    }
  }

  const openAssignModal = (workout) => {
    setSelectedWorkout(workout)
    setShowAssignModal(true)
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    setAssignForm({
      assignedDate: today,
      dueDate: nextWeek,
      notes: ''
    })
  }

  const handleAssignWorkout = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/trainer/workouts/${selectedWorkout.id}/assign`, {
        clientId: parseInt(clientId),
        assignedDate: assignForm.assignedDate,
        dueDate: assignForm.dueDate || null,
        notes: assignForm.notes || null
      })
      alert('Workout assigned successfully!')
      setShowAssignModal(false)
      setSelectedWorkout(null)
      fetchData()
    } catch (error) {
      console.error('Error assigning workout:', error)
      alert('Failed to assign workout')
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="client-workouts-container">
      <div className="workouts-header">
        <h2>Workouts for {clientName}</h2>
        <div className="header-actions">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            + Create New Workout
          </button>
          <button 
            onClick={() => setShowAssignModal(true)}
            className="btn-secondary"
          >
            Assign Existing Workout
          </button>
        </div>
      </div>

      <div className="workouts-section">
        <h3>Assigned Workouts ({assignedWorkouts.length})</h3>
        {assignedWorkouts.length === 0 ? (
          <div className="empty-state">
            <p>No workouts assigned yet. Create a new workout or assign an existing one.</p>
          </div>
        ) : (
          <div className="workouts-grid">
            {assignedWorkouts.map(workout => (
              <div key={workout.id} className="workout-assignment-card">
                <div className="workout-card-header">
                  <h4>{workout.workout_name || workout.name}</h4>
                  <span className={`status-badge ${workout.status}`}>
                    {workout.status}
                  </span>
                </div>
                <div className="workout-meta">
                  <span>Assigned: {new Date(workout.assigned_date).toLocaleDateString()}</span>
                  {workout.due_date && (
                    <span>Due: {new Date(workout.due_date).toLocaleDateString()}</span>
                  )}
                </div>
                {workout.description && (
                  <p className="workout-description">{workout.description}</p>
                )}
                <div className="workout-actions">
                  <button className="btn-view">View Details</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Workout Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Workout for {clientName}</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateWorkout}>
              <div className="form-group">
                <label>Workout Name *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                >
                  <option value="">Select category...</option>
                  <option value="strength">Strength</option>
                  <option value="cardio">Cardio</option>
                  <option value="hiit">HIIT</option>
                  <option value="flexibility">Flexibility</option>
                  <option value="full-body">Full Body</option>
                  <option value="upper-body">Upper Body</option>
                  <option value="lower-body">Lower Body</option>
                  <option value="core">Core</option>
                </select>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={createForm.isTemplate}
                    onChange={(e) => setCreateForm({ ...createForm, isTemplate: e.target.checked })}
                  />
                  Save as Template
                </label>
              </div>

              <div className="exercises-section">
                <div className="exercises-header">
                  <h3>Exercises</h3>
                  <button type="button" onClick={addExercise} className="btn-add">+ Add Exercise</button>
                </div>
                {createForm.exercises.map((exercise, index) => (
                  <div key={index} className="exercise-card">
                    <button
                      type="button"
                      onClick={() => removeExercise(index)}
                      className="btn-remove"
                    >×</button>
                    <input
                      type="text"
                      placeholder="Exercise name *"
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
                        placeholder="Weight"
                        value={exercise.weight}
                        onChange={(e) => updateExercise(index, 'weight', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Rest"
                        value={exercise.rest}
                        onChange={(e) => updateExercise(index, 'rest', e.target.value)}
                      />
                    </div>
                    <textarea
                      placeholder="Notes"
                      value={exercise.notes}
                      onChange={(e) => updateExercise(index, 'notes', e.target.value)}
                      rows="2"
                    />
                  </div>
                ))}
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" disabled={createForm.exercises.length === 0} className="btn-primary">
                  Create & Assign Workout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Existing Workout Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Workout to {clientName}</h2>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}>×</button>
            </div>
            {!selectedWorkout ? (
              <div className="workout-selection">
                <h3>Select a workout to assign:</h3>
                <div className="workouts-list-select">
                  {allWorkouts.map(workout => (
                    <div
                      key={workout.id}
                      className="workout-select-item"
                      onClick={() => openAssignModal(workout)}
                    >
                      <h4>{workout.name}</h4>
                      {workout.description && <p>{workout.description}</p>}
                      {workout.category && <span className="category-badge">{workout.category}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleAssignWorkout}>
                <div className="form-group">
                  <label>Selected Workout</label>
                  <div className="selected-workout">
                    <strong>{selectedWorkout.name}</strong>
                    <button type="button" onClick={() => setSelectedWorkout(null)}>Change</button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Assigned Date *</label>
                  <input
                    type="date"
                    value={assignForm.assignedDate}
                    onChange={(e) => setAssignForm({ ...assignForm, assignedDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={assignForm.dueDate}
                    onChange={(e) => setAssignForm({ ...assignForm, dueDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={assignForm.notes}
                    onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                    rows="3"
                    placeholder="Add any special instructions..."
                  />
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => setShowAssignModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Assign Workout</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientWorkouts

