import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Container, Title, Text, Tabs, Paper, Card, Badge, Button, Stack, Group, Grid, Loader, Alert, Box } from '@mantine/core'
import { useMantineColorScheme } from '@mantine/core'
import api from '../services/api'
import ClientProgramsView from './ClientProgramsView'
import ClientSchedule from './ClientSchedule'
import ClientGoals from './ClientGoals'
import ClientNutrition from './ClientNutrition'
import './ClientProfile.css'

function ClientProfile() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const { colorScheme } = useMantineColorScheme()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('progress') // Default to Progress tab
  
  const isDark = colorScheme === 'dark'
  const paperBgColor = isDark ? 'var(--mantine-color-dark-6)' : 'white'
  const paperBorderColor = isDark ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-3)'

  useEffect(() => {
    // Only fetch if we have a clientId
    if (clientId) {
      fetchClientProfile()
    } else {
      setClient(null)
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const fetchClientProfile = async () => {
    if (!clientId) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      const response = await api.get(`/trainer/clients/${clientId}`)
      if (response.data) {
        setClient(response.data)
      } else {
        console.error('No client data returned for ID:', clientId)
        setClient(null)
      }
    } catch (error) {
      console.error('Error fetching client profile:', error)
      console.error('Client ID:', clientId)
      console.error('Error response:', error.response?.data)
      console.error('Status:', error.response?.status)
      
      // If it's a 404 or 403, the client doesn't exist or access denied
      // Don't set client to null immediately - let the parent component handle redirect
      if (error.response?.status === 404 || error.response?.status === 403) {
        setClient(null)
        // Trigger a small delay to allow parent redirect to happen
        setTimeout(() => {
          // If still no client after delay, show error
          if (!client) {
            setClient(null)
          }
        }, 100)
      } else {
        setClient(null)
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Box p="xl" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size="lg" />
      </Box>
    )
  }

  if (!client && !loading) {
    return (
      <Box p="xl">
        <Alert color="red" title="Client Not Found">
          The requested client (ID: {clientId}) could not be found. Please select a client from the list.
        </Alert>
      </Box>
    )
  }

  return (
    <Box style={{ height: '100%', overflow: 'auto' }} p="xl">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={1}>{client.name}</Title>
          <Badge color={client.status === 'active' ? 'green' : 'gray'} size="lg">
            {client.status || 'active'}
          </Badge>
        </Group>

        <Tabs 
          value={activeTab} 
          onChange={setActiveTab}
          className="clientProfileTabs"
        >
          <Paper 
            p="xs" 
            withBorder 
            shadow="md"
            style={{ 
              backgroundColor: paperBgColor,
              borderRadius: 'var(--mantine-radius-sm)',
              border: `1px solid ${paperBorderColor}`,
              boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.08)',
              marginBottom: '1.5rem'
            }}
          >
            <Tabs.List className="clientProfileTabsList" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
              <Tabs.Tab value="overview" className="clientProfileTab">
                Overview
              </Tabs.Tab>
              <Tabs.Tab value="progress" className="clientProfileTab">
                Progress
              </Tabs.Tab>
              <Tabs.Tab value="workouts" className="clientProfileTab">
                Program
              </Tabs.Tab>
              <Tabs.Tab value="schedule" className="clientProfileTab">
                Schedule
              </Tabs.Tab>
              <Tabs.Tab value="nutrition" className="clientProfileTab">
                Nutrition
              </Tabs.Tab>
              <Tabs.Tab value="payments" className="clientProfileTab">
                Payments
              </Tabs.Tab>
            </Tabs.List>
          </Paper>

          <Box>
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
                        <Text>{(parseFloat(client.weight) * 2.20462).toFixed(2)} lbs</Text>
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
                      ⚠️ No goal set for this client. <Button variant="subtle" size="xs" onClick={() => setActiveTab('progress')}>Set a goal →</Button>
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
              <Stack gap="xl">
                {/* Check-ins Section - Moved to Top */}
                <Paper p="md" withBorder>
                  <Title order={2} mb="md">Daily Check-ins</Title>
                  {client.check_ins && client.check_ins.length > 0 ? (
                    <Stack gap="sm">
                      {client.check_ins.map(checkIn => {
                        // Format check-in date safely
                        let checkInDateStr = 'Invalid Date'
                        try {
                          if (checkIn.date || checkIn.check_in_date) {
                            const date = new Date(checkIn.date || checkIn.check_in_date)
                            if (!isNaN(date.getTime())) {
                              checkInDateStr = date.toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })
                            }
                          }
                        } catch (e) {
                          console.error('Error formatting check-in date:', e)
                        }

                        // Format workout date if available
                        let workoutDateStr = null
                        try {
                          if (checkIn.workout_date) {
                            const workoutDate = new Date(checkIn.workout_date)
                            if (!isNaN(workoutDate.getTime())) {
                              workoutDateStr = workoutDate.toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })
                            }
                          }
                        } catch (e) {
                          console.error('Error formatting workout date:', e)
                        }

                        return (
                          <Card key={checkIn.id} withBorder>
                            <Group justify="space-between" mb="xs">
                              <Stack gap={2}>
                                <Text fw={500}>Check-in Date: {checkInDateStr}</Text>
                                {workoutDateStr && checkIn.workout_name && (
                                  <Text size="sm" c="dimmed">
                                    Workout: {checkIn.workout_name} ({workoutDateStr})
                                    {checkIn.program_name && ` • ${checkIn.program_name}`}
                                  </Text>
                                )}
                              </Stack>
                              <Badge color={checkIn.status === 'completed' ? 'green' : 'yellow'}>
                                {checkIn.status || 'completed'}
                              </Badge>
                            </Group>
                            <Stack gap="xs">
                              {checkIn.workout_completed !== null && (
                                <Text size="sm">
                                  <Text span fw={500}>Workout:</Text> {checkIn.workout_completed ? '✓ Completed' : '✗ Not completed'}
                                  {checkIn.workout_rating && (
                                    <Badge size="sm" ml="xs" variant="light" color="green">
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
                        )
                      })}
                    </Stack>
                  ) : (
                    <Text c="dimmed">No check-ins yet</Text>
                  )}
                </Paper>

                {/* Progress Tracking Section */}
                <Paper p="md" withBorder>
                  <Group justify="space-between" mb="md">
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
                    <div style={{ marginTop: '1.5rem' }}>
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
                </Paper>

                {/* Goals Section - Moved to Bottom */}
                <Paper p="md" withBorder>
                  <Title order={2} mb="md">Goals</Title>
                  <ClientGoals clientId={clientId} client={client} onUpdate={fetchClientProfile} />
                </Paper>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="workouts">
              <ClientProgramsView clientId={clientId} clientName={client.name} />
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
      </Stack>
    </Box>
  )
}

export default ClientProfile

