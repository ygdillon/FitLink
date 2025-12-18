import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Container, Title, Text, Tabs, Paper, Card, Badge, Button, Stack, Group, Grid, Loader, Alert, Box } from '@mantine/core'
import api from '../services/api'
import ClientWorkouts from './ClientWorkouts'
import ClientSchedule from './ClientSchedule'
import ClientGoals from './ClientGoals'
import ClientNutrition from './ClientNutrition'
import './ClientProfile.css'

function ClientProfile() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('goals') // Default to Goals tab

  useEffect(() => {
    fetchClientProfile()
  }, [clientId])

  const fetchClientProfile = async () => {
    try {
      const response = await api.get(`/trainer/clients/${clientId}`)
      setClient(response.data)
    } catch (error) {
      console.error('Error fetching client profile:', error)
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
        <Title order={1}>{client.name}</Title>
        <Badge color={client.status === 'active' ? 'green' : 'gray'} size="lg">
          {client.status || 'active'}
        </Badge>
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab} orientation="vertical" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        <Box style={{ flex: '0 0 180px' }}>
          <Tabs.List>
            <Tabs.Tab value="overview">Overview</Tabs.Tab>
            <Tabs.Tab value="goals">Goals</Tabs.Tab>
            <Tabs.Tab value="progress">Progress</Tabs.Tab>
            <Tabs.Tab value="check-ins">Check-ins</Tabs.Tab>
            <Tabs.Tab value="workouts">Workouts</Tabs.Tab>
            <Tabs.Tab value="schedule">Schedule</Tabs.Tab>
            <Tabs.Tab value="nutrition">Nutrition</Tabs.Tab>
            <Tabs.Tab value="payments">Payments</Tabs.Tab>
          </Tabs.List>
        </Box>

        <Box style={{ flex: 1, minWidth: 0 }}>
            <Tabs.Panel value="overview">
              <Stack gap="md">
                <Paper p="md" withBorder>
                  <Title order={3} mb="md">Onboarding Information</Title>
                  <Grid>
                    <Grid.Col span={6}>
                      <Text size="sm" c="dimmed">Email</Text>
                      <Text>{client.email}</Text>
                    </Grid.Col>
                    {client.height && (
                      <Grid.Col span={6}>
                        <Text size="sm" c="dimmed">Height</Text>
                        <Text>{client.height} cm</Text>
                      </Grid.Col>
                    )}
                    {client.weight && (
                      <Grid.Col span={6}>
                        <Text size="sm" c="dimmed">Weight</Text>
                        <Text>{client.weight} kg</Text>
                      </Grid.Col>
                    )}
                    {client.age && (
                      <Grid.Col span={6}>
                        <Text size="sm" c="dimmed">Age</Text>
                        <Text>{client.age}</Text>
                      </Grid.Col>
                    )}
                    {client.gender && (
                      <Grid.Col span={6}>
                        <Text size="sm" c="dimmed">Gender</Text>
                        <Text>{client.gender}</Text>
                      </Grid.Col>
                    )}
                  </Grid>
                </Paper>

                <Paper p="md" withBorder>
                  <Title order={3} mb="md">Goals</Title>
                  {client.primary_goal ? (
                    <Stack gap="sm">
                      <Card withBorder>
                        <Title order={4} mb="xs">Primary Goal</Title>
                        <Text>{client.primary_goal.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
                        {client.goal_target && <Text><Text span fw={500}>Target:</Text> {client.goal_target}</Text>}
                        {client.goal_timeframe && <Text><Text span fw={500}>Timeframe:</Text> {client.goal_timeframe}</Text>}
                      </Card>
                      {client.secondary_goals && Array.isArray(client.secondary_goals) && client.secondary_goals.length > 0 && (
                        <div>
                          <Text fw={500} mb="xs">Secondary Goals</Text>
                          <Group gap="xs">
                            {client.secondary_goals.map((goal, index) => (
                              <Badge key={index} variant="light">{goal}</Badge>
                            ))}
                          </Group>
                        </div>
                      )}
                    </Stack>
                  ) : (
                    <Alert color="yellow">
                      ⚠️ No goal set for this client. <Button variant="subtle" size="xs" onClick={() => setActiveTab('goals')}>Set a goal →</Button>
                    </Alert>
                  )}
                </Paper>

                {client.previous_experience && (
                  <Paper p="md" withBorder>
                    <Title order={3} mb="xs">Previous Experience</Title>
                    <Text>{client.previous_experience}</Text>
                  </Paper>
                )}

                {client.average_daily_eating && (
                  <Paper p="md" withBorder>
                    <Title order={3} mb="xs">Daily Eating Habits</Title>
                    <Text>{client.average_daily_eating}</Text>
                  </Paper>
                )}

                {client.barriers && (
                  <Paper p="md" withBorder>
                    <Title order={3} mb="xs">Barriers</Title>
                    <Text>{client.barriers}</Text>
                  </Paper>
                )}

                <Paper p="md" withBorder>
                  <Title order={3} mb="md">Preferences</Title>
                  <Grid>
                    {client.training_preference && (
                      <Grid.Col span={6}>
                        <Text size="sm" c="dimmed">Training Preference</Text>
                        <Text>{client.training_preference}</Text>
                      </Grid.Col>
                    )}
                    {client.communication_preference && (
                      <Grid.Col span={6}>
                        <Text size="sm" c="dimmed">Communication</Text>
                        <Text>{client.communication_preference}</Text>
                      </Grid.Col>
                    )}
                  </Grid>
                </Paper>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="progress">
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={2}>Progress Tracking</Title>
                  <Button onClick={() => navigate(`/trainer/clients/${clientId}/progress`)}>
                    View Full Progress
                  </Button>
                </Group>
                {client.recent_progress && client.recent_progress.length > 0 ? (
                  <Stack gap="sm">
                    {client.recent_progress.map(entry => (
                      <Card key={entry.id} withBorder>
                        <Group justify="space-between" mb="xs">
                          <Text fw={500}>{new Date(entry.date).toLocaleDateString()}</Text>
                          <Group gap="md">
                            {entry.weight && <Text size="sm">Weight: {entry.weight} kg</Text>}
                            {entry.body_fat && <Text size="sm">Body Fat: {entry.body_fat}%</Text>}
                          </Group>
                        </Group>
                        {entry.notes && <Text size="sm" c="dimmed">{entry.notes}</Text>}
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  <Text c="dimmed">No progress entries yet</Text>
                )}

                {client.custom_metrics && client.custom_metrics.length > 0 && (
                  <div>
                    <Title order={3} mb="md">Custom Metrics</Title>
                    <Grid>
                      {client.custom_metrics.map(metric => (
                        <Grid.Col key={metric.id} span={4}>
                          <Card withBorder>
                            <Text fw={500} mb="xs">{metric.metric_name}</Text>
                            <Text size="lg" fw={700}>{metric.current_value} {metric.unit}</Text>
                            {metric.target_value && (
                              <Text size="sm" c="dimmed">Target: {metric.target_value} {metric.unit}</Text>
                            )}
                          </Card>
                        </Grid.Col>
                      ))}
                    </Grid>
                  </div>
                )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="check-ins">
              <Stack gap="md">
                <Title order={2}>Daily Check-ins</Title>
                {client.check_ins && client.check_ins.length > 0 ? (
                  <Stack gap="sm">
                    {client.check_ins.map(checkIn => (
                      <Card key={checkIn.id} withBorder>
                        <Group justify="space-between" mb="xs">
                          <Text fw={500}>{new Date(checkIn.check_in_date).toLocaleDateString()}</Text>
                          <Badge color={checkIn.status === 'completed' ? 'green' : 'yellow'}>
                            {checkIn.status}
                          </Badge>
                        </Group>
                        <Stack gap="xs">
                          {checkIn.workout_completed !== null && (
                            <Text size="sm">
                              <Text span fw={500}>Workout:</Text> {checkIn.workout_completed ? '✓ Completed' : '✗ Not completed'}
                              {checkIn.workout_rating && (
                                <Badge size="sm" ml="xs" variant="light">
                                  Rating: {checkIn.workout_rating}/10
                                </Badge>
                              )}
                            </Text>
                          )}
                          {checkIn.diet_stuck_to !== null && (
                            <Text size="sm">
                              <Text span fw={500}>Diet:</Text> {checkIn.diet_stuck_to ? '✓ Stuck to plan' : '✗ Did not stick to plan'}
                            </Text>
                          )}
                          {checkIn.notes && (
                            <Text size="sm" c="dimmed"><Text span fw={500}>Notes:</Text> {checkIn.notes}</Text>
                          )}
                          {checkIn.trainer_response && (
                            <Alert color="blue" title="Your Response">
                              {checkIn.trainer_response}
                            </Alert>
                          )}
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  <Text c="dimmed">No check-ins yet</Text>
                )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="goals">
              <ClientGoals clientId={clientId} client={client} onUpdate={fetchClientProfile} />
            </Tabs.Panel>

            <Tabs.Panel value="workouts">
              <ClientWorkouts clientId={clientId} clientName={client.name} />
            </Tabs.Panel>

            <Tabs.Panel value="schedule">
              <ClientSchedule clientId={clientId} clientName={client.name} />
            </Tabs.Panel>

            <Tabs.Panel value="nutrition">
              <ClientNutrition clientId={clientId} clientName={client.name} />
            </Tabs.Panel>

            <Tabs.Panel value="payments">
              <Paper p="md" withBorder>
                <Title order={2} mb="md">Payments</Title>
                <Text c="dimmed">Payment management coming soon...</Text>
              </Paper>
            </Tabs.Panel>
          </Box>
      </Tabs>
    </Container>
  )
}

export default ClientProfile

