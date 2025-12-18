import { useState, useEffect } from 'react'
import { Container, Title, Text, Stack, Card, Badge, Button, Group, Loader, Paper, SimpleGrid } from '@mantine/core'
import { Link } from 'react-router-dom'
import api from '../services/api'
import './ClientWorkouts.css'

function ClientWorkouts() {
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWorkouts()
  }, [])

  const fetchWorkouts = async () => {
    try {
      const response = await api.get('/client/workouts')
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
      <Title order={1} mb="xl">My Workouts</Title>

      {workouts.length === 0 ? (
        <Paper p="xl" withBorder>
          <Stack gap="xs" align="center">
            <Text c="dimmed">No workouts assigned yet</Text>
            <Text size="sm" c="dimmed">Your trainer will assign workouts for you</Text>
          </Stack>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {workouts.map(workout => (
            <Card key={workout.id} shadow="sm" padding="lg" radius="md" withBorder>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Title order={4}>{workout.name}</Title>
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
                <Button component={Link} to={`/workout/${workout.id}`} variant="light" fullWidth>
                  View Workout →
                </Button>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Container>
  )
}

export default ClientWorkouts
