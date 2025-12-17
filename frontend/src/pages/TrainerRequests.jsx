import { useState, useEffect } from 'react'
import api from '../services/api'
import './TrainerRequests.css'

function TrainerRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending') // 'pending', 'all', 'approved', 'rejected'
  const [message, setMessage] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionType, setActionType] = useState('') // 'approve' or 'reject'
  const [responseMessage, setResponseMessage] = useState('')
  const [expandedRequest, setExpandedRequest] = useState(null) // Track which request is expanded

  useEffect(() => {
    fetchRequests()
  }, [filter])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const endpoint = filter === 'all' ? '/trainer/requests/all' : '/trainer/requests'
      const params = filter !== 'pending' && filter !== 'all' ? `?status=${filter}` : ''
      const response = await api.get(`${endpoint}${params}`)
      setRequests(response.data)
    } catch (error) {
      console.error('Error fetching requests:', error)
      setMessage('Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = (request) => {
    setSelectedRequest(request)
    setActionType('approve')
    setShowActionModal(true)
  }

  const handleReject = (request) => {
    setSelectedRequest(request)
    setActionType('reject')
    setShowActionModal(true)
  }

  const submitAction = async () => {
    if (!selectedRequest) return

    try {
      const endpoint = `/trainer/requests/${selectedRequest.id}/${actionType}`
      await api.post(endpoint, { trainerResponse: responseMessage.trim() || null })
      
      setMessage(`Request ${actionType === 'approve' ? 'approved' : 'rejected'} successfully!`)
      setShowActionModal(false)
      setSelectedRequest(null)
      setResponseMessage('')
      fetchRequests()
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error(`Error ${actionType}ing request:`, error)
      setMessage(error.response?.data?.message || `Failed to ${actionType} request`)
    }
  }

  if (loading) {
    return <div className="trainer-requests-container">Loading...</div>
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div className="trainer-requests-container">
      <div className="requests-header">
        <h1>Trainer Requests</h1>
        {pendingCount > 0 && (
          <div className="pending-badge">
            {pendingCount} Pending
          </div>
        )}
      </div>

      <div className="requests-filters">
        <button
          className={filter === 'pending' ? 'active' : ''}
          onClick={() => setFilter('pending')}
        >
          Pending {pendingCount > 0 && `(${pendingCount})`}
        </button>
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All Requests
        </button>
        <button
          className={filter === 'approved' ? 'active' : ''}
          onClick={() => setFilter('approved')}
        >
          Approved
        </button>
        <button
          className={filter === 'rejected' ? 'active' : ''}
          onClick={() => setFilter('rejected')}
        >
          Rejected
        </button>
      </div>

      {message && (
        <div className={`requests-message ${message.includes('success') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="no-requests">
          <p>No {filter === 'all' ? '' : filter} requests found.</p>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map(request => (
            <div key={request.id} className={`request-card ${request.status}`}>
              <div className="request-card-header">
                <div className="client-info">
                  <div className="client-avatar">
                    {request.clientName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3>{request.clientName}</h3>
                    <p className="client-email">{request.clientEmail}</p>
                  </div>
                </div>
                <span className={`request-status-badge ${request.status}`}>
                  {request.status === 'pending' && '⏳ Pending'}
                  {request.status === 'approved' && '✓ Approved'}
                  {request.status === 'rejected' && '✗ Rejected'}
                </span>
              </div>

              {/* Quick Summary */}
              <div className="request-summary">
                {request.primaryGoal && (
                  <div className="summary-item">
                    <strong>Primary Goal:</strong> {request.primaryGoal}
                    {request.goalTarget && ` - ${request.goalTarget}`}
                    {request.goalTimeframe && ` (${request.goalTimeframe})`}
                  </div>
                )}
                {request.location && (
                  <div className="summary-item">
                    <strong>Location:</strong> {request.location}
                  </div>
                )}
                {request.age && (
                  <div className="summary-item">
                    <strong>Age:</strong> {request.age} {request.gender && `• ${request.gender}`}
                  </div>
                )}
                {request.activityLevel && (
                  <div className="summary-item">
                    <strong>Activity Level:</strong> {request.activityLevel}
                  </div>
                )}
              </div>

              {request.message && (
                <div className="request-message">
                  <strong>Client Message:</strong>
                  <p>{request.message}</p>
                </div>
              )}

              {/* Expandable Full Profile */}
              <div className="profile-expand-section">
                <button
                  className="btn-expand-profile"
                  onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                >
                  {expandedRequest === request.id ? '▼ Hide Full Profile' : '▶ View Full Profile'}
                </button>

                {expandedRequest === request.id && (
                  <div className="full-profile-details">
                    {/* Basic Information */}
                    <div className="profile-section">
                      <h4>Basic Information</h4>
                      <div className="profile-grid">
                        {request.height && <div><strong>Height:</strong> {request.height} inches</div>}
                        {request.weight && <div><strong>Weight:</strong> {request.weight} lbs</div>}
                        {request.gender && <div><strong>Gender:</strong> {request.gender}</div>}
                        {request.age && <div><strong>Age:</strong> {request.age}</div>}
                        {request.location && <div className="full-width"><strong>Location:</strong> {request.location}</div>}
                      </div>
                    </div>

                    {/* Workout Experience */}
                    {(request.previousExperience || request.activityLevel || request.availableDates) && (
                      <div className="profile-section">
                        <h4>Workout Experience</h4>
                        {request.previousExperience && (
                          <div className="profile-text"><strong>Experience:</strong> {request.previousExperience}</div>
                        )}
                        {request.activityLevel && (
                          <div><strong>Current Activity Level:</strong> {request.activityLevel}</div>
                        )}
                        {request.availableDates && request.availableDates.length > 0 && (
                          <div className="available-dates-display">
                            <strong>Available Times:</strong>
                            <div className="dates-grid">
                              {request.availableDates.map((date, idx) => (
                                <span key={idx} className="date-tag">{date.day} - {date.time}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Goals */}
                    {(request.primaryGoal || request.secondaryGoals) && (
                      <div className="profile-section">
                        <h4>Goals</h4>
                        {request.primaryGoal && (
                          <div><strong>Primary Goal:</strong> {request.primaryGoal}</div>
                        )}
                        {request.goalTarget && (
                          <div><strong>Target:</strong> {request.goalTarget}</div>
                        )}
                        {request.goalTimeframe && (
                          <div><strong>Timeframe:</strong> {request.goalTimeframe}</div>
                        )}
                        {request.secondaryGoals && request.secondaryGoals.length > 0 && (
                          <div>
                            <strong>Secondary Goals:</strong>
                            <div className="goals-list">
                              {request.secondaryGoals.map((goal, idx) => (
                                <span key={idx} className="goal-tag">{goal}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Nutrition */}
                    {(request.nutritionHabits || request.nutritionExperience || request.averageDailyEating) && (
                      <div className="profile-section">
                        <h4>Nutrition</h4>
                        {request.nutritionHabits && (
                          <div className="profile-text"><strong>Current Habits:</strong> {request.nutritionHabits}</div>
                        )}
                        {request.nutritionExperience && (
                          <div className="profile-text"><strong>Experience:</strong> {request.nutritionExperience}</div>
                        )}
                        {request.averageDailyEating && (
                          <div className="profile-text"><strong>Average Daily Eating:</strong> {request.averageDailyEating}</div>
                        )}
                      </div>
                    )}

                    {/* Health & Lifestyle */}
                    {(request.injuries || request.sleepHours || request.stressLevel || request.lifestyleActivity) && (
                      <div className="profile-section">
                        <h4>Health & Lifestyle</h4>
                        {request.injuries && (
                          <div className="profile-text"><strong>Injuries/Limitations:</strong> {request.injuries}</div>
                        )}
                        {request.sleepHours && (
                          <div><strong>Sleep:</strong> {request.sleepHours} hours/night</div>
                        )}
                        {request.stressLevel && (
                          <div><strong>Stress Level:</strong> {request.stressLevel}</div>
                        )}
                        {request.lifestyleActivity && (
                          <div className="profile-text"><strong>Lifestyle Activity:</strong> {request.lifestyleActivity}</div>
                        )}
                      </div>
                    )}

                    {/* Psychological Factors */}
                    {(request.psychologicalBarriers || request.mindset || request.motivationWhy) && (
                      <div className="profile-section">
                        <h4>Psychological Factors</h4>
                        {request.psychologicalBarriers && (
                          <div className="profile-text"><strong>Barriers:</strong> {request.psychologicalBarriers}</div>
                        )}
                        {request.mindset && (
                          <div className="profile-text"><strong>Current Mindset:</strong> {request.mindset}</div>
                        )}
                        {request.motivationWhy && (
                          <div className="profile-text"><strong>Motivation ("Why"):</strong> {request.motivationWhy}</div>
                        )}
                      </div>
                    )}

                    {/* Preferences */}
                    {(request.trainingPreference || request.communicationPreference || request.barriers) && (
                      <div className="profile-section">
                        <h4>Preferences</h4>
                        {request.trainingPreference && (
                          <div><strong>Training Preference:</strong> {request.trainingPreference}</div>
                        )}
                        {request.communicationPreference && (
                          <div><strong>Communication:</strong> {request.communicationPreference}</div>
                        )}
                        {request.barriers && (
                          <div className="profile-text"><strong>Barriers to Gym:</strong> {request.barriers}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {request.trainerResponse && (
                <div className="trainer-response">
                  <strong>Your Response:</strong>
                  <p>{request.trainerResponse}</p>
                </div>
              )}

              <div className="request-footer">
                <div className="request-date">
                  Received: {new Date(request.createdAt).toLocaleDateString()}
                </div>
                {request.status === 'pending' && (
                  <div className="request-actions">
                    <button
                      className="btn-approve"
                      onClick={() => handleApprove(request)}
                    >
                      Approve
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => handleReject(request)}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Modal */}
      {showActionModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowActionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{actionType === 'approve' ? 'Approve' : 'Reject'} Request</h2>
              <button className="modal-close" onClick={() => setShowActionModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>
                {actionType === 'approve' 
                  ? `Are you sure you want to approve ${selectedRequest.clientName}'s request? They will be added as your client.`
                  : `Are you sure you want to reject ${selectedRequest.clientName}'s request?`
                }
              </p>
              <div className="form-group">
                <label>Response Message (Optional)</label>
                <textarea
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  placeholder={actionType === 'approve' 
                    ? "Welcome! I'm excited to work with you..."
                    : "Thank you for your interest, but..."
                  }
                  rows="4"
                  className="response-textarea"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-cancel" 
                onClick={() => {
                  setShowActionModal(false)
                  setResponseMessage('')
                  setSelectedRequest(null)
                }}
              >
                Cancel
              </button>
              <button 
                className={actionType === 'approve' ? 'btn-confirm-approve' : 'btn-confirm-reject'}
                onClick={submitAction}
              >
                {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TrainerRequests

