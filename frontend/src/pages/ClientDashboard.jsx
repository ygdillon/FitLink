import { useState, useEffect, useMemo, useCallback } from 'react'
import { Container, Paper, Title, Text, Stack, Group, Badge, Loader, Button, Card, SimpleGrid, Progress, Divider, Modal, Grid, ScrollArea } from '@mantine/core'
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
      try {
        const sessionsRes = await api.get('/schedule/client/upcoming')
        const sessions = sessionsRes.data || []
        console.log('[ClientDashboard] Fetched sessions:', sessions.length, 'sessions:', sessions)
        if (sessions.length === 0) {
          console.log('[ClientDashboard] No sessions returned from API')
        } else {
          console.log('[ClientDashboard] Sample session:', sessions[0])
          console.log('[ClientDashboard] Sample session date:', sessions[0].session_date, 'type:', typeof sessions[0].session_date)
        }
        setUpcomingSessions(sessions)
      } catch (error) {
        console.error('[ClientDashboard] Error fetching sessions:', error)
        console.error('[ClientDashboard] Error response:', error.response?.data)
        setUpcomingSessions([])
      }
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
    console.log('[ClientDashboard] Grouping sessions, total:', upcomingSessions.length)
    upcomingSessions.forEach((session, index) => {
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
                console.warn('[ClientDashboard] Invalid date format:', session.session_date)
                return
              }
            }
          } else {
            // If it's a Date object, use UTC methods
            const date = new Date(session.session_date)
            if (isNaN(date.getTime())) {
              console.warn('[ClientDashboard] Invalid date object:', session.session_date)
              return
            }
            dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
          }
          
          if (!grouped.has(dateKey)) {
            grouped.set(dateKey, [])
          }
          grouped.get(dateKey).push(session)
          
          if (index === 0) {
            console.log('[ClientDashboard] First session grouped - dateKey:', dateKey, 'session_date:', session.session_date)
          }
        } catch (error) {
          console.error('[ClientDashboard] Error processing session date:', session.session_date, error)
        }
      } else {
        console.warn('[ClientDashboard] Session missing session_date:', session)
      }
    })
    console.log('[ClientDashboard] Grouped sessions into', grouped.size, 'dates:', Array.from(grouped.keys()))
    return grouped
  }, [upcomingSessions])

  // Format date key from Date object
  const getDateKey = useCallback((date) => {
      if (!date) return null
      
      // Ensure date is a Date object
      let dateObj = date
      if (!(date instanceof Date)) {
        // Try to convert if it's a string or number
        if (typeof date === 'string' || typeof date === 'number') {
          dateObj = new Date(date)
        } else {
          return null
        }
      }
      
      // Validate the date
      if (isNaN(dateObj.getTime())) {
        return null
      }
      
      const year = dateObj.getFullYear()
      const month = String(dateObj.getMonth() + 1).padStart(2, '0')
      const day = String(dateObj.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
  }, [])

  const getSessionsForDate = (date) => {
    if (!date) return []
    try {
      const dateKey = getDateKey(date)
      if (!dateKey) return []
      return sessionsByDate.get(dateKey) || []
    } catch (error) {
      return []
    }
  }
  
  // Render custom day content to show session times
  const renderDay = useCallback((date) => {
      // Ensure date is a Date object
      let dateObj = date
      if (!(date instanceof Date)) {
        if (typeof date === 'string' || typeof date === 'number') {
          dateObj = new Date(date)
        } else {
          return null
        }
      }
      
      if (isNaN(dateObj.getTime())) {
        return null
      }
      
      const dateKey = getDateKey(dateObj)
      if (!dateKey) {
        // Fallback: just return the day number
        return dateObj.getDate()
      }

      const sessions = sessionsByDate.get(dateKey) || []
      const hasSessions = sessions.length > 0
      
      // Format session times for display
      const sessionTimes = sessions.map(session => {
        if (session.session_time) {
          const [hours, minutes] = session.session_time.split(':')
          const hour = parseInt(hours)
          const ampm = hour >= 12 ? 'PM' : 'AM'
          const displayHour = hour % 12 || 12
          return `${displayHour}:${minutes.padStart(2, '0')} ${ampm}`
        }
        return null
      }).filter(Boolean).slice(0, 2)
      
      const sessionTimesStr = sessionTimes.join(', ')
      const extraCount = sessions.length > 2 ? sessions.length - 2 : 0
      
      return (
        <div 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-start', 
            justifyContent: 'flex-start',
            width: '100%',
            height: '100%',
            padding: '0.3rem'
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem', pointerEvents: 'none' }}>
            {dateObj.getDate()}
          </div>
          {hasSessions && (
            <div className="session-times" style={{
              fontSize: '0.65rem',
              lineHeight: 1.2,
              color: 'rgba(34, 197, 94, 0.95)',
              fontWeight: 500,
              marginTop: '0.15rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              width: '100%',
              pointerEvents: 'none'
            }}>
              {sessionTimesStr}
              {extraCount > 0 && ` +${extraCount} more`}
            </div>
          )}
        </div>
      )
  }, [sessionsByDate, getDateKey])

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
              <Group justify="space-between" mb="sm" style={{ flexShrink: 0 }}>
                <Title order={3} style={{ fontSize: '1.1rem' }}>
                  Upcoming Sessions {upcomingSessions.length > 0 && `(${upcomingSessions.length})`}
                </Title>
              </Group>
              {upcomingSessions.length === 0 ? (
                <Stack gap="xs" align="center" justify="center" style={{ flex: 1, minHeight: 0 }}>
                  <Text c="dimmed" size="sm">No upcoming sessions scheduled</Text>
                  <Text size="xs" c="dimmed">Your trainer will schedule sessions for you</Text>
                </Stack>
              ) : (
                <Stack gap="sm" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  <div className="client-calendar-wrapper" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <Calendar
                      value={null}
                      month={displayedMonth}
                      onMonthChange={setDisplayedMonth}
                      onChange={handleDateClick}
                      renderDay={renderDay}
                      getDayProps={(date) => {
                        // Ensure date is a valid Date object
                        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
                          return {}
                        }
                        
                        try {
                          const dateKey = getDateKey(date)
                          if (!dateKey) return { style: { cursor: 'pointer' } }
                          
                          const sessions = sessionsByDate.get(dateKey) || []
                          const hasSessions = sessions.length > 0
                          
                          return {
                            onClick: (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleDateClick(date)
                            },
                            style: {
                              cursor: 'pointer',
                              position: 'relative',
                              ...(hasSessions ? {
                                border: '2px solid rgba(34, 197, 94, 0.6)',
                                borderRadius: '4px'
                              } : {})
                            }
                          }
                        } catch (error) {
                          console.error('[ClientDashboard] Error in getDayProps:', error, date)
                          return { style: { cursor: 'pointer' } }
                        }
                      }}
                    styles={{
                      calendar: { width: '100%' },
                      month: { width: '100%' },
                      monthCell: { width: '100%' },
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
                        height: '5.5rem',
                        minHeight: '5.5rem',
                        width: '100%',
                        borderRadius: 0,
                        border: 'none',
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        justifyContent: 'flex-start',
                        padding: '0.3rem',
                      },
                    }}
                      size="sm"
                      fullWidth
                    />
                  </div>
                  
                  {/* Show upcoming sessions list below calendar */}
                  <div style={{ maxHeight: '150px', overflowY: 'auto', flexShrink: 0 }}>
                    <Stack gap="xs">
                      {upcomingSessions.slice(0, 5).map(session => {
                        const sessionDate = session.session_date ? new Date(session.session_date) : null
                        return (
                          <Card key={session.id} p="xs" withBorder>
                            <Group justify="space-between" gap="xs">
                              <Stack gap={2} style={{ flex: 1 }}>
                                <Text size="sm" fw={500}>
                                  {sessionDate ? sessionDate.toLocaleDateString('en-US', { 
                                    weekday: 'short', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  }) : 'Date TBD'}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  {session.session_time ? new Date(`2000-01-01T${session.session_time}`).toLocaleTimeString('en-US', { 
                                    hour: 'numeric', 
                                    minute: '2-digit' 
                                  }) : ''} 
                                  {session.workout_name && ` • ${session.workout_name}`}
                                </Text>
                              </Stack>
                              <Badge size="sm" color={session.status === 'confirmed' ? 'blue' : 'gray'}>
                                {session.status || 'scheduled'}
                              </Badge>
                            </Group>
                          </Card>
                        )
                      })}
                      {upcomingSessions.length > 5 && (
                        <Text size="xs" c="dimmed" ta="center">
                          +{upcomingSessions.length - 5} more sessions
                        </Text>
                      )}
                    </Stack>
                  </div>
                </Stack>
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
