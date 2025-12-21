import { useState } from 'react'
import { 
  Modal, 
  Stack, 
  Text, 
  Button, 
  Loader, 
  Alert, 
  Card, 
  Group, 
  Badge,
  Divider,
  Title
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import api from '../services/api'

function AIRecommendations({ opened, onClose, clientId, currentWorkout }) {
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState(null)
  const [error, setError] = useState(null)

  const handleGetRecommendations = async () => {
    if (!clientId) {
      notifications.show({
        title: 'Error',
        message: 'Please select a client first',
        color: 'red',
      })
      return
    }

    setLoading(true)
    setError(null)
    setRecommendations(null)

    try {
      const response = await api.post('/trainer/workouts/ai/recommendations', {
        clientId,
        currentWorkout: {
          name: currentWorkout.name || '',
          description: currentWorkout.description || '',
          category: currentWorkout.category || '',
          exercises: currentWorkout.exercises || []
        }
      })

      setRecommendations(response.data)
    } catch (error) {
      console.error('Error getting AI recommendations:', error)
      const errorData = error.response?.data || {}
      
      if (errorData.error === 'INSUFFICIENT_QUOTA' || error.response?.status === 429) {
        setError({
          type: 'quota',
          message: 'Your OpenAI account has run out of credits. Please add credits to use AI recommendations.',
          helpUrl: 'https://platform.openai.com/account/billing'
        })
      } else {
        setError({
          type: 'general',
          message: errorData.message || 'Failed to get AI recommendations'
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleApplyRecommendation = (recommendation) => {
    onClose(recommendation)
  }

  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      title="AI Workout Recommendations"
      size="xl"
    >
      <Stack gap="md">
        {!recommendations && !error && (
          <>
            <Text size="sm" c="dimmed">
              Get AI-powered recommendations tailored to your client's profile and the workout you're creating.
            </Text>
            <Button 
              onClick={handleGetRecommendations} 
              loading={loading}
              color="robinhoodGreen"
              fullWidth
            >
              Get AI Recommendations
            </Button>
          </>
        )}

        {loading && (
          <Group justify="center" py="xl">
            <Loader size="lg" />
            <Text c="dimmed">Analyzing client profile and generating recommendations...</Text>
          </Group>
        )}

        {error && (
          <Alert color={error.type === 'quota' ? 'orange' : 'red'} title="Error">
            <Text size="sm">{error.message}</Text>
            {error.helpUrl && (
              <Button 
                component="a" 
                href={error.helpUrl} 
                target="_blank" 
                variant="light" 
                size="xs" 
                mt="xs"
              >
                Add Credits
              </Button>
            )}
          </Alert>
        )}

        {recommendations && (
          <Stack gap="md">
            {recommendations.exerciseSuggestions && recommendations.exerciseSuggestions.length > 0 && (
              <div>
                <Title order={4} mb="sm">Exercise Suggestions</Title>
                <Stack gap="sm">
                  {recommendations.exerciseSuggestions.map((suggestion, index) => (
                    <Card key={index} withBorder p="md">
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text fw={600}>{suggestion.name}</Text>
                          <Badge color="blue" variant="light">Suggestion</Badge>
                        </Group>
                        {suggestion.reason && (
                          <Text size="sm" c="dimmed">{suggestion.reason}</Text>
                        )}
                        <Group gap="xs">
                          {suggestion.sets && <Text size="sm"><strong>Sets:</strong> {suggestion.sets}</Text>}
                          {suggestion.reps && <Text size="sm"><strong>Reps:</strong> {suggestion.reps}</Text>}
                          {suggestion.rest && <Text size="sm"><strong>Rest:</strong> {suggestion.rest}</Text>}
                        </Group>
                        <Button 
                          size="xs" 
                          variant="light"
                          onClick={() => handleApplyRecommendation(suggestion)}
                        >
                          Add to Workout
                        </Button>
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              </div>
            )}

            {recommendations.modifications && recommendations.modifications.length > 0 && (
              <div>
                <Title order={4} mb="sm">Recommended Modifications</Title>
                <Stack gap="sm">
                  {recommendations.modifications.map((mod, index) => (
                    <Card key={index} withBorder p="md">
                      <Stack gap="xs">
                        <Text fw={600}>{mod.exercise || 'General'}</Text>
                        <Text size="sm">{mod.suggestion}</Text>
                        {mod.reason && (
                          <Text size="xs" c="dimmed">{mod.reason}</Text>
                        )}
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              </div>
            )}

            {recommendations.generalTips && (
              <div>
                <Title order={4} mb="sm">General Tips</Title>
                <Card withBorder p="md">
                  <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
                    {recommendations.generalTips}
                  </Text>
                </Card>
              </div>
            )}

            <Divider />

            <Group justify="flex-end">
              <Button variant="outline" onClick={() => {
                setRecommendations(null)
                setError(null)
              }}>
                Get New Recommendations
              </Button>
              <Button onClick={onClose}>
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Modal>
  )
}

export default AIRecommendations

