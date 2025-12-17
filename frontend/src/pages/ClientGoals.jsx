import { useState } from 'react'
import api from '../services/api'
import './ClientGoals.css'

function ClientGoals({ clientId, client, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    primary_goal: client.primary_goal || '',
    goal_target: client.goal_target || '',
    goal_timeframe: client.goal_timeframe || '',
    secondary_goals: Array.isArray(client.secondary_goals) ? client.secondary_goals : []
  })
  const [newSecondaryGoal, setNewSecondaryGoal] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await api.put(`/trainer/clients/${clientId}/onboarding`, formData)
      setIsEditing(false)
      onUpdate() // Refresh client data
      alert('Goals updated successfully!')
    } catch (error) {
      console.error('Error updating goals:', error)
      alert('Failed to update goals')
    } finally {
      setLoading(false)
    }
  }

  const addSecondaryGoal = () => {
    if (newSecondaryGoal.trim()) {
      setFormData(prev => ({
        ...prev,
        secondary_goals: [...prev.secondary_goals, newSecondaryGoal.trim()]
      }))
      setNewSecondaryGoal('')
    }
  }

  const removeSecondaryGoal = (index) => {
    setFormData(prev => ({
      ...prev,
      secondary_goals: prev.secondary_goals.filter((_, i) => i !== index)
    }))
  }

  if (!client.primary_goal && !isEditing) {
    return (
      <div className="client-goals-container">
        <div className="no-goal-warning">
          <h2>⚠️ No Goal Set</h2>
          <p>This client doesn't have a goal set yet. Setting a clear goal is essential for tracking progress and success.</p>
          <button onClick={() => setIsEditing(true)} className="btn-primary">
            Set Client Goal
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="client-goals-container">
      <div className="goals-header">
        <h2>Client Goals</h2>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="btn-edit-goal">
            Edit Goals
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="goals-form">
          <div className="form-section">
            <h3>Primary Goal *</h3>
            <div className="form-group">
              <label>Goal Type *</label>
              <select
                value={formData.primary_goal}
                onChange={(e) => setFormData({ ...formData, primary_goal: e.target.value })}
                required
              >
                <option value="">Select a goal...</option>
                <option value="weight_loss">Weight Loss</option>
                <option value="muscle_gain">Muscle Gain</option>
                <option value="tone_and_strengthen">Tone & Strengthen</option>
                <option value="improve_strength">Improve Strength</option>
                <option value="improve_cardio">Improve Cardio</option>
                <option value="improve_flexibility">Improve Flexibility</option>
                <option value="improve_performance">Improve Performance</option>
                <option value="build_habits">Build Healthy Habits</option>
                <option value="increase_energy">Increase Energy</option>
                <option value="reduce_stress">Reduce Stress</option>
              </select>
            </div>
            <div className="form-group">
              <label>Target *</label>
              <input
                type="text"
                value={formData.goal_target}
                onChange={(e) => setFormData({ ...formData, goal_target: e.target.value })}
                required
                placeholder="e.g., Lose 20 lbs, Gain 10 lbs muscle, Bench 225 lbs"
              />
            </div>
            <div className="form-group">
              <label>Timeframe *</label>
              <input
                type="text"
                value={formData.goal_timeframe}
                onChange={(e) => setFormData({ ...formData, goal_timeframe: e.target.value })}
                required
                placeholder="e.g., 3 months, 6 months, 1 year"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Secondary Goals</h3>
            <div className="secondary-goals-input">
              <input
                type="text"
                value={newSecondaryGoal}
                onChange={(e) => setNewSecondaryGoal(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSecondaryGoal())}
                placeholder="Add a secondary goal..."
              />
              <button type="button" onClick={addSecondaryGoal} className="btn-add-goal">
                Add
              </button>
            </div>
            {formData.secondary_goals.length > 0 && (
              <div className="secondary-goals-list">
                {formData.secondary_goals.map((goal, index) => (
                  <div key={index} className="secondary-goal-tag">
                    {goal}
                    <button
                      type="button"
                      onClick={() => removeSecondaryGoal(index)}
                      className="btn-remove-tag"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => {
              setIsEditing(false)
              setFormData({
                primary_goal: client.primary_goal || '',
                goal_target: client.goal_target || '',
                goal_timeframe: client.goal_timeframe || '',
                secondary_goals: Array.isArray(client.secondary_goals) ? client.secondary_goals : []
              })
            }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : 'Save Goals'}
            </button>
          </div>
        </form>
      ) : (
        <div className="goals-display">
          <div className="primary-goal-card">
            <div className="goal-header">
              <h3>Primary Goal</h3>
              <span className="goal-type-badge">
                {client.primary_goal ? client.primary_goal.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not Set'}
              </span>
            </div>
            {client.goal_target && (
              <div className="goal-detail">
                <strong>Target:</strong> {client.goal_target}
              </div>
            )}
            {client.goal_timeframe && (
              <div className="goal-detail">
                <strong>Timeframe:</strong> {client.goal_timeframe}
              </div>
            )}
            {client.goal_target && client.goal_timeframe && (
              <div className="goal-summary">
                <strong>Goal Summary:</strong> {client.goal_target} in {client.goal_timeframe}
              </div>
            )}
          </div>

          {client.secondary_goals && Array.isArray(client.secondary_goals) && client.secondary_goals.length > 0 && (
            <div className="secondary-goals-section">
              <h3>Secondary Goals</h3>
              <div className="secondary-goals-grid">
                {client.secondary_goals.map((goal, index) => (
                  <div key={index} className="secondary-goal-card">
                    {goal}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!client.secondary_goals || client.secondary_goals.length === 0) && (
            <div className="no-secondary-goals">
              <p>No secondary goals set. Click "Edit Goals" to add some.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ClientGoals

