import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Container, Grid, Paper, Title, Text, Stack, Group, Badge, Loader, Button, Anchor } from '@mantine/core'
import api from '../services/api'
import './Dashboard.css'
import './TrainerDashboard.css'

function TrainerDashboard() {
  const [clients, setClients] = useState([])
  const [revenue, setRevenue] = useState({ total: 0, thisMonth: 0, thisWeek: 0 })
      const [upcomingSessions, setUpcomingSessions] = useState([])
      const [clientsWithSessions, setClientsWithSessions] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [clientsRes, revenueRes, sessionsRes] = await Promise.all([
        api.get('/trainer/clients'),
        api.get('/payments/trainer/history').catch(() => ({ data: [] })),
        api.get('/schedule/trainer/upcoming').catch(() => ({ data: [] }))
      ])
      setClients(clientsRes.data)
      
      // Calculate revenue
      if (revenueRes.data && revenueRes.data.length > 0) {
        const now = new Date()
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        
        const total = revenueRes.data
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
        
        const monthRevenue = revenueRes.data
          .filter(p => p.status === 'completed' && new Date(p.completed_at || p.created_at) >= thisMonth)
          .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
        
        const weekRevenue = revenueRes.data
          .filter(p => p.status === 'completed' && new Date(p.completed_at || p.created_at) >= thisWeek)
          .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
        
        setRevenue({ total, thisMonth: monthRevenue, thisWeek: weekRevenue })
      }
      
      const sessions = sessionsRes.data || []
      setUpcomingSessions(sessions)
      
      // Create a map of client_id to next session for quick lookup
      const sessionMap = new Map()
      sessions.forEach(session => {
        const clientId = session.client_profile_id || session.client_id
        if (!sessionMap.has(clientId) || new Date(session.session_date) < new Date(sessionMap.get(clientId).session_date)) {
          sessionMap.set(clientId, session)
        }
      })
      setClientsWithSessions(sessionMap)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
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
    <Box style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Container size="xl" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
        <Grid gutter="md" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left Sidebar - Total Revenue */}
          <Grid.Col span={{ base: 12, md: 3 }} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Paper p="md" shadow="sm" withBorder style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Title order={3} mb="md" style={{ flexShrink: 0 }}>Total Revenue</Title>
              <Stack gap="md" style={{ flex: 1 }}>
                <Text size="2rem" fw={700} c="green.5">
                  ${revenue.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">This Month</Text>
                    <Text fw={500}>${revenue.thisMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">This Week</Text>
                    <Text fw={500}>${revenue.thisWeek.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  </Group>
                </Stack>
                <Anchor component={Link} to="/payments" size="sm" c="green.5" style={{ flexShrink: 0 }}>
                  View Payment Details →
                </Anchor>
              </Stack>
            </Paper>
          </Grid.Col>

          {/* Right Panels (main content area) */}
          <Grid.Col span={{ base: 12, md: 9 }} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Stack gap="md" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              {/* Upper Right Panel - Schedule with Upcoming Sessions */}
              <Paper p="md" shadow="sm" withBorder style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column' }}>
                <Group justify="space-between" mb="md" style={{ flexShrink: 0 }}>
                  <Title order={3}>Schedule with Upcoming Sessions</Title>
                  <Anchor component={Link} to="/trainer/clients" size="sm">View All →</Anchor>
                </Group>
                {upcomingSessions.length === 0 ? (
                  <Stack gap="xs" align="center" py="xl">
                    <Text c="dimmed">No upcoming sessions scheduled</Text>
                    <Text size="sm" c="dimmed">Schedule sessions from client profiles</Text>
                  </Stack>
                ) : (
                  <ScrollArea style={{ maxHeight: '300px' }}>
                    <Stack gap="sm">
                      {upcomingSessions.slice(0, 5).map(session => (
                        <Paper key={session.id} p="sm" withBorder>
                          <Group justify="space-between">
                            <Group gap="md">
                              <Stack gap={0} align="center" w={60}>
                                <Text size="xs" c="dimmed">
                                  {new Date(session.session_date).toLocaleDateString('en-US', { weekday: 'short' })}
                                </Text>
                                <Text size="lg" fw={700}>
                                  {new Date(session.session_date).getDate()}
                                </Text>
                              </Stack>
                              <Stack gap={2}>
                                <Text fw={500}>{session.client_name}</Text>
                                <Text size="sm" c="dimmed">
                                  {new Date(`2000-01-01T${session.session_time}`).toLocaleTimeString('en-US', { 
                                    hour: 'numeric', 
                                    minute: '2-digit' 
                                  })}
                                </Text>
                                {session.workout_name && (
                                  <Text size="xs" c="dimmed">{session.workout_name}</Text>
                                )}
                              </Stack>
                            </Group>
                            <Badge color={session.status === 'completed' ? 'green' : 'blue'}>
                              {session.status || 'scheduled'}
                            </Badge>
                          </Group>
                        </Paper>
                      ))}
                    </Stack>
                  </ScrollArea>
                )}
              </Paper>

              {/* Lower Right Panel - Clients */}
              <Paper p="md" shadow="sm" withBorder style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                <Group justify="space-between" mb="md" style={{ flexShrink: 0 }}>
                  <Title order={3}>Clients</Title>
                  <Anchor component={Link} to="/trainer/clients" size="sm">View All →</Anchor>
                </Group>
                {clients.length === 0 ? (
                  <Stack gap="md" align="center" py="xl">
                    <Text c="dimmed">No clients yet</Text>
                    <Button component={Link} to="/trainer/add-client" variant="filled">
                      Add Your First Client
                    </Button>
                  </Stack>
                ) : (
                  <ScrollArea style={{ flex: 1 }}>
                    <Stack gap="xs">
                      {clients.map(client => {
                        const nextSession = clientsWithSessions.get(client.id)
                        return (
                          <Paper
                            key={client.id}
                            p="sm"
                            withBorder
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/trainer/clients/${client.id}`)}
                          >
                            <Group justify="space-between">
                              <Text fw={500}>{client.name}</Text>
                              <Text size="sm" c="dimmed">
                                {nextSession 
                                  ? `Next: ${new Date(nextSession.session_date).toLocaleDateString()}`
                                  : 'No session scheduled'}
                              </Text>
                            </Group>
                          </Paper>
                        )
                      })}
                    </Stack>
                  </ScrollArea>
                )}
              </Paper>
            </Stack>
          </Grid.Col>
        </Grid>
      </Container>
    </Box>
  )
}

export default TrainerDashboard

