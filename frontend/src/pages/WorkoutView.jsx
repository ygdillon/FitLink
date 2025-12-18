import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Container, Paper, Title, Text, Stack, Card, Badge, Button, Group, Loader, Alert } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import api from '../services/api'
import './WorkoutView.css'

function WorkoutView() {
  const { id } = useParams()
  const [workout, setWorkout] = useState(null)
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    fetchWorkout()
  }, [id])

  const fetchWorkout = async () => {
    try {
      const response = await api.get(`/workouts/${id}`)
      setWorkout(response.data)
    } catch (error) {
      console.error('Error fetching workout:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    try {
      await api.post(`/workouts/${id}/complete`)
      setCompleted(true)
      notifications.show({
        title: 'Workout Completed',
        message: 'Workout has been marked as complete!',
        color: 'green',
      })
    } catch (error) {
      console.error('Error completing workout:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to mark workout as complete',
        color: 'red',
      })
    }
  }

  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader size="lg" />
      </Group>
    )
  }

  if (!workout) {
    return (
      <Container size="md" py="xl">
        <Alert color="red" title="Workout Not Found">
          The requested workout could not be found.
        </Alert>
      </Container>
    )
  }

  return (
    <Container size="md" py="xl">
      <Paper shadow="md" p="xl" radius="md" withBorder>
        <Stack gap="lg">
          <div>
            <Title order={1} mb="xs">{workout.name}</Title>
            {workout.description && (
              <Text c="dimmed">{workout.description}</Text>
            )}
          </div>

          <div>
            <Title order={2} mb="md">Exercises</Title>
            {workout.exercises && workout.exercises.length > 0 ? (
              <Stack gap="md">
                {workout.exercises.map((exercise, index) => (
                  <Card key={index} withBorder p="md">
                    <Stack gap="xs">
                      <Title order={4}>{exercise.name}</Title>
                      <Group gap="md">
                        {exercise.sets && <Badge variant="light">Sets: {exercise.sets}</Badge>}
                        {exercise.reps && <Badge variant="light">Reps: {exercise.reps}</Badge>}
                        {exercise.weight && <Badge variant="light">Weight: {exercise.weight}</Badge>}
                        {exercise.rest && <Badge variant="light">Rest: {exercise.rest}</Badge>}
                      </Group>
                      {exercise.notes && (
                        <Text size="sm" c="dimmed">{exercise.notes}</Text>
                      )}
                    </Stack>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Text c="dimmed">No exercises in this workout</Text>
            )}
          </div>

          {!completed ? (
            <Button onClick={handleComplete} size="lg" fullWidth>
              Mark as Complete
            </Button>
          ) : (
            <Alert color="green" title="Workout Completed">
              ✓ Workout completed!
            </Alert>
          )}
        </Stack>
      </Paper>
    </Container>
  )
}

export default WorkoutView

