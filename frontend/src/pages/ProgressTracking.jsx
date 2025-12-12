import { useState, useEffect } from 'react'
import api from '../services/api'
import './ProgressTracking.css'

function ProgressTracking() {
  const [entries, setEntries] = useState([])
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '',
    bodyFat: '',
    measurements: {
      chest: '',
      waist: '',
      hips: '',
      arms: ''
    },
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchProgress()
  }, [])

  const fetchProgress = async () => {
    try {
      const response = await api.get('/client/progress')
      setEntries(response.data)
    } catch (error) {
      console.error('Error fetching progress:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name.startsWith('measurements.')) {
      const measurementType = name.split('.')[1]
      setFormData({
        ...formData,
        measurements: {
          ...formData.measurements,
          [measurementType]: value
        }
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await api.post('/client/progress', formData)
      setFormData({
        date: new Date().toISOString().split('T')[0],
        weight: '',
        bodyFat: '',
        measurements: {
          chest: '',
          waist: '',
          hips: '',
          arms: ''
        },
        notes: ''
      })
      fetchProgress()
    } catch (error) {
      console.error('Error saving progress:', error)
      alert('Failed to save progress')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="progress-container">
      <h1>Progress Tracking</h1>

      <div className="progress-grid">
        <div className="progress-form-card">
          <h2>Log Progress</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Weight (lbs)</label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                step="0.1"
              />
            </div>
            <div className="form-group">
              <label>Body Fat %</label>
              <input
                type="number"
                name="bodyFat"
                value={formData.bodyFat}
                onChange={handleChange}
                step="0.1"
              />
            </div>
            <div className="measurements-section">
              <h3>Measurements (inches)</h3>
              <div className="measurements-grid">
                <div className="form-group">
                  <label>Chest</label>
                  <input
                    type="number"
                    name="measurements.chest"
                    value={formData.measurements.chest}
                    onChange={handleChange}
                    step="0.1"
                  />
                </div>
                <div className="form-group">
                  <label>Waist</label>
                  <input
                    type="number"
                    name="measurements.waist"
                    value={formData.measurements.waist}
                    onChange={handleChange}
                    step="0.1"
                  />
                </div>
                <div className="form-group">
                  <label>Hips</label>
                  <input
                    type="number"
                    name="measurements.hips"
                    value={formData.measurements.hips}
                    onChange={handleChange}
                    step="0.1"
                  />
                </div>
                <div className="form-group">
                  <label>Arms</label>
                  <input
                    type="number"
                    name="measurements.arms"
                    value={formData.measurements.arms}
                    onChange={handleChange}
                    step="0.1"
                  />
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Progress'}
            </button>
          </form>
        </div>

        <div className="progress-history-card">
          <h2>Progress History</h2>
          {entries.length === 0 ? (
            <p>No progress entries yet</p>
          ) : (
            <div className="progress-entries">
              {entries.map(entry => (
                <div key={entry.id} className="progress-entry">
                  <div className="entry-header">
                    <strong>{new Date(entry.date).toLocaleDateString()}</strong>
                  </div>
                  <div className="entry-data">
                    {entry.weight && <span>Weight: {entry.weight} lbs</span>}
                    {entry.body_fat && <span>Body Fat: {entry.body_fat}%</span>}
                  </div>
                  {entry.notes && <p className="entry-notes">{entry.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProgressTracking

