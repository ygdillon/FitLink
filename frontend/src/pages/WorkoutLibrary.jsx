import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import './WorkoutLibrary.css'

function WorkoutLibrary() {
  const navigate = useNavigate()
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all') // all, templates, custom
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [clients, setClients] = useState([])
  const [assignForm, setAssignForm] = useState({
    clientId: '',
    assignedDate: '',
    dueDate: '',
    notes: ''
  })

  useEffect(() => {
    fetchWorkouts()
    fetchClients()
  }, [])

  const fetchWorkouts = async () => {
    try {
      const response = await api.get('/trainer/workouts')
      setWorkouts(response.data)
    } catch (error) {
      console.error('Error fetching workouts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const response = await api.get('/trainer/clients')
      setClients(response.data)
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const handleAssignWorkout = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/trainer/workouts/${selectedWorkout.id}/assign`, {
        clientId: assignForm.clientId,
        assignedDate: assignForm.assignedDate,
        dueDate: assignForm.dueDate,
        notes: assignForm.notes
      })
      alert('Workout assigned successfully!')
      setShowAssignModal(false)
      setAssignForm({ clientId: '', assignedDate: '', dueDate: '', notes: '' })
      setSelectedWorkout(null)
    } catch (error) {
      console.error('Error assigning workout:', error)
      alert('Failed to assign workout')
    }
  }

  const openAssignModal = (workout) => {
    setSelectedWorkout(workout)
    setShowAssignModal(true)
    // Set default dates
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    setAssignForm({
      ...assignForm,
      assignedDate: today,
      dueDate: nextWeek
    })
  }

  const filteredWorkouts = workouts.filter(workout => {
    const matchesSearch = workout.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workout.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || 
                       (filterType === 'templates' && workout.is_template) ||
                       (filterType === 'custom' && !workout.is_template)
    return matchesSearch && matchesType
  })

  if (loading) {
    return <div className="workout-library-container">Loading...</div>
  }

  return (
    <div className="workout-library-container">
      <div className="library-header">
        <h1>Workout Library</h1>
        <div className="header-actions">
          <button 
            onClick={() => navigate('/workout/builder')}
            className="btn-primary"
          >
            + Create New Workout
          </button>
        </div>
      </div>

      <div className="library-filters">
        <input
          type="text"
          placeholder="Search workouts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Workouts</option>
          <option value="templates">Templates</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {filteredWorkouts.length === 0 ? (
        <div className="empty-state">
          <p>No workouts found.</p>
          {workouts.length === 0 ? (
            <>
              <p>Get started by creating your first workout!</p>
              <button 
                onClick={() => navigate('/workout/builder')}
                className="btn-primary"
              >
                Create Workout
              </button>
            </>
          ) : (
            <p>Try adjusting your search or filter.</p>
          )}
        </div>
      ) : (
        <div className="workouts-grid">
          {filteredWorkouts.map(workout => (
            <div key={workout.id} className="workout-card">
              <div className="workout-card-header">
                <h3>{workout.name}</h3>
                {workout.is_template && (
                  <span className="template-badge">Template</span>
                )}
              </div>
              {workout.description && (
                <p className="workout-description">{workout.description}</p>
              )}
              <div className="workout-meta">
                <span>Created: {new Date(workout.created_at).toLocaleDateString()}</span>
                {workout.exercise_count > 0 && (
                  <span>{workout.exercise_count} exercises</span>
                )}
              </div>
              <div className="workout-card-actions">
                <button 
                  onClick={() => navigate(`/workout/${workout.id}`)}
                  className="btn-view"
                >
                  View
                </button>
                <button 
                  onClick={() => navigate(`/workout/builder?edit=${workout.id}`)}
                  className="btn-edit"
                >
                  Edit
                </button>
                <button 
                  onClick={() => openAssignModal(workout)}
                  className="btn-assign"
                >
                  Assign
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Workout Modal */}
      {showAssignModal && selectedWorkout && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Workout: {selectedWorkout.name}</h2>
              <button 
                className="modal-close"
                onClick={() => setShowAssignModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAssignWorkout}>
              <div className="form-group">
                <label>Select Client *</label>
                <select
                  value={assignForm.clientId}
                  onChange={(e) => setAssignForm({ ...assignForm, clientId: e.target.value })}
                  required
                >
                  <option value="">Choose a client...</option>
                  {clients.map(client => {
                    // The API returns clients with user_id from the join
                    const clientUserId = client.user_id || client.id
                    return (
                      <option key={client.id} value={clientUserId}>
                        {client.name || 'Client'} ({client.email})
                      </option>
                    )
                  })}
                </select>
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
                <label>Notes (optional)</label>
                <textarea
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  rows="3"
                  placeholder="Add any special instructions or notes for the client..."
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Assign Workout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkoutLibrary

