import { useState, useEffect } from 'react'
import { Container, Title, Text, Stack, Card, Badge, Button, Group, Loader, Paper, SimpleGrid } from '@mantine/core'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './ClientWorkouts.css'

function ClientWorkouts({ clientId, clientName }) {
  const { user } = useAuth()
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Determine if this is trainer view (has clientId prop) or client view
  const isTrainerView = !!clientId

  useEffect(() => {
    if (clientId || user?.role === 'client') {
      fetchWorkouts()
    }
  }, [clientId, user?.role])

  const fetchWorkouts = async () => {
    try {
      let response
      if (isTrainerView) {
        // Trainer viewing a specific client's workouts
        response = await api.get(`/trainer/clients/${clientId}/workouts`)
      } else {
        // Client viewing their own workouts
        response = await api.get('/client/workouts')
      }
      setWorkouts(response.data)
    } catch (error) {
      console.error('Error fetching workouts:', error)
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

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">{isTrainerView ? `${clientName}'s Workouts` : 'My Workouts'}</Title>

      {workouts.length === 0 ? (
        <Paper p="xl" withBorder>
          <Stack gap="xs" align="center">
            <Text c="dimmed">No workouts assigned yet</Text>
            {isTrainerView ? (
              <Text size="sm" c="dimmed">Assign workouts to this client from the Workouts section</Text>
            ) : (
              <Text size="sm" c="dimmed">Your trainer will assign workouts for you</Text>
            )}
          </Stack>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {workouts.map(workout => {
            // Handle both workout_name (from trainer endpoint) and name (from client endpoint)
            const workoutName = workout.workout_name || workout.name
            const workoutId = workout.workout_id || workout.id
            return (
              <Card key={workout.id} shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Title order={4}>{workoutName}</Title>
                    <Badge color={workout.status === 'completed' ? 'green' : 'blue'}>
                      {workout.status || 'assigned'}
                    </Badge>
                  </Group>
                  {workout.description && (
                    <Text size="sm" c="dimmed">{workout.description}</Text>
                  )}
                  <Group gap="md">
                    {workout.assigned_date && (
                      <Text size="xs" c="dimmed">
                        Assigned: {new Date(workout.assigned_date).toLocaleDateString()}
                      </Text>
                    )}
                    {workout.due_date && (
                      <Text size="xs" c="dimmed">
                        Due: {new Date(workout.due_date).toLocaleDateString()}
                      </Text>
                    )}
                  </Group>
                  <Button component={Link} to={`/workout/${workoutId}`} variant="light" fullWidth>
                    View Workout →
                  </Button>
                </Stack>
              </Card>
            )
          })}
        </SimpleGrid>
      )}
    </Container>
  )
}

export default ClientWorkouts
