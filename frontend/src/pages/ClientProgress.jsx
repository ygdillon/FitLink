import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import './ClientProgress.css'

function ClientProgress() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [customMetrics, setCustomMetrics] = useState([])
  const [progressEntries, setProgressEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddMetric, setShowAddMetric] = useState(false)
  const [newMetric, setNewMetric] = useState({
    metric_name: '',
    metric_type: 'custom',
    unit: '',
    target_value: '',
    current_value: ''
  })

  useEffect(() => {
    fetchClientData()
  }, [clientId])

  const fetchClientData = async () => {
    try {
      const response = await api.get(`/trainer/clients/${clientId}`)
      setClient(response.data)
      setCustomMetrics(response.data.custom_metrics || [])
      setProgressEntries(response.data.recent_progress || [])
    } catch (error) {
      console.error('Error fetching client data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMetric = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/trainer/clients/${clientId}/metrics`, newMetric)
      setNewMetric({
        metric_name: '',
        metric_type: 'custom',
        unit: '',
        target_value: '',
        current_value: ''
      })
      setShowAddMetric(false)
      fetchClientData()
    } catch (error) {
      console.error('Error adding metric:', error)
      alert('Failed to add metric')
    }
  }

  if (loading) {
    return <div className="client-progress-container">Loading...</div>
  }

  if (!client) {
    return <div className="client-progress-container">Client not found</div>
  }

  return (
    <div className="client-progress-container">
      <div className="progress-header">
        <div>
          <button onClick={() => navigate(`/trainer/clients/${clientId}`)} className="btn-back">
            ← Back to Client Profile
          </button>
          <h1>Progress Tracking - {client.name}</h1>
        </div>
        <button onClick={() => setShowAddMetric(!showAddMetric)} className="btn-add-metric">
          + Add Custom Metric
        </button>
      </div>

      {showAddMetric && (
        <div className="add-metric-card">
          <h2>Add Custom Metric</h2>
          <form onSubmit={handleAddMetric}>
            <div className="form-row">
              <div className="form-group">
                <label>Metric Name *</label>
                <input
                  type="text"
                  value={newMetric.metric_name}
                  onChange={(e) => setNewMetric({...newMetric, metric_name: e.target.value})}
                  required
                  placeholder="e.g., Bench Press Max, Waist Measurement"
                />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select
                  value={newMetric.metric_type}
                  onChange={(e) => setNewMetric({...newMetric, metric_type: e.target.value})}
                >
                  <option value="custom">Custom</option>
                  <option value="weight">Weight</option>
                  <option value="strength">Strength</option>
                  <option value="measurement">Measurement</option>
                  <option value="endurance">Endurance</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Unit</label>
                <input
                  type="text"
                  value={newMetric.unit}
                  onChange={(e) => setNewMetric({...newMetric, unit: e.target.value})}
                  placeholder="e.g., lbs, kg, reps, inches"
                />
              </div>
              <div className="form-group">
                <label>Current Value</label>
                <input
                  type="number"
                  value={newMetric.current_value}
                  onChange={(e) => setNewMetric({...newMetric, current_value: e.target.value})}
                  step="0.1"
                  placeholder="Current"
                />
              </div>
              <div className="form-group">
                <label>Target Value</label>
                <input
                  type="number"
                  value={newMetric.target_value}
                  onChange={(e) => setNewMetric({...newMetric, target_value: e.target.value})}
                  step="0.1"
                  placeholder="Target"
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">Add Metric</button>
              <button type="button" onClick={() => setShowAddMetric(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="progress-grid">
        {/* Custom Metrics Section */}
        <div className="metrics-section">
          <h2>Custom Metrics</h2>
          {customMetrics.length === 0 ? (
            <p>No custom metrics yet. Add one to start tracking!</p>
          ) : (
            <div className="metrics-grid">
              {customMetrics.map(metric => (
                <div key={metric.id} className="metric-card">
                  <h3>{metric.metric_name}</h3>
                  <div className="metric-values">
                    <div className="current-value">
                      {metric.current_value || 'N/A'} {metric.unit}
                    </div>
                    {metric.target_value && (
                      <div className="target-value">
                        Target: {metric.target_value} {metric.unit}
                      </div>
                    )}
                  </div>
                  {metric.target_value && metric.current_value && (
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar"
                        style={{
                          width: `${Math.min((metric.current_value / metric.target_value) * 100, 100)}%`
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progress Entries Section */}
        <div className="entries-section">
          <h2>Progress History</h2>
          {progressEntries.length === 0 ? (
            <p>No progress entries yet</p>
          ) : (
            <div className="progress-timeline">
              {progressEntries.map(entry => (
                <div key={entry.id} className="timeline-entry">
                  <div className="timeline-date">
                    {new Date(entry.date).toLocaleDateString()}
                  </div>
                  <div className="timeline-content">
                    <div className="entry-metrics">
                      {entry.weight && (
                        <div className="metric-badge">
                          Weight: {entry.weight} lbs
                        </div>
                      )}
                      {entry.body_fat && (
                        <div className="metric-badge">
                          Body Fat: {entry.body_fat}%
                        </div>
                      )}
                      {entry.measurements && (
                        <div className="measurements">
                          {Object.entries(JSON.parse(entry.measurements || '{}')).map(([key, value]) => (
                            <div key={key} className="metric-badge">
                              {key}: {value} in
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {entry.notes && (
                      <div className="entry-notes">{entry.notes}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ClientProgress

