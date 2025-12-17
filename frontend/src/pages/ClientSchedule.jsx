import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../services/api'
import './ClientSchedule.css'

function ClientSchedule({ clientId, clientName }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const [formData, setFormData] = useState({
    workoutId: '',
    sessionDate: '',
    sessionTime: '',
    duration: 60,
    sessionType: 'in_person',
    location: '',
    meetingLink: '',
    notes: '',
    isRecurring: false,
    recurringPattern: 'weekly',
    recurringEndDate: '',
    dayOfWeek: ''
  })

  useEffect(() => {
    fetchSessions()
    fetchWorkouts()
  }, [clientId])

  const fetchSessions = async () => {
    try {
      const response = await api.get(`/schedule/trainer/clients/${clientId}/sessions`)
      setSessions(response.data)
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWorkouts = async () => {
    try {
      const response = await api.get('/trainer/workouts')
      setWorkouts(response.data)
    } catch (error) {
      console.error('Error fetching workouts:', error)
    }
  }

  const handleCreateSession = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        clientId: parseInt(clientId),
        workoutId: formData.workoutId || null,
        sessionDate: formData.sessionDate,
        sessionTime: formData.sessionTime,
        duration: formData.duration,
        sessionType: formData.sessionType,
        location: formData.location || null,
        meetingLink: formData.meetingLink || null,
        notes: formData.notes || null
      }
      
      if (formData.isRecurring) {
        payload.isRecurring = true
        payload.recurringPattern = formData.recurringPattern
        payload.recurringEndDate = formData.recurringEndDate
        payload.dayOfWeek = parseInt(formData.dayOfWeek)
      }
      
      const response = await api.post('/schedule/trainer/sessions', payload)
      
      if (formData.isRecurring && response.data.sessions) {
        alert(`Successfully created ${response.data.sessions.length} recurring sessions!`)
      } else {
        alert('Session scheduled successfully!')
      }
      
      setShowCreateModal(false)
      resetForm()
      fetchSessions()
    } catch (error) {
      console.error('Error creating session:', error)
      alert(error.response?.data?.message || 'Failed to schedule session')
    }
  }

  const handleUpdateSession = async (e) => {
    e.preventDefault()
    try {
      await api.put(`/schedule/trainer/sessions/${selectedSession.id}`, formData)
      alert('Session updated successfully!')
      setShowEditModal(false)
      setSelectedSession(null)
      resetForm()
      fetchSessions()
    } catch (error) {
      console.error('Error updating session:', error)
      alert(error.response?.data?.message || 'Failed to update session')
    }
  }

  const handleCancelSession = async (sessionId) => {
    if (!confirm('Are you sure you want to cancel this session?')) return
    
    try {
      await api.post(`/schedule/trainer/sessions/${sessionId}/cancel`, {
        reason: 'Cancelled by trainer'
      })
      alert('Session cancelled')
      fetchSessions()
    } catch (error) {
      console.error('Error cancelling session:', error)
      alert('Failed to cancel session')
    }
  }

  const openEditModal = (session) => {
    setSelectedSession(session)
    setFormData({
      workoutId: session.workout_id || '',
      sessionDate: session.session_date,
      sessionTime: session.session_time,
      duration: session.duration || 60,
      sessionType: session.session_type || 'in_person',
      location: session.location || '',
      meetingLink: session.meeting_link || '',
      notes: session.notes || ''
    })
    setShowEditModal(true)
  }

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0]
    const threeMonthsLater = new Date()
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)
    const endDate = threeMonthsLater.toISOString().split('T')[0]
    
    setFormData({
      workoutId: '',
      sessionDate: today,
      sessionTime: '',
      duration: 60,
      sessionType: 'in_person',
      location: '',
      meetingLink: '',
      notes: '',
      isRecurring: false,
      recurringPattern: 'weekly',
      recurringEndDate: endDate,
      dayOfWeek: ''
    })
  }
  
  // Get day of week from selected date
  const getDayOfWeek = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.getDay().toString()
  }
  
  // Update day of week when date changes and recurring is enabled
  useEffect(() => {
    if (formData.sessionDate && formData.isRecurring) {
      const dayOfWeek = getDayOfWeek(formData.sessionDate)
      if (formData.dayOfWeek !== dayOfWeek) {
        setFormData(prev => ({
          ...prev,
          dayOfWeek: dayOfWeek
        }))
      }
    }
  }, [formData.sessionDate, formData.isRecurring])

  const upcomingSessions = sessions.filter(s => 
    new Date(s.session_date) >= new Date().setHours(0,0,0,0) && 
    s.status !== 'cancelled'
  ).sort((a, b) => {
    const dateA = new Date(`${a.session_date}T${a.session_time}`)
    const dateB = new Date(`${b.session_date}T${b.session_time}`)
    return dateA - dateB
  })

  const pastSessions = sessions.filter(s => 
    new Date(s.session_date) < new Date().setHours(0,0,0,0) || 
    s.status === 'completed'
  ).sort((a, b) => {
    const dateA = new Date(`${a.session_date}T${a.session_time}`)
    const dateB = new Date(`${b.session_date}T${b.session_time}`)
    return dateB - dateA
  })

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="client-schedule-container">
      <div className="schedule-header">
        <h2>Schedule for {clientName}</h2>
        <button 
          onClick={() => {
            const today = new Date().toISOString().split('T')[0]
            const threeMonthsLater = new Date()
            threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)
            const endDate = threeMonthsLater.toISOString().split('T')[0]
            const defaultTime = '09:00'
            setFormData({ 
              ...formData, 
              sessionDate: today, 
              sessionTime: defaultTime,
              recurringEndDate: endDate
            })
            setShowCreateModal(true)
          }}
          className="btn-primary"
        >
          + Schedule Session
        </button>
      </div>

      {/* Upcoming Sessions */}
      <div className="sessions-section">
        <h3>Upcoming Sessions ({upcomingSessions.length})</h3>
        {upcomingSessions.length === 0 ? (
          <div className="empty-state">
            <p>No upcoming sessions scheduled.</p>
            <p>Click "Schedule Session" to book a session with {clientName}.</p>
          </div>
        ) : (
          <div className="sessions-list">
            {upcomingSessions.map(session => (
              <div key={session.id} className="session-card upcoming">
                <div className="session-date-time">
                  <div className="session-date">
                    {new Date(session.session_date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="session-time">
                    {new Date(`2000-01-01T${session.session_time}`).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    })} ({session.duration} min)
                  </div>
                </div>
                <div className="session-details">
                  <div className="session-type-badge">
                    {session.session_type === 'online' ? '🌐 Online' : 
                     session.session_type === 'hybrid' ? '🔄 Hybrid' : 
                     '📍 In-Person'}
                  </div>
                  {session.workout_name && (
                    <div className="session-workout">Workout: {session.workout_name}</div>
                  )}
                  {session.location && (
                    <div className="session-location">📍 {session.location}</div>
                  )}
                  {session.meeting_link && (
                    <div className="session-link">
                      <a href={session.meeting_link} target="_blank" rel="noopener noreferrer">
                        Join Meeting →
                      </a>
                    </div>
                  )}
                  {session.notes && (
                    <div className="session-notes">{session.notes}</div>
                  )}
                  <div className="session-status">
                    <span className={`status-badge ${session.status}`}>
                      {session.status}
                    </span>
                  </div>
                </div>
                <div className="session-actions">
                  <button 
                    onClick={() => openEditModal(session)}
                    className="btn-edit"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleCancelSession(session.id)}
                    className="btn-cancel"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Sessions */}
      {pastSessions.length > 0 && (
        <div className="sessions-section">
          <h3>Past Sessions ({pastSessions.length})</h3>
          <div className="sessions-list past">
            {pastSessions.slice(0, 10).map(session => (
              <div key={session.id} className="session-card past">
                <div className="session-date-time">
                  <div className="session-date">
                    {new Date(session.session_date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="session-time">
                    {new Date(`2000-01-01T${session.session_time}`).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
                <div className="session-status">
                  <span className={`status-badge ${session.status}`}>
                    {session.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => { setShowCreateModal(false); resetForm() }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Schedule New Session</h2>
              <button className="modal-close" onClick={() => { setShowCreateModal(false); resetForm() }}>×</button>
            </div>
            <form onSubmit={handleCreateSession}>
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={formData.sessionDate}
                  onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="form-group">
                <label>Time *</label>
                <input
                  type="time"
                  value={formData.sessionTime}
                  onChange={(e) => setFormData({ ...formData, sessionTime: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    min="15"
                    max="180"
                    step="15"
                  />
                </div>
                <div className="form-group">
                  <label>Type *</label>
                  <select
                    value={formData.sessionType}
                    onChange={(e) => setFormData({ ...formData, sessionType: e.target.value })}
                    required
                  >
                    <option value="in_person">In-Person</option>
                    <option value="online">Online</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
              {formData.sessionType === 'in_person' && (
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Gym address or location"
                  />
                </div>
              )}
              {formData.sessionType === 'online' && (
                <div className="form-group">
                  <label>Meeting Link</label>
                  <input
                    type="url"
                    value={formData.meetingLink}
                    onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                    placeholder="Zoom, Google Meet, or other meeting link"
                  />
                </div>
              )}
              <div className="form-group">
                <label>Workout (optional)</label>
                <select
                  value={formData.workoutId}
                  onChange={(e) => setFormData({ ...formData, workoutId: e.target.value })}
                >
                  <option value="">No specific workout</option>
                  {workouts.map(workout => (
                    <option key={workout.id} value={workout.id}>{workout.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                  placeholder="Any special instructions or notes for this session..."
                />
              </div>
              
              {/* Recurring Session Options */}
              <div className="recurring-section">
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.isRecurring}
                      onChange={(e) => {
                        const isRecurring = e.target.checked
                        setFormData({
                          ...formData,
                          isRecurring,
                          dayOfWeek: isRecurring ? getDayOfWeek(formData.sessionDate) : ''
                        })
                      }}
                    />
                    Repeat this session weekly
                  </label>
                </div>
                
                {formData.isRecurring && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Repeat Pattern</label>
                        <select
                          value={formData.recurringPattern}
                          onChange={(e) => setFormData({ ...formData, recurringPattern: e.target.value })}
                        >
                          <option value="weekly">Every Week</option>
                          <option value="biweekly">Every 2 Weeks</option>
                          <option value="monthly">Every Month</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>End Date *</label>
                        <input
                          type="date"
                          value={formData.recurringEndDate}
                          onChange={(e) => setFormData({ ...formData, recurringEndDate: e.target.value })}
                          required={formData.isRecurring}
                          min={formData.sessionDate}
                        />
                      </div>
                    </div>
                    <div className="recurring-info">
                      <p>
                        <strong>Schedule:</strong> Every {formData.recurringPattern === 'weekly' ? 'week' : 
                                                          formData.recurringPattern === 'biweekly' ? '2 weeks' : 
                                                          'month'} on {
                        ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][parseInt(formData.dayOfWeek) || 0]
                      } at {formData.sessionTime || 'selected time'} until {formData.recurringEndDate ? new Date(formData.recurringEndDate).toLocaleDateString() : 'end date'}
                      </p>
                    </div>
                  </>
                )}
              </div>
              
              <div className="form-actions">
                <button type="button" onClick={() => { setShowCreateModal(false); resetForm() }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Schedule Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Session Modal */}
      {showEditModal && selectedSession && (
        <div className="modal-overlay" onClick={() => { setShowEditModal(false); setSelectedSession(null); resetForm() }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Session</h2>
              <button className="modal-close" onClick={() => { setShowEditModal(false); setSelectedSession(null); resetForm() }}>×</button>
            </div>
            <form onSubmit={handleUpdateSession}>
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={formData.sessionDate}
                  onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Time *</label>
                <input
                  type="time"
                  value={formData.sessionTime}
                  onChange={(e) => setFormData({ ...formData, sessionTime: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    min="15"
                    max="180"
                    step="15"
                  />
                </div>
                <div className="form-group">
                  <label>Type *</label>
                  <select
                    value={formData.sessionType}
                    onChange={(e) => setFormData({ ...formData, sessionType: e.target.value })}
                    required
                  >
                    <option value="in_person">In-Person</option>
                    <option value="online">Online</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
              {formData.sessionType === 'in_person' && (
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Gym address or location"
                  />
                </div>
              )}
              {formData.sessionType === 'online' && (
                <div className="form-group">
                  <label>Meeting Link</label>
                  <input
                    type="url"
                    value={formData.meetingLink}
                    onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                    placeholder="Zoom, Google Meet, or other meeting link"
                  />
                </div>
              )}
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status || selectedSession.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => { setShowEditModal(false); setSelectedSession(null); resetForm() }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientSchedule

