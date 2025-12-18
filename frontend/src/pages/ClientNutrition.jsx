import { useState, useEffect } from 'react'
import { Container, Title, Text, Stack, Card, Grid, Progress, Loader, Paper, Group } from '@mantine/core'
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
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader size="lg" />
        </Group>
      </Container>
    )
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
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">My Nutrition</Title>

      {nutritionGoals ? (
        <>
          <Paper p="md" withBorder>
            <Title order={3} mb="md">Daily Goals</Title>
            <Grid>
              <Grid.Col span={6} md={3}>
                <Card withBorder>
                  <Text size="sm" c="dimmed" mb="xs">Calories</Text>
                  <Text size="xl" fw={700}>{nutritionGoals.target_calories || 'Not set'} kcal</Text>
                </Card>
              </Grid.Col>
              <Grid.Col span={6} md={3}>
                <Card withBorder>
                  <Text size="sm" c="dimmed" mb="xs">Protein</Text>
                  <Text size="xl" fw={700}>{nutritionGoals.target_protein || 'Not set'} g</Text>
                </Card>
              </Grid.Col>
              <Grid.Col span={6} md={3}>
                <Card withBorder>
                  <Text size="sm" c="dimmed" mb="xs">Carbs</Text>
                  <Text size="xl" fw={700}>{nutritionGoals.target_carbs || 'Not set'} g</Text>
                </Card>
              </Grid.Col>
              <Grid.Col span={6} md={3}>
                <Card withBorder>
                  <Text size="sm" c="dimmed" mb="xs">Fats</Text>
                  <Text size="xl" fw={700}>{nutritionGoals.target_fats || 'Not set'} g</Text>
                </Card>
              </Grid.Col>
            </Grid>
          </Paper>

          <Paper p="md" withBorder>
            <Title order={3} mb="md">Today's Progress</Title>
            <Stack gap="md">
              <div>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>Calories</Text>
                  <Text size="sm">
                    {todayTotals.calories.toFixed(0)} / {nutritionGoals.target_calories || 0} kcal
                  </Text>
                </Group>
                <Progress 
                  value={Math.min(100, (todayTotals.calories / (nutritionGoals.target_calories || 1)) * 100)} 
                  color="green"
                />
              </div>
              <div>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>Protein</Text>
                  <Text size="sm">
                    {todayTotals.protein.toFixed(1)} / {nutritionGoals.target_protein || 0} g
                  </Text>
                </Group>
                <Progress 
                  value={Math.min(100, (todayTotals.protein / (nutritionGoals.target_protein || 1)) * 100)} 
                  color="blue"
                />
              </div>
              <div>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>Carbs</Text>
                  <Text size="sm">
                    {todayTotals.carbs.toFixed(1)} / {nutritionGoals.target_carbs || 0} g
                  </Text>
                </Group>
                <Progress 
                  value={Math.min(100, (todayTotals.carbs / (nutritionGoals.target_carbs || 1)) * 100)} 
                  color="orange"
                />
              </div>
              <div>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>Fats</Text>
                  <Text size="sm">
                    {todayTotals.fats.toFixed(1)} / {nutritionGoals.target_fats || 0} g
                  </Text>
                </Group>
                <Progress 
                  value={Math.min(100, (todayTotals.fats / (nutritionGoals.target_fats || 1)) * 100)} 
                  color="yellow"
                />
              </div>
            </Stack>
          </Paper>
        </>
      ) : (
        <Paper p="xl" withBorder>
          <Stack gap="xs" align="center">
            <Text c="dimmed">No nutrition goals set yet</Text>
            <Text size="sm" c="dimmed">Your trainer will set nutrition goals for you</Text>
          </Stack>
        </Paper>
      )}
    </Container>
  )
}

export default ClientNutrition
