import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import './ClientOnboarding.css'

function ClientOnboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    // Basic Info
    height: '',
    weight: '',
    gender: '',
    age: '',
    location: '',
    
    // Workout Experience
    previous_experience: '',
    activity_level: '',
    available_dates: [],
    
    // Goals
    primary_goal: '',
    goal_target: '',
    goal_timeframe: '',
    secondary_goals: [],
    
    // Nutrition
    nutrition_habits: '',
    nutrition_experience: '',
    average_daily_eating: '',
    
    // Health & Lifestyle
    injuries: '',
    sleep_hours: '',
    stress_level: '',
    lifestyle_activity: '',
    
    // Psychological
    psychological_barriers: '',
    mindset: '',
    motivation_why: '',
    
    // Preferences
    training_preference: '',
    communication_preference: '',
    barriers: ''
  })

  useEffect(() => {
    // Check if already completed
    checkOnboardingStatus()
  }, [])

  const checkOnboardingStatus = async () => {
    try {
      const response = await api.get('/client/profile/onboarding-status')
      if (response.data.onboarding_completed) {
        navigate('/client')
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    
    if (type === 'checkbox') {
      const arrayField = formData[name] || []
      if (checked) {
        setFormData({ ...formData, [name]: [...arrayField, value] })
      } else {
        setFormData({ ...formData, [name]: arrayField.filter(item => item !== value) })
      }
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleDateChange = (day, time) => {
    const dates = formData.available_dates || []
    const key = `${day}-${time}`
    const exists = dates.find(d => d.day === day && d.time === time)
    
    if (exists) {
      setFormData({
        ...formData,
        available_dates: dates.filter(d => !(d.day === day && d.time === time))
      })
    } else {
      setFormData({
        ...formData,
        available_dates: [...dates, { day, time }]
      })
    }
  }

  const handleNext = () => {
    setError('')
    // Basic validation
    if (step === 1 && (!formData.height || !formData.weight || !formData.gender || !formData.age || !formData.location)) {
      setError('Please fill in all basic information fields')
      return
    }
    if (step === 2 && (!formData.previous_experience || !formData.activity_level)) {
      setError('Please fill in workout experience fields')
      return
    }
    if (step === 3 && (!formData.primary_goal || !formData.goal_target || !formData.goal_timeframe)) {
      setError('Please fill in all goal fields')
      return
    }
    if (step === 4 && (!formData.nutrition_habits || !formData.nutrition_experience)) {
      setError('Please fill in nutrition information')
      return
    }
    if (step === 5 && (!formData.sleep_hours || !formData.stress_level || !formData.lifestyle_activity)) {
      setError('Please fill in lifestyle information')
      return
    }
    if (step === 6 && (!formData.mindset || !formData.motivation_why)) {
      setError('Please fill in psychological factors')
      return
    }
    
    setStep(step + 1)
  }

  const handleBack = () => {
    setStep(step - 1)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await api.put('/client/profile', formData)
      navigate('/client')
    } catch (err) {
      console.error('Error saving profile:', err)
      setError(err.response?.data?.message || 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  const totalSteps = 7

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <h1>Complete Your Profile</h1>
        <p className="onboarding-subtitle">Help trainers understand your needs and goals</p>
        
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
        </div>
        <div className="step-indicator">
          Step {step} of {totalSteps}
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={step === totalSteps ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="onboarding-step">
              <h2>Basic Information</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Height (inches) *</label>
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleChange}
                    placeholder="e.g., 70"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Weight (lbs) *</label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    placeholder="e.g., 180"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Gender *</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} required>
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Age *</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="e.g., 30"
                    min="13"
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <label>Where do you live? (City, State) *</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g., New York, NY"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Workout Experience */}
          {step === 2 && (
            <div className="onboarding-step">
              <h2>Workout Experience</h2>
              <div className="form-group">
                <label>How much workout experience do you have? *</label>
                <textarea
                  name="previous_experience"
                  value={formData.previous_experience}
                  onChange={handleChange}
                  placeholder="Describe your fitness background, any gym experience, sports, etc."
                  rows="4"
                  required
                />
              </div>
              <div className="form-group">
                <label>Current Activity Level *</label>
                <select name="activity_level" value={formData.activity_level} onChange={handleChange} required>
                  <option value="">Select...</option>
                  <option value="sedentary">Sedentary (little to no exercise)</option>
                  <option value="light">Light (exercise 1-3 days/week)</option>
                  <option value="moderate">Moderate (exercise 3-5 days/week)</option>
                  <option value="active">Active (exercise 6-7 days/week)</option>
                  <option value="very_active">Very Active (intense exercise daily)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Available Days & Times</label>
                <div className="available-dates-grid">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <div key={day} className="day-group">
                      <strong>{day}</strong>
                      {['Morning (6-9 AM)', 'Midday (9 AM-12 PM)', 'Afternoon (12-5 PM)', 'Evening (5-9 PM)'].map(time => (
                        <label key={time} className="date-checkbox">
                          <input
                            type="checkbox"
                            checked={formData.available_dates?.some(d => d.day === day && d.time === time)}
                            onChange={() => handleDateChange(day, time)}
                          />
                          <span>{time}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Goals */}
          {step === 3 && (
            <div className="onboarding-step">
              <h2>Your Goals</h2>
              <div className="form-group">
                <label>Primary Goal *</label>
                <select name="primary_goal" value={formData.primary_goal} onChange={handleChange} required>
                  <option value="">Select...</option>
                  <option value="lose_weight">Lose Weight</option>
                  <option value="gain_muscle">Gain Muscle</option>
                  <option value="improve_strength">Improve Strength</option>
                  <option value="improve_endurance">Improve Endurance</option>
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
                  placeholder="e.g., Lose 20 lbs, Gain 10 lbs muscle, Run a 5K"
                  required
                />
              </div>
              <div className="form-group">
                <label>Goal Timeframe *</label>
                <input
                  type="text"
                  name="goal_timeframe"
                  value={formData.goal_timeframe}
                  onChange={handleChange}
                  placeholder="e.g., 3 months, 6 months, 1 year"
                  required
                />
              </div>
              <div className="form-group">
                <label>Secondary Goals (select all that apply)</label>
                <div className="checkbox-group">
                  {['Improve flexibility', 'Better posture', 'Increase energy', 'Reduce stress', 'Build confidence', 'Better sleep'].map(goal => (
                    <label key={goal} className="checkbox-label">
                      <input
                        type="checkbox"
                        name="secondary_goals"
                        value={goal}
                        checked={formData.secondary_goals?.includes(goal)}
                        onChange={handleChange}
                      />
                      <span>{goal}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Nutrition */}
          {step === 4 && (
            <div className="onboarding-step">
              <h2>Nutrition</h2>
              <div className="form-group">
                <label>Current Nutrition Habits *</label>
                <textarea
                  name="nutrition_habits"
                  value={formData.nutrition_habits}
                  onChange={handleChange}
                  placeholder="Describe your current eating patterns, meal frequency, typical foods, etc."
                  rows="4"
                  required
                />
              </div>
              <div className="form-group">
                <label>Nutrition/Dieting Experience *</label>
                <textarea
                  name="nutrition_experience"
                  value={formData.nutrition_experience}
                  onChange={handleChange}
                  placeholder="Have you tried dieting before? What worked? What didn't?"
                  rows="4"
                  required
                />
              </div>
              <div className="form-group">
                <label>Average Daily Eating</label>
                <textarea
                  name="average_daily_eating"
                  value={formData.average_daily_eating}
                  onChange={handleChange}
                  placeholder="Describe a typical day of eating for you"
                  rows="3"
                />
              </div>
            </div>
          )}

          {/* Step 5: Health & Lifestyle */}
          {step === 5 && (
            <div className="onboarding-step">
              <h2>Health & Lifestyle</h2>
              <div className="form-group">
                <label>Injuries or Limitations</label>
                <textarea
                  name="injuries"
                  value={formData.injuries}
                  onChange={handleChange}
                  placeholder="List any injuries, physical limitations, or health concerns (leave blank if none)"
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Average Hours of Sleep per Night *</label>
                <input
                  type="number"
                  name="sleep_hours"
                  value={formData.sleep_hours}
                  onChange={handleChange}
                  placeholder="e.g., 7"
                  min="0"
                  max="12"
                  required
                />
              </div>
              <div className="form-group">
                <label>Stress Level *</label>
                <select name="stress_level" value={formData.stress_level} onChange={handleChange} required>
                  <option value="">Select...</option>
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="form-group">
                <label>Lifestyle Activity Description *</label>
                <textarea
                  name="lifestyle_activity"
                  value={formData.lifestyle_activity}
                  onChange={handleChange}
                  placeholder="Describe your daily routine, job activity level, hobbies, etc."
                  rows="4"
                  required
                />
              </div>
            </div>
          )}

          {/* Step 6: Psychological Factors */}
          {step === 6 && (
            <div className="onboarding-step">
              <h2>Psychological Factors</h2>
              <div className="form-group">
                <label>Psychological Barriers *</label>
                <textarea
                  name="psychological_barriers"
                  value={formData.psychological_barriers}
                  onChange={handleChange}
                  placeholder="What has kept you from achieving your fitness goals? (fear, lack of time, motivation, etc.)"
                  rows="4"
                  required
                />
              </div>
              <div className="form-group">
                <label>Current Mindset *</label>
                <textarea
                  name="mindset"
                  value={formData.mindset}
                  onChange={handleChange}
                  placeholder="How do you feel about fitness and your ability to achieve your goals?"
                  rows="4"
                  required
                />
              </div>
              <div className="form-group">
                <label>Your "Why" - Motivation *</label>
                <textarea
                  name="motivation_why"
                  value={formData.motivation_why}
                  onChange={handleChange}
                  placeholder="Why do you want to get fit? What's driving you? What will success look like?"
                  rows="4"
                  required
                />
              </div>
            </div>
          )}

          {/* Step 7: Preferences */}
          {step === 7 && (
            <div className="onboarding-step">
              <h2>Training Preferences</h2>
              <div className="form-group">
                <label>Training Preference *</label>
                <select name="training_preference" value={formData.training_preference} onChange={handleChange} required>
                  <option value="">Select...</option>
                  <option value="in-person">In-Person</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid (Both)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Communication Preference *</label>
                <select name="communication_preference" value={formData.communication_preference} onChange={handleChange} required>
                  <option value="">Select...</option>
                  <option value="daily">Daily</option>
                  <option value="few_times_week">Few Times a Week</option>
                  <option value="weekly">Weekly</option>
                  <option value="as_needed">As Needed</option>
                </select>
              </div>
              <div className="form-group">
                <label>What barriers have kept you from the gym?</label>
                <textarea
                  name="barriers"
                  value={formData.barriers}
                  onChange={handleChange}
                  placeholder="Time constraints, cost, intimidation, etc."
                  rows="3"
                />
              </div>
            </div>
          )}

          <div className="form-actions">
            {step > 1 && (
              <button type="button" onClick={handleBack} className="btn-back">
                Back
              </button>
            )}
            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? 'Saving...' : step === totalSteps ? 'Complete Profile' : 'Next'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ClientOnboarding

