import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Container, Grid, Paper, Title, Text, Stack, Group, Badge, Loader, Button, Anchor, Modal, Divider } from '@mantine/core'
import { Calendar } from '@mantine/dates'
import { useDisclosure } from '@mantine/hooks'
import api from '../services/api'
import './Dashboard.css'
import './TrainerDashboard.css'

function TrainerDashboard() {
  const [clients, setClients] = useState([])
  const [revenue, setRevenue] = useState({ total: 0, thisMonth: 0, thisWeek: 0 })
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [clientsWithSessions, setClientsWithSessions] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
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

  // Group sessions by date for calendar display
  const sessionsByDate = useMemo(() => {
    const grouped = new Map()
    upcomingSessions.forEach(session => {
      if (session.session_date) {
        // Normalize date key to YYYY-MM-DD format
        const dateKey = session.session_date.split('T')[0]
        if (!grouped.has(dateKey)) {
          grouped.set(dateKey, [])
        }
        grouped.get(dateKey).push(session)
      }
    })
    return grouped
  }, [upcomingSessions])

  // Get sessions for a specific date
  const getSessionsForDate = (date) => {
    if (!date) return []
    try {
      const dateKey = date.toISOString().split('T')[0]
      return sessionsByDate.get(dateKey) || []
    } catch (error) {
      console.error('Error getting sessions for date:', error)
      return []
    }
  }

  // Handle date click
  const handleDateClick = (date) => {
    if (!date) return
    const sessions = getSessionsForDate(date)
    if (sessions.length > 0) {
      setSelectedDate(date)
      openModal()
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
    <Container size="xl" py="xl" style={{ height: 'calc(100vh - 120px)' }}>
      <Grid gutter="md" style={{ height: '100%' }}>
        {/* Left Sidebar - Total Revenue */}
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Paper p="md" shadow="sm" withBorder h="100%">
            <Title order={3} mb="md">Total Revenue</Title>
            <Stack gap="md">
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
              <Anchor component={Link} to="/payments" size="sm" c="green.5">
                View Payment Details →
              </Anchor>
            </Stack>
          </Paper>
        </Grid.Col>

        {/* Right Panels (main content area) */}
        <Grid.Col span={{ base: 12, md: 9 }}>
          <Stack gap="md" style={{ height: '100%' }}>
            {/* Schedule Calendar - Full Height */}
            <Paper 
              p="xl" 
              shadow="md" 
              withBorder
              style={{ 
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: '600px'
              }}
            >
              <Group justify="flex-end" mb="lg">
                <Anchor component={Link} to="/trainer/clients" size="sm" fw={500}>
                  View All Clients →
                </Anchor>
              </Group>
              {upcomingSessions.length === 0 ? (
                <Stack gap="xs" align="center" justify="center" style={{ flex: 1 }}>
                  <Text c="dimmed" size="lg">No upcoming sessions scheduled</Text>
                  <Text size="sm" c="dimmed">Schedule sessions from client profiles</Text>
                </Stack>
              ) : (
                <Stack gap="lg" style={{ flex: 1, justifyContent: 'center' }}>
                  <div className="calendar-wrapper">
                    <Calendar
                      value={null}
                      onChange={handleDateClick}
                      getDayProps={(date) => {
                        if (!date) return {}
                        try {
                          const dateKey = date.toISOString().split('T')[0]
                          const hasSessions = sessionsByDate.has(dateKey)
                          return {
                            style: hasSessions
                              ? {
                                  backgroundColor: 'rgba(34, 197, 94, 0.2)',
                                  border: '1px solid rgba(34, 197, 94, 0.4)',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  color: 'rgba(34, 197, 94, 0.9)',
                                }
                              : { cursor: 'pointer' },
                          }
                        } catch (error) {
                          console.error('Error in getDayProps:', error)
                          return { style: { cursor: 'pointer' } }
                        }
                      }}
                      styles={{
                        calendar: {
                          width: '100%',
                        },
                        month: {
                          width: '100%',
                        },
                        monthCell: {
                          width: '100%',
                        },
                        weekday: {
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          paddingBottom: '0.75rem',
                          paddingTop: '0.5rem',
                          textAlign: 'center',
                          color: 'var(--mantine-color-gray-6)',
                        },
                        day: {
                          fontSize: '0.95rem',
                          height: '5rem',
                          minHeight: '5rem',
                          width: '100%',
                          borderRadius: 0,
                          border: 'none',
                          margin: 0,
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'flex-start',
                          padding: '0.5rem',
                          transition: 'background-color 0.15s ease',
                          position: 'relative',
                        },
                        cell: {
                          border: 'none',
                          margin: 0,
                          padding: 0,
                          width: 'calc(100% / 7)',
                        },
                      }}
                      size="lg"
                      fullWidth
                    />
                  </div>
                  <Group justify="center" mt="md">
                    <Badge size="md" variant="dot" color="green" radius="md">
                      Has Sessions
                    </Badge>
                  </Group>
                </Stack>
              )}
            </Paper>

            {/* Lower Right Panel - Clients */}
            <Paper p="md" shadow="sm" withBorder>
              <Group justify="space-between" mb="md">
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
              )}
            </Paper>
          </Stack>
        </Grid.Col>
      </Grid>

      {/* Session Details Modal */}
      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={
          selectedDate
            ? `Sessions on ${selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}`
            : 'Sessions'
        }
        size="md"
      >
        {selectedDate && (
          <Stack gap="md">
            {getSessionsForDate(selectedDate).length === 0 ? (
              <Text c="dimmed" ta="center" py="md">
                No sessions scheduled for this date
              </Text>
            ) : (
              getSessionsForDate(selectedDate)
                .sort((a, b) => {
                  const timeA = a.session_time || '00:00:00'
                  const timeB = b.session_time || '00:00:00'
                  return timeA.localeCompare(timeB)
                })
                .map(session => (
                  <Paper key={session.id} p="md" withBorder>
                    <Stack gap="sm">
                      <Group justify="space-between">
                        <Text fw={600} size="lg">
                          {session.client_name}
                        </Text>
                        <Badge color={session.status === 'completed' ? 'green' : 'blue'}>
                          {session.status || 'scheduled'}
                        </Badge>
                      </Group>
                      <Divider />
                      <Group gap="md">
                        <Stack gap={2}>
                          <Text size="xs" c="dimmed" fw={500}>
                            Time
                          </Text>
                          <Text fw={500}>
                            {session.session_time
                              ? new Date(`2000-01-01T${session.session_time}`).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : 'Not specified'}
                          </Text>
                        </Stack>
                        {session.workout_name && (
                          <Stack gap={2}>
                            <Text size="xs" c="dimmed" fw={500}>
                              Workout
                            </Text>
                            <Text fw={500}>{session.workout_name}</Text>
                          </Stack>
                        )}
                        {session.session_type && (
                          <Stack gap={2}>
                            <Text size="xs" c="dimmed" fw={500}>
                              Type
                            </Text>
                            <Text fw={500} tt="capitalize">
                              {session.session_type.replace('_', ' ')}
                            </Text>
                          </Stack>
                        )}
                      </Group>
                      {session.location && (
                        <Stack gap={2}>
                          <Text size="xs" c="dimmed" fw={500}>
                            Location
                          </Text>
                          <Text>{session.location}</Text>
                        </Stack>
                      )}
                      {session.meeting_link && (
                        <Stack gap={2}>
                          <Text size="xs" c="dimmed" fw={500}>
                            Meeting Link
                          </Text>
                          <Anchor href={session.meeting_link} target="_blank" size="sm">
                            {session.meeting_link}
                          </Anchor>
                        </Stack>
                      )}
                      {session.notes && (
                        <Stack gap={2}>
                          <Text size="xs" c="dimmed" fw={500}>
                            Notes
                          </Text>
                          <Text size="sm">{session.notes}</Text>
                        </Stack>
                      )}
                      <Group justify="flex-end" mt="xs">
                        <Button
                          variant="light"
                          size="sm"
                          onClick={() => {
                            const clientId = session.client_profile_id || session.client_id
                            if (clientId) {
                              navigate(`/trainer/clients/${clientId}`)
                              closeModal()
                            }
                          }}
                        >
                          View Client Profile
                        </Button>
                      </Group>
                    </Stack>
                  </Paper>
                ))
            )}
          </Stack>
        )}
      </Modal>
    </Container>
  )
}

export default TrainerDashboard

