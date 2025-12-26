import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Paper, Title, Text, Stack, TextInput, Textarea, Select, Checkbox, Button, Group, Card, NumberInput, Modal } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import api from '../services/api'
import AIRecommendations from '../components/AIRecommendations'
import './WorkoutBuilder.css'

function WorkoutBuilder() {
  const [workoutName, setWorkoutName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [isTemplate, setIsTemplate] = useState(false)
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [recommendationsOpened, { open: openRecommendations, close: closeRecommendations }] = useDisclosure(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const response = await api.get('/trainer/clients')
      setClients(response.data)
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const addExercise = () => {
    setExercises([...exercises, {
      name: '',
      sets: '',
      reps: '',
      weight: '',
      rest: '',
      notes: ''
    }])
  }

  const updateExercise = (index, field, value) => {
    const updated = [...exercises]
    updated[index][field] = value
    setExercises(updated)
  }

  const removeExercise = (index) => {
    setExercises(exercises.filter((_, i) => i !== index))
  }

  const handleApplyRecommendation = (recommendation) => {
    // Add the recommended exercise to the workout
    setExercises([...exercises, {
      name: recommendation.name,
      sets: recommendation.sets || '',
      reps: recommendation.reps || '',
      weight: recommendation.weight || '',
      rest: recommendation.rest || '',
      notes: recommendation.notes || recommendation.reason || ''
    }])
    
    notifications.show({
      title: 'Exercise Added',
      message: `${recommendation.name} has been added to your workout`,
      color: 'green',
    })
    
    closeRecommendations()
  }

  const handleSubmit = async (values) => {
    setLoading(true)

    try {
      await api.post('/trainer/workouts', {
        name: workoutName,
        description,
        category,
        is_template: isTemplate,
        exercises: exercises.filter(ex => ex.name.trim() !== '')
      })
      notifications.show({
        title: 'Workout Created',
        message: 'Workout has been successfully created!',
        color: 'green',
      })
      // If embedded in WorkoutLibrary, refresh the page
      if (window.location.pathname === '/trainer/workouts') {
        window.location.reload()
      } else {
        navigate('/trainer/workouts')
      }
    } catch (error) {
      console.error('Error creating workout:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to create workout',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  // Check if we're embedded in WorkoutLibrary (no Container/Paper needed)
  const isEmbedded = window.location.pathname === '/trainer/workouts'
  
  const content = (
    <div style={{ width: '100%', maxWidth: '100%', padding: isEmbedded ? 0 : 0 }}>
      {!isEmbedded && <Title order={1} mb="xl">Create Workout</Title>}
      {isEmbedded && <Title order={2} mb="xl">Create Workout</Title>}
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} style={{ width: '100%' }}>
          <Stack gap="md" style={{ width: '100%' }}>
            <TextInput
              label="Workout Name"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              required
            />
            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <Select
              label="Category (optional)"
              placeholder="Select category"
              data={['Strength', 'Cardio', 'HIIT', 'Flexibility', 'Full Body', 'Upper Body', 'Lower Body', 'Core']}
              value={category}
              onChange={setCategory}
              withinPortal
            />
            <Checkbox
              label="Save as Template (reusable workout)"
              checked={isTemplate}
              onChange={(e) => setIsTemplate(e.target.checked)}
            />

            <Group gap="md">
              <Select
                label="Select Client (for AI Recommendations)"
                placeholder="Choose a client..."
                data={clients.map(client => {
                  const clientUserId = client.user_id || client.id
                  return {
                    value: clientUserId.toString(),
                    label: `${client.name || 'Client'} (${client.email})`
                  }
                })}
                value={selectedClientId}
                onChange={setSelectedClientId}
                searchable
                withinPortal
                style={{ flex: 1 }}
              />
              <Button 
                type="button"
                onClick={openRecommendations}
                disabled={!selectedClientId}
                color="robinhoodGreen"
                variant="light"
                style={{ marginTop: '1.5rem' }}
              >
                Get AI Recommendations
              </Button>
            </Group>

            <div>
              <Group justify="space-between" mb="md">
                <Title order={3}>Exercises</Title>
                <Button type="button" onClick={addExercise} variant="outline">
                  + Add Exercise
                </Button>
              </Group>

              <Stack gap="md">
                {exercises.map((exercise, index) => (
                  <Card key={index} withBorder p="md">
                    <Group justify="flex-end" mb="xs">
                      <Button type="button" variant="subtle" color="red" size="xs" onClick={() => removeExercise(index)}>
                        Remove
                      </Button>
                    </Group>
                    <Stack gap="sm">
                      <TextInput
                        placeholder="Exercise name"
                        value={exercise.name}
                        onChange={(e) => updateExercise(index, 'name', e.target.value)}
                        required
                      />
                      <Group grow>
                        <NumberInput
                          placeholder="Sets"
                          value={exercise.sets}
                          onChange={(value) => updateExercise(index, 'sets', value)}
                        />
                        <TextInput
                          placeholder="Reps"
                          value={exercise.reps}
                          onChange={(e) => updateExercise(index, 'reps', e.target.value)}
                        />
                        <TextInput
                          placeholder="Weight (optional)"
                          value={exercise.weight}
                          onChange={(e) => updateExercise(index, 'weight', e.target.value)}
                        />
                        <TextInput
                          placeholder="Rest (optional)"
                          value={exercise.rest}
                          onChange={(e) => updateExercise(index, 'rest', e.target.value)}
                        />
                      </Group>
                      <Textarea
                        placeholder="Notes (optional)"
                        value={exercise.notes}
                        onChange={(e) => updateExercise(index, 'notes', e.target.value)}
                        rows={2}
                      />
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </div>

            <Group justify="flex-end">
              <Button type="submit" loading={loading} disabled={exercises.length === 0}>
                Create Workout
              </Button>
            </Group>
          </Stack>
        </form>

        <AIRecommendations
          opened={recommendationsOpened}
          onClose={(recommendation) => {
            if (recommendation) {
              handleApplyRecommendation(recommendation)
            } else {
              closeRecommendations()
            }
          }}
          clientId={selectedClientId}
          currentWorkout={{
            name: workoutName,
            description,
            category,
            exercises
          }}
        />
    </div>
  )

  if (isEmbedded) {
    return content
  }

  return (
    <Container size="lg" py="xl">
      <Paper shadow="md" p="xl" radius="sm" withBorder>
        {content}
      </Paper>
    </Container>
  )
}

export default WorkoutBuilder

