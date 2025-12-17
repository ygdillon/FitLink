import { useState, useEffect } from 'react'
import api from '../services/api'
import './DailyCheckIn.css'

function DailyCheckIn() {
  const [formData, setFormData] = useState({
    workout_completed: null,
    diet_stuck_to: null,
    workout_rating: null,
    notes: ''
  })
  const [todayCheckIn, setTodayCheckIn] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchTodayCheckIn()
  }, [])

  const fetchTodayCheckIn = async () => {
    try {
      const response = await api.get('/client/check-in/today')
      if (response.data.checked_in !== false) {
        setTodayCheckIn(response.data)
        setFormData({
          workout_completed: response.data.workout_completed,
          diet_stuck_to: response.data.diet_stuck_to,
          workout_rating: response.data.workout_rating || null,
          notes: response.data.notes || ''
        })
        setSubmitted(true)
      }
    } catch (error) {
      console.error('Error fetching check-in:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (value === 'true' ? true : value === 'false' ? false : value)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.workout_completed === null || formData.diet_stuck_to === null) {
      setMessage('Please answer both questions')
      return
    }

    if (formData.workout_completed === true && formData.workout_rating === null) {
      setMessage('Please rate your workout')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      await api.post('/client/check-in', formData)
      setSubmitted(true)
      setMessage('Check-in submitted successfully!')
      fetchTodayCheckIn()
    } catch (error) {
      console.error('Error submitting check-in:', error)
      setMessage('Failed to submit check-in')
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  return (
    <div className="check-in-container">
      <div className="check-in-card">
        <h1>Daily Check-In</h1>
        <p className="check-in-date">{today}</p>

        {submitted && todayCheckIn && (
          <div className="submitted-message">
            <h2>✓ Check-in Complete!</h2>
            <div className="check-in-summary">
              <div className="summary-item">
                <strong>Workout:</strong> {todayCheckIn.workout_completed ? '✓ Completed' : '✗ Not completed'}
                {todayCheckIn.workout_rating && (
                  <span className="workout-rating-display">
                    {' '}• Rating: <span className="rating-value">{todayCheckIn.workout_rating}/10</span>
                  </span>
                )}
              </div>
              <div className="summary-item">
                <strong>Diet:</strong> {todayCheckIn.diet_stuck_to ? '✓ Stuck to plan' : '✗ Did not stick to plan'}
              </div>
              {todayCheckIn.notes && (
                <div className="summary-item">
                  <strong>Notes:</strong> {todayCheckIn.notes}
                </div>
              )}
              {todayCheckIn.trainer_response && (
                <div className="trainer-response">
                  <strong>Trainer Response:</strong>
                  <p>{todayCheckIn.trainer_response}</p>
                </div>
              )}
            </div>
            <button onClick={() => {
              setSubmitted(false)
              setFormData({
                workout_completed: todayCheckIn.workout_completed,
                diet_stuck_to: todayCheckIn.diet_stuck_to,
                workout_rating: todayCheckIn.workout_rating || null,
                notes: todayCheckIn.notes || ''
              })
            }} className="btn-edit">
              Edit Check-in
            </button>
          </div>
        )}

        {!submitted && (
          <form onSubmit={handleSubmit}>
            <div className="check-in-questions">
              <div className="question-group">
                <label>Did you complete your workout today? *</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="workout_completed"
                      value="true"
                      checked={formData.workout_completed === true}
                      onChange={handleChange}
                      required
                    />
                    <span>Yes ✓</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="workout_completed"
                      value="false"
                      checked={formData.workout_completed === false}
                      onChange={handleChange}
                      required
                    />
                    <span>No ✗</span>
                  </label>
                </div>
              </div>

              <div className="question-group">
                <label>Did you stick to your diet plan today? *</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="diet_stuck_to"
                      value="true"
                      checked={formData.diet_stuck_to === true}
                      onChange={handleChange}
                      required
                    />
                    <span>Yes ✓</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="diet_stuck_to"
                      value="false"
                      checked={formData.diet_stuck_to === false}
                      onChange={handleChange}
                      required
                    />
                    <span>No ✗</span>
                  </label>
                </div>
              </div>

              {formData.workout_completed === true && (
                <div className="question-group">
                  <label>Rate your workout today (1-10) *</label>
                  <div className="rating-container">
                    <div className="rating-scale">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rating => (
                        <label key={rating} className="rating-option">
                          <input
                            type="radio"
                            name="workout_rating"
                            value={rating}
                            checked={formData.workout_rating === rating}
                            onChange={(e) => setFormData({ ...formData, workout_rating: parseInt(e.target.value) })}
                            required={formData.workout_completed === true}
                          />
                          <span className={`rating-number ${formData.workout_rating === rating ? 'selected' : ''}`}>
                            {rating}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="rating-labels">
                      <span className="rating-label-left">Very Easy</span>
                      <span className="rating-label-right">Very Hard</span>
                    </div>
                    {formData.workout_rating && (
                      <div className="rating-feedback">
                        {formData.workout_rating <= 3 && <span className="rating-text">Easy workout</span>}
                        {formData.workout_rating >= 4 && formData.workout_rating <= 6 && <span className="rating-text">Moderate workout</span>}
                        {formData.workout_rating >= 7 && formData.workout_rating <= 8 && <span className="rating-text">Challenging workout</span>}
                        {formData.workout_rating >= 9 && <span className="rating-text">Extremely challenging</span>}
                      </div>
                    )}
                  </div>
                  <small>This helps your trainer understand the intensity and adjust your program if needed.</small>
                </div>
              )}

              <div className="question-group">
                <label>Notes (optional)</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="4"
                  placeholder="How did it go? Any challenges? What went well?"
                />
                <small>If you didn't complete your workout or stick to your diet, let your trainer know what happened.</small>
              </div>
            </div>

            {message && (
              <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? 'Submitting...' : 'Submit Check-in'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default DailyCheckIn

