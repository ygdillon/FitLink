import { useState, useEffect } from 'react'
import api from '../services/api'
import './ClientNutrition.css'

function ClientNutrition() {
  const [nutritionGoals, setNutritionGoals] = useState(null)
  const [nutritionLogs, setNutritionLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNutritionData()
  }, [])

  const fetchNutritionData = async () => {
    try {
      const [goalsRes, logsRes] = await Promise.all([
        api.get('/client/nutrition/goals').catch(() => ({ data: null })),
        api.get('/client/nutrition/logs').catch(() => ({ data: [] }))
      ])
      
      setNutritionGoals(goalsRes.data)
      setNutritionLogs(logsRes.data || [])
    } catch (error) {
      console.error('Error fetching nutrition data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="client-nutrition-container">Loading...</div>
  }

  // Calculate today's totals from logs
  const today = new Date().toISOString().split('T')[0]
  const todayLogs = nutritionLogs.filter(log => log.log_date === today)
  const todayTotals = todayLogs.reduce((acc, log) => ({
    calories: acc.calories + (parseFloat(log.calories) || 0),
    protein: acc.protein + (parseFloat(log.protein) || 0),
    carbs: acc.carbs + (parseFloat(log.carbs) || 0),
    fats: acc.fats + (parseFloat(log.fats) || 0)
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 })

  return (
    <div className="client-nutrition-container">
      <div className="nutrition-header">
        <h1>My Nutrition</h1>
      </div>

      {nutritionGoals ? (
        <>
          <div className="nutrition-goals-section">
            <h2>Daily Goals</h2>
            <div className="goals-grid">
              <div className="goal-card">
                <div className="goal-label">Calories</div>
                <div className="goal-value">{nutritionGoals.target_calories || 'Not set'} kcal</div>
              </div>
              <div className="goal-card">
                <div className="goal-label">Protein</div>
                <div className="goal-value">{nutritionGoals.target_protein || 'Not set'} g</div>
              </div>
              <div className="goal-card">
                <div className="goal-label">Carbs</div>
                <div className="goal-value">{nutritionGoals.target_carbs || 'Not set'} g</div>
              </div>
              <div className="goal-card">
                <div className="goal-label">Fats</div>
                <div className="goal-value">{nutritionGoals.target_fats || 'Not set'} g</div>
              </div>
            </div>
          </div>

          <div className="today-progress-section">
            <h2>Today's Progress</h2>
            <div className="progress-grid">
              <div className="progress-item">
                <div className="progress-label">Calories</div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${Math.min(100, (todayTotals.calories / (nutritionGoals.target_calories || 1)) * 100)}%` 
                    }}
                  />
                </div>
                <div className="progress-text">
                  {todayTotals.calories.toFixed(0)} / {nutritionGoals.target_calories || 0} kcal
                </div>
              </div>
              <div className="progress-item">
                <div className="progress-label">Protein</div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${Math.min(100, (todayTotals.protein / (nutritionGoals.target_protein || 1)) * 100)}%` 
                    }}
                  />
                </div>
                <div className="progress-text">
                  {todayTotals.protein.toFixed(1)} / {nutritionGoals.target_protein || 0} g
                </div>
              </div>
              <div className="progress-item">
                <div className="progress-label">Carbs</div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${Math.min(100, (todayTotals.carbs / (nutritionGoals.target_carbs || 1)) * 100)}%` 
                    }}
                  />
                </div>
                <div className="progress-text">
                  {todayTotals.carbs.toFixed(1)} / {nutritionGoals.target_carbs || 0} g
                </div>
              </div>
              <div className="progress-item">
                <div className="progress-label">Fats</div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${Math.min(100, (todayTotals.fats / (nutritionGoals.target_fats || 1)) * 100)}%` 
                    }}
                  />
                </div>
                <div className="progress-text">
                  {todayTotals.fats.toFixed(1)} / {nutritionGoals.target_fats || 0} g
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <p>No nutrition goals set yet</p>
          <p className="empty-hint">Your trainer will set nutrition goals for you</p>
        </div>
      )}
    </div>
  )
}

export default ClientNutrition
