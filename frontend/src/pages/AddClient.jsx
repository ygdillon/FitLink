import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import './AddClient.css'

function AddClient() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    email: '',
    password: '',
    
    // Physical Info
    height: '',
    weight: '',
    gender: '',
    age: '',
    
    // Experience & Lifestyle
    previous_experience: '',
    average_daily_eating: '',
    
    // Goals
    primary_goal: '',
    goal_target: '',
    goal_timeframe: '',
    secondary_goals: [],
    
    // Barriers & Preferences
    barriers: '',
    training_preference: 'online',
    communication_preference: 'daily'
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSecondaryGoalAdd = () => {
    const goal = prompt('Enter secondary goal:')
    if (goal) {
      setFormData(prev => ({
        ...prev,
        secondary_goals: [...prev.secondary_goals, goal]
      }))
    }
  }

  const handleSecondaryGoalRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      secondary_goals: prev.secondary_goals.filter((_, i) => i !== index)
    }))
  }

  const handleNext = () => {
    if (step === 1 && (!formData.name || !formData.email)) {
      setError('Name and email are required')
      return
    }
    if (step === 2 && (!formData.height || !formData.weight || !formData.gender)) {
      setError('Height, weight, and gender are required')
      return
    }
    if (step === 3 && (!formData.primary_goal || !formData.goal_target || !formData.goal_timeframe)) {
      setError('Primary goal, target, and timeframe are required')
      return
    }
    setError('')
    setStep(step + 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await api.post('/trainer/clients', {
        ...formData,
        onboarding_data: formData
      })
      navigate('/trainer')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add client')
      console.error('Error adding client:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="add-client-container">
      <div className="add-client-card">
        <h1>Add New Client</h1>
        <div className="progress-steps">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Basic Info</div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Physical Info</div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Goals</div>
          <div className={`step ${step >= 4 ? 'active' : ''}`}>4. Preferences</div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="form-step">
              <h2>Basic Information</h2>
              <div className="form-group">
                <label>Client Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="john@example.com"
                />
              </div>
              <div className="form-group">
                <label>Password (optional - will generate if not provided)</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Leave empty to auto-generate"
                />
              </div>
            </div>
          )}

          {/* Step 2: Physical Information */}
          {step === 2 && (
            <div className="form-step">
              <h2>Physical Information</h2>
              <div className="form-row">
                <div className="form-group">
                  <label>Height (inches) *</label>
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleChange}
                    required
                    step="0.1"
                    placeholder="70"
                  />
                </div>
                <div className="form-group">
                  <label>Weight (lbs) *</label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    required
                    step="0.1"
                    placeholder="180"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Gender *</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Age</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="30"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Goals */}
          {step === 3 && (
            <div className="form-step">
              <h2>Goals & Experience</h2>
              <div className="form-group">
                <label>Previous Gym Experience</label>
                <textarea
                  name="previous_experience"
                  value={formData.previous_experience}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Describe their previous experience with fitness, gym, training..."
                />
              </div>
              <div className="form-group">
                <label>Average Daily Eating Habits</label>
                <textarea
                  name="average_daily_eating"
                  value={formData.average_daily_eating}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Describe their typical daily eating patterns..."
                />
              </div>
              <div className="form-group">
                <label>Primary Goal *</label>
                <select
                  name="primary_goal"
                  value={formData.primary_goal}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select primary goal...</option>
                  <option value="weight_loss">Weight Loss</option>
                  <option value="muscle_gain">Muscle Gain</option>
                  <option value="strength">Strength Training</option>
                  <option value="endurance">Endurance</option>
                  <option value="general_fitness">General Fitness</option>
                  <option value="athletic_performance">Athletic Performance</option>
                  <option value="rehabilitation">Rehabilitation</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Goal Target *</label>
                <input
                  type="text"
                  name="goal_target"
                  value={formData.goal_target}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Lose 20 lbs, Gain 10 lbs muscle, Bench 225 lbs"
                />
              </div>
              <div className="form-group">
                <label>Goal Timeframe *</label>
                <input
                  type="text"
                  name="goal_timeframe"
                  value={formData.goal_timeframe}
                  onChange={handleChange}
                  required
                  placeholder="e.g., 3 months, 6 months, 1 year"
                />
              </div>
              <div className="form-group">
                <label>Secondary Goals</label>
                <div className="secondary-goals-list">
                  {formData.secondary_goals.map((goal, index) => (
                    <div key={index} className="secondary-goal-item">
                      <span>{goal}</span>
                      <button
                        type="button"
                        onClick={() => handleSecondaryGoalRemove(index)}
                        className="btn-remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleSecondaryGoalAdd}
                    className="btn-add-goal"
                  >
                    + Add Secondary Goal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Barriers & Preferences */}
          {step === 4 && (
            <div className="form-step">
              <h2>Barriers & Preferences</h2>
              <div className="form-group">
                <label>What has kept them from the gym until now? *</label>
                <textarea
                  name="barriers"
                  value={formData.barriers}
                  onChange={handleChange}
                  required
                  rows="3"
                  placeholder="Lack of time, motivation, feeling uncomfortable, etc."
                />
              </div>
              <div className="form-group">
                <label>Training Preference *</label>
                <select
                  name="training_preference"
                  value={formData.training_preference}
                  onChange={handleChange}
                  required
                >
                  <option value="online">Online</option>
                  <option value="in-person">In-Person</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div className="form-group">
                <label>Communication Preference *</label>
                <select
                  name="communication_preference"
                  value={formData.communication_preference}
                  onChange={handleChange}
                  required
                >
                  <option value="daily">Daily Check-ins</option>
                  <option value="weekly">Weekly Check-ins</option>
                  <option value="as-needed">As Needed</option>
                </select>
                <small>For online training, daily contact is recommended for better accountability</small>
              </div>
            </div>
          )}

          <div className="form-actions">
            {step > 1 && (
              <button type="button" onClick={() => setStep(step - 1)} className="btn-secondary">
                Previous
              </button>
            )}
            {step < 4 ? (
              <button type="button" onClick={handleNext} className="btn-primary">
                Next
              </button>
            ) : (
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Adding Client...' : 'Add Client'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddClient

