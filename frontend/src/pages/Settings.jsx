import { useState, useEffect } from 'react'
import api from '../services/api'
import './Settings.css'

function Settings() {
  const [currentTrainer, setCurrentTrainer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('current') // 'current', 'find', or 'requests'
  const [pendingRequests, setPendingRequests] = useState([])
  const [requestMessage, setRequestMessage] = useState('')
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [selectedTrainer, setSelectedTrainer] = useState(null)

  useEffect(() => {
    fetchCurrentTrainer()
    fetchPendingRequests()
  }, [])

  const fetchCurrentTrainer = async () => {
    try {
      const response = await api.get('/client/trainer')
      setCurrentTrainer(response.data)
    } catch (error) {
      console.error('Error fetching trainer:', error)
      if (error.response?.status === 404) {
        setCurrentTrainer(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingRequests = async () => {
    try {
      const response = await api.get('/client/trainer/requests')
      setPendingRequests(response.data)
    } catch (error) {
      console.error('Error fetching requests:', error)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setSearching(true)
    setMessage('')
    try {
      const response = await api.get(`/client/trainers/search?q=${encodeURIComponent(searchQuery)}`)
      setSearchResults(response.data)
      if (response.data.length === 0) {
        setMessage('No trainers found. Try a different search term.')
      }
    } catch (error) {
      console.error('Error searching trainers:', error)
      setMessage('Failed to search trainers')
    } finally {
      setSearching(false)
    }
  }

  const handleRequestTrainer = async (trainerId) => {
    // Check if onboarding is completed
    try {
      const response = await api.get('/client/profile/onboarding-status')
      if (!response.data.onboarding_completed) {
        setMessage('Please complete your profile before requesting a trainer. You will be redirected to complete your profile.')
        setTimeout(() => {
          window.location.href = '/client/onboarding'
        }, 2000)
        return
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error)
      setMessage('Unable to verify profile completion. Please try again.')
      return
    }

    setSelectedTrainer(searchResults.find(t => t.id === trainerId))
    setShowRequestModal(true)
  }

  const submitTrainerRequest = async () => {
    if (!selectedTrainer) return

    try {
      await api.post(`/client/trainer/request`, { 
        trainerId: selectedTrainer.id,
        message: requestMessage.trim() || null
      })
      setMessage('Trainer request sent successfully! The trainer will review your request and get back to you.')
      setShowRequestModal(false)
      setRequestMessage('')
      setSelectedTrainer(null)
      fetchPendingRequests()
      setActiveTab('requests')
    } catch (error) {
      console.error('Error requesting trainer:', error)
      if (error.response?.data?.requires_onboarding) {
        setMessage('Please complete your profile before requesting a trainer. Redirecting to profile setup...')
        setTimeout(() => {
          window.location.href = '/client/onboarding'
        }, 2000)
      } else {
        setMessage(error.response?.data?.message || 'Failed to send trainer request')
      }
    }
  }

  const handleDisconnectTrainer = async () => {
    if (!window.confirm('Are you sure you want to disconnect from your current trainer? You will lose access to their workouts and programs.')) {
      return
    }

    try {
      await api.delete('/client/trainer')
      setMessage('Disconnected from trainer successfully')
      setCurrentTrainer(null)
    } catch (error) {
      console.error('Error disconnecting trainer:', error)
      setMessage(error.response?.data?.message || 'Failed to disconnect from trainer')
    }
  }

  if (loading) {
    return <div className="settings-container">Loading...</div>
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Settings</h1>
      </div>

      <div className="settings-tabs">
        <button
          className={activeTab === 'current' ? 'active' : ''}
          onClick={() => setActiveTab('current')}
        >
          Current Trainer
        </button>
        <button
          className={activeTab === 'requests' ? 'active' : ''}
          onClick={() => setActiveTab('requests')}
        >
          Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
        </button>
        <button
          className={activeTab === 'find' ? 'active' : ''}
          onClick={() => setActiveTab('find')}
        >
          Find Trainer
        </button>
      </div>

      {message && (
        <div className={`settings-message ${message.includes('success') || message.includes('sent') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {activeTab === 'current' && (
        <div className="settings-section">
          <h2>Your Current Trainer</h2>
          {currentTrainer ? (
            <div className="trainer-card">
              <div className="trainer-info">
                <div className="trainer-avatar">
                  {currentTrainer.name.charAt(0).toUpperCase()}
                </div>
                <div className="trainer-details">
                  <h3>{currentTrainer.name}</h3>
                  <p className="trainer-email">{currentTrainer.email}</p>
                  {currentTrainer.bio && (
                    <p className="trainer-bio">{currentTrainer.bio}</p>
                  )}
                  {currentTrainer.specialties && currentTrainer.specialties.length > 0 && (
                    <div className="trainer-specialties">
                      <strong>Specialties:</strong>
                      <div className="specialty-tags">
                        {Array.isArray(currentTrainer.specialties) 
                          ? currentTrainer.specialties.map((spec, idx) => (
                              <span key={idx} className="specialty-tag">{spec}</span>
                            ))
                          : Object.values(currentTrainer.specialties).map((spec, idx) => (
                              <span key={idx} className="specialty-tag">{spec}</span>
                            ))
                        }
                      </div>
                    </div>
                  )}
                  {currentTrainer.hourly_rate && (
                    <p className="trainer-rate">
                      <strong>Rate:</strong> ${currentTrainer.hourly_rate}/hour
                    </p>
                  )}
                </div>
              </div>
              <div className="trainer-actions">
                <button 
                  className="btn-disconnect"
                  onClick={handleDisconnectTrainer}
                >
                  Disconnect from Trainer
                </button>
              </div>
            </div>
          ) : (
            <div className="no-trainer">
              <p>You don't have a trainer assigned yet.</p>
              <p>Use the "Find Trainer" tab to search for and connect with a trainer.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="settings-section">
          <h2>Trainer Requests</h2>
          {pendingRequests.length > 0 ? (
            <div className="requests-list">
              {pendingRequests.map(request => (
                <div key={request.id} className={`request-card ${request.status}`}>
                  <div className="request-header">
                    <div>
                      <h3>{request.trainerName}</h3>
                      <p className="request-email">{request.trainerEmail}</p>
                    </div>
                    <span className={`request-status ${request.status}`}>
                      {request.status === 'pending' && '⏳ Pending'}
                      {request.status === 'approved' && '✓ Approved'}
                      {request.status === 'rejected' && '✗ Rejected'}
                    </span>
                  </div>
                  {request.message && (
                    <div className="request-message">
                      <strong>Your Message:</strong>
                      <p>{request.message}</p>
                    </div>
                  )}
                  {request.trainerResponse && (
                    <div className="trainer-response-message">
                      <strong>Trainer Response:</strong>
                      <p>{request.trainerResponse}</p>
                    </div>
                  )}
                  <div className="request-date">
                    Sent: {new Date(request.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-requests">
              <p>You don't have any trainer requests yet.</p>
              <p>Use the "Find Trainer" tab to search for and request a trainer.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'find' && (
        <div className="settings-section">
          <h2>Find a New Trainer</h2>
          <form onSubmit={handleSearch} className="trainer-search-form">
            <div className="search-input-group">
              <input
                type="text"
                placeholder="Search by name, specialty, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <button type="submit" disabled={searching || !searchQuery.trim()} className="btn-search">
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>

          {searchResults.length > 0 && (
            <div className="trainer-results">
              <h3>Search Results</h3>
              <div className="trainer-list">
                {searchResults.map(trainer => (
                  <div key={trainer.id} className="trainer-result-card">
                    <div className="trainer-result-info">
                      <div className="trainer-avatar">
                        {trainer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="trainer-result-details">
                        <h4>{trainer.name}</h4>
                        <p className="trainer-email">{trainer.email}</p>
                        {trainer.bio && (
                          <p className="trainer-bio">{trainer.bio}</p>
                        )}
                        {trainer.specialties && trainer.specialties.length > 0 && (
                          <div className="trainer-specialties">
                            <strong>Specialties:</strong>
                            <div className="specialty-tags">
                              {Array.isArray(trainer.specialties)
                                ? trainer.specialties.map((spec, idx) => (
                                    <span key={idx} className="specialty-tag">{spec}</span>
                                  ))
                                : Object.values(trainer.specialties).map((spec, idx) => (
                                    <span key={idx} className="specialty-tag">{spec}</span>
                                  ))
                              }
                            </div>
                          </div>
                        )}
                        {trainer.hourly_rate && (
                          <p className="trainer-rate">
                            <strong>Rate:</strong> ${trainer.hourly_rate}/hour
                          </p>
                        )}
                        {trainer.total_clients !== undefined && (
                          <p className="trainer-stats">
                            <strong>Clients:</strong> {trainer.active_clients || 0} active / {trainer.total_clients || 0} total
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="trainer-result-actions">
                      {currentTrainer && currentTrainer.id === trainer.id ? (
                        <button className="btn-current" disabled>
                          Current Trainer
                        </button>
                      ) : pendingRequests.some(r => r.trainerId === trainer.id && r.status === 'pending') ? (
                        <button className="btn-pending" disabled>
                          Request Pending
                        </button>
                      ) : (
                        <button
                          className="btn-request"
                          onClick={() => handleRequestTrainer(trainer.id)}
                        >
                          Request Trainer
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && selectedTrainer && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Request Trainer: {selectedTrainer.name}</h2>
              <button className="modal-close" onClick={() => setShowRequestModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Send a message to introduce yourself and explain your fitness goals. This helps the trainer understand if they can help you.</p>
              <div className="form-group">
                <label>Message (Optional but Recommended)</label>
                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Hi! I'm interested in working with you because... My goals are..."
                  rows="5"
                  className="request-textarea"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => {
                setShowRequestModal(false)
                setRequestMessage('')
                setSelectedTrainer(null)
              }}>
                Cancel
              </button>
              <button className="btn-submit-request" onClick={submitTrainerRequest}>
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings

