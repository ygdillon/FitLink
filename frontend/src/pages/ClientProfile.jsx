import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import './ClientProfile.css'

function ClientProfile() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchClientProfile()
  }, [clientId])

  const fetchClientProfile = async () => {
    try {
      const response = await api.get(`/trainer/clients/${clientId}`)
      setClient(response.data)
    } catch (error) {
      console.error('Error fetching client profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="client-profile-container">Loading...</div>
  }

  if (!client) {
    return <div className="client-profile-container">Client not found</div>
  }

  return (
    <div className="client-profile-container">
      <div className="client-profile-header">
        <h1>{client.name}</h1>
        <div className="client-status-badge">
          {client.status || 'active'}
        </div>
      </div>

      <div className="client-tabs">
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'progress' ? 'active' : ''}
          onClick={() => setActiveTab('progress')}
        >
          Progress
        </button>
        <button
          className={activeTab === 'check-ins' ? 'active' : ''}
          onClick={() => setActiveTab('check-ins')}
        >
          Check-ins
        </button>
        <button
          className={activeTab === 'workouts' ? 'active' : ''}
          onClick={() => setActiveTab('workouts')}
        >
          Workouts
        </button>
      </div>

      <div className="client-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="info-section">
              <h2>Onboarding Information</h2>
              <div className="info-grid">
                <div className="info-item">
                  <label>Email</label>
                  <div>{client.email}</div>
                </div>
                {client.height && (
                  <div className="info-item">
                    <label>Height</label>
                    <div>{client.height} inches</div>
                  </div>
                )}
                {client.weight && (
                  <div className="info-item">
                    <label>Weight</label>
                    <div>{client.weight} lbs</div>
                  </div>
                )}
                {client.age && (
                  <div className="info-item">
                    <label>Age</label>
                    <div>{client.age}</div>
                  </div>
                )}
                {client.gender && (
                  <div className="info-item">
                    <label>Gender</label>
                    <div className="capitalize">{client.gender}</div>
                  </div>
                )}
              </div>
            </div>

            {client.primary_goal && (
              <div className="info-section">
                <h2>Goals</h2>
                <div className="goal-card">
                  <h3>Primary Goal</h3>
                  <p className="capitalize">{client.primary_goal.replace('_', ' ')}</p>
                  {client.goal_target && (
                    <p><strong>Target:</strong> {client.goal_target}</p>
                  )}
                  {client.goal_timeframe && (
                    <p><strong>Timeframe:</strong> {client.goal_timeframe}</p>
                  )}
                </div>
                {client.secondary_goals && Array.isArray(client.secondary_goals) && client.secondary_goals.length > 0 && (
                  <div className="secondary-goals">
                    <h3>Secondary Goals</h3>
                    <ul>
                      {client.secondary_goals.map((goal, index) => (
                        <li key={index}>{goal}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {client.previous_experience && (
              <div className="info-section">
                <h2>Previous Experience</h2>
                <p>{client.previous_experience}</p>
              </div>
            )}

            {client.average_daily_eating && (
              <div className="info-section">
                <h2>Daily Eating Habits</h2>
                <p>{client.average_daily_eating}</p>
              </div>
            )}

            {client.barriers && (
              <div className="info-section">
                <h2>Barriers</h2>
                <p>{client.barriers}</p>
              </div>
            )}

            <div className="info-section">
              <h2>Preferences</h2>
              <div className="info-grid">
                {client.training_preference && (
                  <div className="info-item">
                    <label>Training Preference</label>
                    <div className="capitalize">{client.training_preference}</div>
                  </div>
                )}
                {client.communication_preference && (
                  <div className="info-item">
                    <label>Communication</label>
                    <div className="capitalize">{client.communication_preference}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="progress-tab">
            <div className="progress-header">
              <h2>Progress Tracking</h2>
              <button 
                onClick={() => navigate(`/trainer/clients/${clientId}/progress`)}
                className="btn-view-full"
              >
                View Full Progress
              </button>
            </div>
            {client.recent_progress && client.recent_progress.length > 0 ? (
              <div className="progress-entries">
                {client.recent_progress.map(entry => (
                  <div key={entry.id} className="progress-entry-card">
                    <div className="entry-date">
                      {new Date(entry.date).toLocaleDateString()}
                    </div>
                    <div className="entry-metrics">
                      {entry.weight && <span>Weight: {entry.weight} lbs</span>}
                      {entry.body_fat && <span>Body Fat: {entry.body_fat}%</span>}
                    </div>
                    {entry.notes && <p className="entry-notes">{entry.notes}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p>No progress entries yet</p>
            )}

            {client.custom_metrics && client.custom_metrics.length > 0 && (
              <div className="custom-metrics-section">
                <h3>Custom Metrics</h3>
                <div className="metrics-grid">
                  {client.custom_metrics.map(metric => (
                    <div key={metric.id} className="metric-card">
                      <h4>{metric.metric_name}</h4>
                      <div className="metric-value">
                        {metric.current_value} {metric.unit}
                      </div>
                      {metric.target_value && (
                        <div className="metric-target">
                          Target: {metric.target_value} {metric.unit}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'check-ins' && (
          <div className="check-ins-tab">
            <h2>Daily Check-ins</h2>
            {client.check_ins && client.check_ins.length > 0 ? (
              <div className="check-ins-list">
                {client.check_ins.map(checkIn => (
                  <div key={checkIn.id} className="check-in-card">
                    <div className="check-in-header">
                      <strong>{new Date(checkIn.check_in_date).toLocaleDateString()}</strong>
                      <span className={`status-badge ${checkIn.status}`}>
                        {checkIn.status}
                      </span>
                    </div>
                    <div className="check-in-answers">
                      {checkIn.workout_completed !== null && (
                        <div>
                          <strong>Workout:</strong> {checkIn.workout_completed ? '✓ Completed' : '✗ Not completed'}
                        </div>
                      )}
                      {checkIn.diet_stuck_to !== null && (
                        <div>
                          <strong>Diet:</strong> {checkIn.diet_stuck_to ? '✓ Stuck to plan' : '✗ Did not stick to plan'}
                        </div>
                      )}
                    </div>
                    {checkIn.notes && (
                      <div className="check-in-notes">
                        <strong>Notes:</strong> {checkIn.notes}
                      </div>
                    )}
                    {checkIn.trainer_response && (
                      <div className="trainer-response">
                        <strong>Your Response:</strong> {checkIn.trainer_response}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p>No check-ins yet</p>
            )}
          </div>
        )}

        {activeTab === 'workouts' && (
          <div className="workouts-tab">
            <h2>Assigned Workouts</h2>
            {client.workouts && client.workouts.length > 0 ? (
              <div className="workouts-list">
                {client.workouts.map(workout => (
                  <div key={workout.id} className="workout-card">
                    <h3>{workout.workout_name}</h3>
                    <div className="workout-meta">
                      <span>Assigned: {new Date(workout.assigned_date).toLocaleDateString()}</span>
                      <span className={`status-badge ${workout.status}`}>
                        {workout.status}
                      </span>
                    </div>
                    {workout.description && <p>{workout.description}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p>No workouts assigned yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ClientProfile

