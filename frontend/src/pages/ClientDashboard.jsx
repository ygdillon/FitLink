import { useState, useEffect, useMemo } from 'react'
import { Container, Paper, Title, Text, Stack, Group, Badge, Loader, Button, Card, SimpleGrid, Progress, Divider, Modal, Grid } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { Calendar } from '@mantine/dates'
import { useDisclosure } from '@mantine/hooks'
import api from '../services/api'
import './ClientDashboard.css'

function ClientDashboard() {
  const navigate = useNavigate()
  const [programs, setPrograms] = useState([])
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
  const [displayedMonth, setDisplayedMonth] = useState(new Date())

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      // Fetch assigned programs
      const programsRes = await api.get('/programs/client/assigned').catch(() => ({ data: [] }))
      const assignedPrograms = programsRes.data || []
      
      // Fetch full program details with workouts for each program
      const programsWithDetails = await Promise.all(
        assignedPrograms.map(async (program) => {
          try {
            const fullProgramRes = await api.get(`/programs/${program.id}`)
            return fullProgramRes.data || program
          } catch (error) {
            console.error(`Error fetching program ${program.id}:`, error)
            return program
          }
        })
      )
      
      setPrograms(programsWithDetails)
      
      // Fetch upcoming sessions
      const sessionsRes = await api.get('/schedule/client/upcoming').catch(() => ({ data: [] }))
      const sessions = sessionsRes.data || []
      console.log('[ClientDashboard] Fetched sessions:', sessions.length, sessions)
      setUpcomingSessions(sessions)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get today's workout from assigned programs
  const getTodaysWorkout = useMemo(() => {
    if (!programs.length) return null
    
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    const dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek // Convert to 1-7 (Monday-Sunday)
    
    // Find the current week in each program
    for (const program of programs) {
      if (!program.workouts || !program.workouts.length) continue
      
      // Calculate which week we're in (simplified - assumes program started at assignment)
      // For MVP, we'll just check if there's a workout for today's day of week in week 1
      // In production, this would calculate based on program start date
      const todaysWorkouts = program.workouts.filter(w => 
        w.week_number === 1 && w.day_number === dayNumber
      )
      
      if (todaysWorkouts.length > 0) {
        return {
          program: program,
          workout: todaysWorkouts[0],
          programId: program.id
        }
      }
    }
    
    return null
  }, [programs])

  // Calculate program progress
  const getProgramStats = (program) => {
    if (!program.workouts || !program.workouts.length) {
      return { completed: 0, total: 0, percentage: 0 }
    }
    
    // For MVP, we'll just show total workouts
    // In production, this would check completion status
    const total = program.workouts.length
    const completed = 0 // TODO: Get from workout completions
    
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  }

  // Group sessions by date for calendar display
  const sessionsByDate = useMemo(() => {
    const grouped = new Map()
    upcomingSessions.forEach(session => {
      if (session.session_date) {
        try {
          let dateKey
          if (typeof session.session_date === 'string') {
            // Handle string dates
            const dateStr = session.session_date.trim()
            // Extract just the date part (YYYY-MM-DD)
            if (dateStr.includes('T')) {
              dateKey = dateStr.split('T')[0]
            } else if (dateStr.includes(' ')) {
              dateKey = dateStr.split(' ')[0]
            } else {
              dateKey = dateStr
            }
            
            // Validate format
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
              // Fallback: parse as Date
              const date = new Date(session.session_date)
              if (!isNaN(date.getTime())) {
                dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
              } else {
                console.warn('Invalid date format:', session.session_date)
                return
              }
            }
          } else {
            // If it's a Date object, use UTC methods
            const date = new Date(session.session_date)
            if (isNaN(date.getTime())) {
              console.warn('Invalid date object:', session.session_date)
              return
            }
            dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
          }
          
          if (!grouped.has(dateKey)) {
            grouped.set(dateKey, [])
          }
          grouped.get(dateKey).push(session)
        } catch (error) {
          console.error('Error processing session date:', session.session_date, error)
        }
      }
    })
    return grouped
  }, [upcomingSessions])

  const getSessionsForDate = (date) => {
    if (!date) return []
    try {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateKey = `${year}-${month}-${day}`
      return sessionsByDate.get(dateKey) || []
    } catch (error) {
      return []
    }
  }

  const handleDateClick = (date) => {
    if (!date) return
    const sessions = getSessionsForDate(date)
    if (sessions.length > 0) {
      setSelectedDate(date)
      openModal()
    }
  }

  const handleStartWorkout = () => {
    if (getTodaysWorkout && getTodaysWorkout.workout.id) {
      navigate(`/client/workout/${getTodaysWorkout.workout.id}`)
    } else if (getTodaysWorkout) {
      // If workout doesn't have an ID yet, navigate to program view first
      handleViewProgram(getTodaysWorkout.programId)
    }
  }

  const handleViewProgram = (programId) => {
    navigate(`/programs?id=${programId}`)
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

  const selectedSessions = selectedDate ? getSessionsForDate(selectedDate) : []

  return (
    <Container size="xl" py="md" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Title order={1} mb="md" style={{ flexShrink: 0 }}>My Dashboard</Title>

      <Stack gap="md" style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Today's Workout - Prominent Card */}
        {getTodaysWorkout ? (
          <Card shadow="lg" padding="md" radius="md" withBorder style={{ 
            background: 'linear-gradient(135deg, var(--mantine-color-green-6) 0%, var(--mantine-color-green-7) 100%)',
            border: 'none',
            flexShrink: 0
          }}>
            <Stack gap="md">
              <Group justify="space-between" align="flex-start">
                <Stack gap="xs">
                  <Badge size="lg" variant="light" color="white">
                    Today's Workout
                  </Badge>
                  <Title order={2} c="white" fw={700}>
                    {getTodaysWorkout.workout.workout_name}
                  </Title>
                  <Text c="white" opacity={0.9}>
                    {getTodaysWorkout.program.name}
                  </Text>
                </Stack>
                <Group>
                  {getTodaysWorkout.workout.exercises && (
                    <Badge size="lg" variant="filled" color="white" c="green">
                      {getTodaysWorkout.workout.exercises.length} exercises
                    </Badge>
                  )}
                </Group>
              </Group>
              
              <Divider color="white" opacity={0.3} />
              
              <Group>
                <Button 
                  size="lg" 
                  variant="white" 
                  color="green"
                  onClick={handleStartWorkout}
                  style={{ flex: 1 }}
                >
                  Start Workout
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  color="white"
                  onClick={() => handleViewProgram(getTodaysWorkout.programId)}
                >
                  View Program
                </Button>
              </Group>
            </Stack>
          </Card>
        ) : (
          <Card shadow="sm" padding="md" radius="md" withBorder style={{ flexShrink: 0 }}>
            <Stack gap="sm" align="center">
              <Text size="md" fw={500} c="dimmed">No workout scheduled for today</Text>
              <Text size="xs" c="dimmed">Check your program schedule or wait for your trainer to assign workouts</Text>
              {programs.length > 0 && (
                <Button onClick={() => navigate('/programs')} color="green" size="sm">
                  View My Programs
                </Button>
              )}
            </Stack>
          </Card>
        )}

        {/* Calendar and Programs Side by Side */}
        <Grid gutter="md" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Upcoming Sessions Calendar - Left Side */}
          <Grid.Col span={{ base: 12, md: 4 }} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Paper p="sm" shadow="sm" withBorder style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Title order={3} mb="sm" style={{ flexShrink: 0, fontSize: '1.1rem' }}>Upcoming Sessions</Title>
              {upcomingSessions.length === 0 ? (
                <Stack gap="xs" align="center" justify="center" style={{ flex: 1, minHeight: 0 }}>
                  <Text c="dimmed" size="sm">No upcoming sessions scheduled</Text>
                  <Text size="xs" c="dimmed">Your trainer will schedule sessions for you</Text>
                </Stack>
              ) : (
                <div className="client-calendar-wrapper" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  <Calendar
                    value={null}
                    month={displayedMonth}
                    onMonthChange={setDisplayedMonth}
                    onChange={handleDateClick}
                    getDayProps={(date) => {
                      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                      const hasSessions = sessionsByDate.has(dateKey)
                      return {
                        style: hasSessions ? {
                          backgroundColor: 'var(--mantine-color-green-9)',
                          color: 'white',
                          fontWeight: 600,
                          borderRadius: '4px'
                        } : {},
                        onClick: () => handleDateClick(date)
                      }
                    }}
                    styles={{
                      calendar: { width: '100%' },
                      month: { width: '100%' },
                      weekday: {
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        paddingBottom: '0.4rem',
                        paddingTop: '0.2rem',
                        textAlign: 'center',
                        color: 'var(--mantine-color-gray-6)',
                      },
                    }}
                    size="sm"
                    fullWidth
                  />
                </div>
              )}
            </Paper>
          </Grid.Col>

          {/* Assigned Programs - Right Side */}
          <Grid.Col span={{ base: 12, md: 8 }} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {programs.length > 0 && (
              <Paper p="sm" shadow="sm" withBorder style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Group justify="space-between" mb="sm" style={{ flexShrink: 0 }}>
                  <Title order={3} style={{ fontSize: '1.1rem' }}>My Programs</Title>
                  <Button variant="light" size="xs" onClick={() => navigate('/programs')}>
                    View All
                  </Button>
                </Group>
                
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                  {programs.slice(0, 4).map(program => {
                    const stats = getProgramStats(program)
                    return (
                      <Card key={program.id} shadow="sm" padding="sm" radius="md" withBorder style={{ flexShrink: 0 }}>
                        <Stack gap="sm">
                          <Group justify="space-between">
                            <Title order={4} lineClamp={1}>{program.name}</Title>
                            {program.split_type && (
                              <Badge size="sm" variant="outline">{program.split_type}</Badge>
                            )}
                          </Group>
                          
                          {program.description && (
                            <Text size="sm" c="dimmed" lineClamp={2}>
                              {program.description}
                            </Text>
                          )}
                          
                          <Stack gap="xs">
                            <Group justify="space-between">
                              <Text size="xs" c="dimmed">Progress</Text>
                              <Text size="xs" fw={600}>{stats.completed}/{stats.total} workouts</Text>
                            </Group>
                            <Progress value={stats.percentage} size="sm" color="green" />
                          </Stack>
                          
                          <Group gap="xs">
                            <Text size="xs" c="dimmed">
                              {program.duration_weeks} weeks
                            </Text>
                            {program.workout_count && (
                              <>
                                <Text size="xs" c="dimmed">•</Text>
                                <Text size="xs" c="dimmed">
                                  {program.workout_count} workouts
                                </Text>
                              </>
                            )}
                          </Group>
                          
                          <Button 
                            variant="light" 
                            size="sm"
                            fullWidth
                            onClick={() => handleViewProgram(program.id)}
                          >
                            View Program
                          </Button>
                        </Stack>
                      </Card>
                    )
                  })}
                </SimpleGrid>
                
                {programs.length > 4 && (
                  <Group justify="center" mt="sm" style={{ flexShrink: 0 }}>
                    <Button variant="subtle" size="xs" onClick={() => navigate('/programs')}>
                      View {programs.length - 4} more program{programs.length - 4 > 1 ? 's' : ''}
                    </Button>
                  </Group>
                )}
              </Paper>
            )}
          </Grid.Col>
        </Grid>
      </Stack>

      {/* Session Details Modal */}
      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={`Sessions on ${selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}`}
        centered
      >
        {selectedSessions.length === 0 ? (
          <Text c="dimmed">No sessions found for this date</Text>
        ) : (
          <Stack gap="md">
            {selectedSessions.map(session => (
              <Paper key={session.id} p="md" withBorder>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text fw={600} size="lg">
                      {new Date(`2000-01-01T${session.session_time}`).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit' 
                      })}
                    </Text>
                    <Badge color={session.status === 'completed' ? 'green' : session.status === 'confirmed' ? 'blue' : 'gray'}>
                      {session.status || 'scheduled'}
                    </Badge>
                  </Group>
                  {session.workout_name && (
                    <Text fw={500}>{session.workout_name}</Text>
                  )}
                  {session.session_type && (
                    <Text size="sm" c="dimmed">Type: {session.session_type.replace('_', ' ')}</Text>
                  )}
                  {session.location && (
                    <Text size="sm" c="dimmed">Location: {session.location}</Text>
                  )}
                  {session.meeting_link && (
                    <Text size="sm" c="dimmed">
                      <a href={session.meeting_link} target="_blank" rel="noopener noreferrer">
                        Meeting Link
                      </a>
                    </Text>
                  )}
                  {session.notes && (
                    <Text size="sm" c="dimmed">{session.notes}</Text>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Modal>
    </Container>
  )
}

export default ClientDashboard
