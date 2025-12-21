import { useState, useEffect } from 'react'
import { 
  Paper, 
  Title, 
  Text, 
  Stack, 
  Select, 
  NumberInput, 
  Textarea, 
  Button, 
  Group, 
  Loader, 
  Alert, 
  Card, 
  Badge,
  Divider,
  SimpleGrid
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import api from '../services/api'

function AIWorkoutGenerator({ onWorkoutGenerated, onCancel }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedWorkout, setGeneratedWorkout] = useState(null)
  const [formData, setFormData] = useState({
    clientId: '',
    duration: 60,
    intensity: 'moderate',
    focus: 'full body',
    equipment: 'gym',
    notes: ''
  })

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const response = await api.get('/trainer/clients')
      setClients(response.data)
    } catch (error) {
      console.error('Error fetching clients:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load clients',
        color: 'red',
      })
    }
  }

  const handleGenerate = async () => {
    if (!formData.clientId) {
      notifications.show({
        title: 'Error',
        message: 'Please select a client',
        color: 'red',
      })
      return
    }

    setGenerating(true)
    try {
      const response = await api.post('/trainer/workouts/ai/generate', {
        clientId: formData.clientId,
        workoutPreferences: {
          duration: formData.duration,
          intensity: formData.intensity,
          focus: formData.focus,
          equipment: formData.equipment,
          notes: formData.notes
        }
      })

      setGeneratedWorkout(response.data)
      notifications.show({
        title: 'Success',
        message: 'Workout generated successfully!',
        color: 'green',
      })
    } catch (error) {
      console.error('Error generating workout:', error)
      const errorData = error.response?.data || {}
      const errorMessage = errorData.message || 'Failed to generate workout'
      
      if (errorData.error === 'OPENAI_AUTH_ERROR') {
        notifications.show({
          title: 'Configuration Error',
          message: 'AI service is not configured. Please check your API key.',
          color: 'red',
        })
      } else if (errorData.error === 'INSUFFICIENT_QUOTA' || error.response?.status === 429) {
        notifications.show({
          title: 'Quota Exceeded',
          message: 'Your OpenAI account has run out of credits. Please add credits to continue.',
          color: 'orange',
          autoClose: 10000,
        })
        // Show additional help
        setTimeout(() => {
          notifications.show({
            title: 'How to Add Credits',
            message: 'Visit https://platform.openai.com/account/billing to add credits to your OpenAI account.',
            color: 'blue',
            autoClose: 15000,
          })
        }, 2000)
      } else if (errorData.error === 'MODEL_NOT_FOUND') {
        notifications.show({
          title: 'Model Not Available',
          message: 'The AI model is not available with your current API key.',
          color: 'red',
        })
      } else {
        notifications.show({
          title: 'Error',
          message: errorMessage,
          color: 'red',
        })
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = () => {
    if (generatedWorkout && onWorkoutGenerated) {
      onWorkoutGenerated(generatedWorkout)
    }
  }

  const handleRegenerate = () => {
    setGeneratedWorkout(null)
    handleGenerate()
  }

  const selectedClient = clients.find(c => {
    const clientUserId = c.user_id || c.id
    return clientUserId.toString() === formData.clientId
  })

  if (generatedWorkout) {
    return (
      <Paper p="xl" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Title order={3}>{generatedWorkout.name}</Title>
              <Badge color="blue" mt="xs">AI Generated</Badge>
            </div>
            <Group>
              <Button variant="outline" onClick={handleRegenerate} loading={generating}>
                Regenerate
              </Button>
              <Button onClick={handleSave}>
                Save Workout
              </Button>
              {onCancel && (
                <Button variant="subtle" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </Group>
          </Group>

          {generatedWorkout.description && (
            <Text c="dimmed">{generatedWorkout.description}</Text>
          )}

          <Divider />

          <Title order={4}>Exercises</Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {generatedWorkout.exercises.map((exercise, index) => (
              <Card key={index} withBorder p="md">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text fw={600}>{exercise.name}</Text>
                    <Badge variant="light" size="sm">Exercise {index + 1}</Badge>
                  </Group>
                  <Group gap="md">
                    {exercise.sets && (
                      <Text size="sm">
                        <strong>Sets:</strong> {exercise.sets}
                      </Text>
                    )}
                    {exercise.reps && (
                      <Text size="sm">
                        <strong>Reps:</strong> {exercise.reps}
                      </Text>
                    )}
                    {exercise.weight && (
                      <Text size="sm">
                        <strong>Weight:</strong> {exercise.weight}
                      </Text>
                    )}
                    {exercise.rest && (
                      <Text size="sm">
                        <strong>Rest:</strong> {exercise.rest}
                      </Text>
                    )}
                  </Group>
                  {exercise.notes && (
                    <Text size="sm" c="dimmed" mt="xs">
                      {exercise.notes}
                    </Text>
                  )}
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        </Stack>
      </Paper>
    )
  }

  return (
    <Paper p="xl" withBorder>
      <Stack gap="md">
        <div>
          <Title order={3} mb="xs">AI Workout Generator</Title>
          <Text c="dimmed" size="sm">
            Generate personalized workouts tailored to your client's goals, experience, and needs
          </Text>
        </div>

        <Divider />

        <Select
          label="Select Client *"
          placeholder="Choose a client..."
          data={clients.map(client => {
            const clientUserId = client.user_id || client.id
            return {
              value: clientUserId.toString(),
              label: `${client.name || 'Client'} (${client.email})`
            }
          })}
          value={formData.clientId}
          onChange={(value) => setFormData({ ...formData, clientId: value })}
          searchable
          required
        />

        {selectedClient && (
          <Alert color="blue" title="Client Profile">
            <Stack gap="xs">
              <Text size="sm">
                <strong>Goal:</strong> {selectedClient.primary_goal || 'Not specified'}
              </Text>
              {selectedClient.previous_experience && (
                <Text size="sm">
                  <strong>Experience:</strong> {selectedClient.previous_experience}
                </Text>
              )}
              {selectedClient.injuries && (
                <Text size="sm" c="red">
                  <strong>Injuries:</strong> {selectedClient.injuries}
                </Text>
              )}
            </Stack>
          </Alert>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <NumberInput
            label="Workout Duration (minutes)"
            value={formData.duration}
            onChange={(value) => setFormData({ ...formData, duration: value || 60 })}
            min={15}
            max={120}
            step={5}
          />

          <Select
            label="Intensity Level"
            value={formData.intensity}
            onChange={(value) => setFormData({ ...formData, intensity: value })}
            data={[
              { value: 'low', label: 'Low' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'high', label: 'High' },
              { value: 'very high', label: 'Very High' }
            ]}
          />

          <Select
            label="Focus Area"
            value={formData.focus}
            onChange={(value) => setFormData({ ...formData, focus: value })}
            data={[
              { value: 'full body', label: 'Full Body' },
              { value: 'upper body', label: 'Upper Body' },
              { value: 'lower body', label: 'Lower Body' },
              { value: 'core', label: 'Core' },
              { value: 'cardio', label: 'Cardio' },
              { value: 'strength', label: 'Strength' },
              { value: 'flexibility', label: 'Flexibility' }
            ]}
          />

          <Select
            label="Available Equipment"
            value={formData.equipment}
            onChange={(value) => setFormData({ ...formData, equipment: value })}
            data={[
              { value: 'gym', label: 'Full Gym' },
              { value: 'home', label: 'Home (Limited)' },
              { value: 'bodyweight', label: 'Bodyweight Only' },
              { value: 'dumbbells', label: 'Dumbbells' },
              { value: 'resistance bands', label: 'Resistance Bands' }
            ]}
          />
        </SimpleGrid>

        <Textarea
          label="Additional Notes (optional)"
          placeholder="Any specific requirements, modifications, or preferences..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />

        <Group justify="flex-end">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleGenerate} 
            loading={generating}
            disabled={!formData.clientId}
            color="robinhoodGreen"
          >
            {generating ? 'Generating...' : 'Generate Workout'}
          </Button>
        </Group>

        {generating && (
          <Alert color="blue" title="Generating Workout">
            <Text size="sm">AI is analyzing your client's profile and creating a personalized workout plan...</Text>
          </Alert>
        )}
      </Stack>
    </Paper>
  )
}

export default AIWorkoutGenerator

