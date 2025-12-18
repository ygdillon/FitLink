import { useState, useEffect } from 'react'
import { Container, Paper, Title, Text, Stack, Group, Badge, Loader } from '@mantine/core'
import api from '../services/api'
import './ClientDashboard.css'

function ClientDashboard() {
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const sessionsRes = await api.get('/schedule/client/upcoming').catch(() => ({ data: [] }))
      setUpcomingSessions(sessionsRes.data || [])
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
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">My Space</Title>

      <Paper p="md" shadow="sm" withBorder>
        <Title order={3} mb="md">Upcoming Sessions</Title>
        {upcomingSessions.length === 0 ? (
          <Stack gap="xs" align="center" py="xl">
            <Text c="dimmed">No upcoming sessions scheduled</Text>
            <Text size="sm" c="dimmed">Your trainer will schedule sessions for you</Text>
          </Stack>
        ) : (
          <Stack gap="sm">
            {upcomingSessions.slice(0, 10).map(session => (
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
                      <Text fw={500}>
                        {new Date(`2000-01-01T${session.session_time}`).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })}
                      </Text>
                      {session.workout_name && (
                        <Text size="sm" c="dimmed">{session.workout_name}</Text>
                      )}
                      {session.session_type && (
                        <Text size="xs" c="dimmed">{session.session_type}</Text>
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
        )}
      </Paper>
    </Container>
  )
}

export default ClientDashboard

