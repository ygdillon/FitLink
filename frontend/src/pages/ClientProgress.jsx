import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Container, Title, Text, Stack, Card, Badge, Button, Group, Paper, Loader, Alert, Grid, Progress, NumberInput, Select, TextInput, Image, Box } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import api from '../services/api'
import './ClientProgress.css'

function ClientProgress() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [customMetrics, setCustomMetrics] = useState([])
  const [progressEntries, setProgressEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddMetric, setShowAddMetric] = useState(false)
  
  const metricForm = useForm({
    initialValues: {
      metric_name: '',
      metric_type: 'custom',
      unit: '',
      target_value: '',
      current_value: ''
    },
    validate: {
      metric_name: (value) => (!value ? 'Metric name is required' : null),
    },
  })

  useEffect(() => {
    fetchClientData()
  }, [clientId])

  const fetchClientData = async () => {
    try {
      const response = await api.get(`/trainer/clients/${clientId}`)
      setClient(response.data)
      setCustomMetrics(response.data.custom_metrics || [])
      setProgressEntries(response.data.recent_progress || [])
    } catch (error) {
      console.error('Error fetching client data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMetric = async (values) => {
    try {
      await api.post(`/trainer/clients/${clientId}/metrics`, values)
      metricForm.reset()
      setShowAddMetric(false)
      fetchClientData()
      notifications.show({
        title: 'Metric Added',
        message: 'Custom metric has been successfully added!',
        color: 'green',
      })
    } catch (error) {
      console.error('Error adding metric:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to add metric',
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

  if (!client) {
    return (
      <Container size="xl" py="xl">
        <Alert color="red" title="Client Not Found">
          The requested client could not be found.
        </Alert>
      </Container>
    )
  }

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Button variant="subtle" onClick={() => navigate(`/trainer/clients/${clientId}`)} mb="xs">
            ← Back to Client Profile
          </Button>
          <Title order={1}>Progress Tracking - {client.name}</Title>
        </div>
        <Button onClick={() => setShowAddMetric(!showAddMetric)}>
          + Add Custom Metric
        </Button>
      </Group>

      {showAddMetric && (
        <Paper p="md" withBorder mb="xl">
          <Title order={3} mb="md">Add Custom Metric</Title>
          <form onSubmit={metricForm.onSubmit(handleAddMetric)}>
            <Stack gap="md">
              <Group grow>
                <TextInput
                  label="Metric Name *"
                  placeholder="e.g., Bench Press Max, Waist Measurement"
                  {...metricForm.getInputProps('metric_name')}
                  required
                />
                <Select
                  label="Type"
                  data={['Custom', 'Weight', 'Strength', 'Measurement', 'Endurance']}
                  withinPortal
                  {...metricForm.getInputProps('metric_type')}
                />
              </Group>
              <Group grow>
                <TextInput
                  label="Unit"
                  placeholder="e.g., lbs, kg, reps, inches"
                  {...metricForm.getInputProps('unit')}
                />
                <NumberInput
                  label="Current Value"
                  placeholder="Current"
                  step={0.1}
                  {...metricForm.getInputProps('current_value')}
                />
                <NumberInput
                  label="Target Value"
                  placeholder="Target"
                  step={0.1}
                  {...metricForm.getInputProps('target_value')}
                />
              </Group>
              <Group justify="flex-end">
                <Button variant="outline" onClick={() => setShowAddMetric(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Add Metric
                </Button>
              </Group>
            </Stack>
          </form>
        </Paper>
      )}

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="md" withBorder>
            <Title order={2} mb="md">Custom Metrics</Title>
            {customMetrics.length === 0 ? (
              <Text c="dimmed">No custom metrics yet. Add one to start tracking!</Text>
            ) : (
              <Stack gap="md">
                {customMetrics.map(metric => (
                  <Card key={metric.id} withBorder>
                    <Stack gap="xs">
                      <Title order={4}>{metric.metric_name}</Title>
                      <Group>
                        <Text fw={500}>
                          {metric.current_value || 'N/A'} {metric.unit}
                        </Text>
                        {metric.target_value && (
                          <Text size="sm" c="dimmed">
                            Target: {metric.target_value} {metric.unit}
                          </Text>
                        )}
                      </Group>
                      {metric.target_value && metric.current_value && (
                        <Progress 
                          value={Math.min((metric.current_value / metric.target_value) * 100, 100)} 
                          color="green"
                        />
                      )}
                    </Stack>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="md" withBorder>
            <Title order={2} mb="md">Progress History</Title>
            {progressEntries.length === 0 ? (
              <Text c="dimmed">No progress entries yet</Text>
            ) : (
              <Stack gap="md">
                {progressEntries.map(entry => (
                  <Card key={`${entry.entry_type}-${entry.id}`} withBorder>
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text fw={500}>
                          {new Date(entry.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </Text>
                        <Badge 
                          color={entry.entry_type === 'progress' ? 'blue' : 'green'}
                          variant="light"
                        >
                          {entry.entry_type === 'progress' ? 'Progress Check' : 'Check-in'}
                        </Badge>
                      </Group>

                      {entry.entry_type === 'progress' ? (
                        // Progress Entry Display
                        <>
                          <Group gap="xs">
                            {entry.weight && (
                              <Badge variant="light">Weight: {entry.weight} kg</Badge>
                            )}
                            {entry.body_fat && (
                              <Badge variant="light">Body Fat: {entry.body_fat}%</Badge>
                            )}
                            {entry.measurements && (
                              <>
                                {Object.entries(typeof entry.measurements === 'string' ? JSON.parse(entry.measurements || '{}') : entry.measurements).map(([key, value]) => (
                                  <Badge key={key} variant="light">
                                    {key.charAt(0).toUpperCase() + key.slice(1)}: {value} in
                                  </Badge>
                                ))}
                              </>
                            )}
                          </Group>
                          {entry.notes && (
                            <Text size="sm" c="dimmed">{entry.notes}</Text>
                          )}
                        </>
                      ) : (
                        // Check-in Display
                        <>
                          <Group gap="xs">
                            {entry.workout_completed !== null && (
                              <Badge color={entry.workout_completed ? 'green' : 'red'} variant="light">
                                Workout: {entry.workout_completed ? '✓ Completed' : '✗ Not completed'}
                              </Badge>
                            )}
                            {entry.workout_rating && (
                              <Badge color="green" variant="light">
                                Rating: {entry.workout_rating}/10
                              </Badge>
                            )}
                            {entry.workout_duration && (
                              <Badge color="blue" variant="light">
                                {entry.workout_duration} min
                              </Badge>
                            )}
                            {entry.diet_stuck_to !== null && (
                              <Badge color={entry.diet_stuck_to ? 'green' : 'red'} variant="light">
                                Diet: {entry.diet_stuck_to ? '✓ On track' : '✗ Off track'}
                              </Badge>
                            )}
                          </Group>

                          {(entry.sleep_hours || entry.sleep_quality) && (
                            <Group gap="xs">
                              <Text size="sm" fw={500}>Sleep:</Text>
                              {entry.sleep_hours && (
                                <Badge variant="light">{entry.sleep_hours} hours</Badge>
                              )}
                              {entry.sleep_quality && (
                                <Badge color="blue" variant="light">
                                  Quality: {entry.sleep_quality}/10
                                </Badge>
                              )}
                            </Group>
                          )}

                          {entry.energy_level && (
                            <Group gap="xs">
                              <Text size="sm" fw={500}>Energy:</Text>
                              <Badge color="yellow" variant="light">
                                {entry.energy_level}/10
                              </Badge>
                            </Group>
                          )}

                          {entry.pain_experienced && (
                            <Group gap="xs">
                              <Text size="sm" fw={500}>Pain:</Text>
                              <Badge color="red" variant="light">
                                {entry.pain_location} - Intensity: {entry.pain_intensity}/10
                              </Badge>
                            </Group>
                          )}

                          {entry.photos && (
                            <Box>
                              <Text size="sm" fw={500} mb="xs">Progress Photo:</Text>
                              <Image 
                                src={entry.photos} 
                                alt="Progress" 
                                width={150} 
                                height={150} 
                                fit="cover" 
                                radius="md" 
                              />
                            </Box>
                          )}

                          {entry.notes && (
                            <Text size="sm" c="dimmed">{entry.notes}</Text>
                          )}

                          {entry.trainer_response && (
                            <Alert color="blue" title="Your Response">
                              {entry.trainer_response}
                            </Alert>
                          )}
                        </>
                      )}
                    </Stack>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  )
}

export default ClientProgress

