import { useState, useEffect, useMemo, useCallback } from 'react'
import { Container, Paper, Title, Text, Stack, Group, Badge, Loader, Modal } from '@mantine/core'
import { Calendar } from '@mantine/dates'
import { useDisclosure } from '@mantine/hooks'
import api from '../services/api'
import './ClientDashboard.css'

function ClientDashboard() {
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
      const sessionsRes = await api.get('/schedule/client/upcoming').catch(() => ({ data: [] }))
      const sessions = sessionsRes.data || []
      setUpcomingSessions(sessions)
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
        // Extract date part directly from ISO string (YYYY-MM-DD)
        const dateStr = session.session_date.trim()
        const dateKey = dateStr.split('T')[0].split(' ')[0]
        
        if (!grouped.has(dateKey)) {
          grouped.set(dateKey, [])
        }
        grouped.get(dateKey).push(session)
      }
    })
    return grouped
  }, [upcomingSessions])

  // Get sessions for a specific date
  const getSessionsForDate = useCallback((date) => {
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
  }, [sessionsByDate])

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

  // Handle date click
  const handleDateClick = (date) => {
    if (!date) return
    const sessions = getSessionsForDate(date)
    if (sessions.length > 0) {
      setSelectedDate(date)
      openModal()
    }
  }

  // Render custom day content using Mantine's renderDay prop
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
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'flex-start', 
        justifyContent: 'flex-start',
        width: '100%',
        height: '100%',
        padding: '0.25rem'
      }}>
        <div 
          className="calendar-day-number"
          style={{ 
            fontWeight: 600, 
            fontSize: '0.85rem', 
            marginBottom: '0.1rem', 
            lineHeight: 1.2,
            position: 'relative',
          }}
        >
          {dateObj.getDate()}
        </div>
        {hasSessions && (
          <div className="session-times" style={{
            fontSize: '0.6rem',
            lineHeight: 1.1,
            color: 'rgba(34, 197, 94, 0.95)',
            fontWeight: 500,
            marginTop: '0.1rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            width: '100%'
          }}>
            {sessionTimesStr}
            {extraCount > 0 && ` +${extraCount}`}
          </div>
        )}
      </div>
    )
  }, [sessionsByDate, getDateKey])

  // Get day props for styling
  const getDayProps = useCallback((date) => {
    // Ensure date is a Date object
    let dateObj = date
    if (!(date instanceof Date)) {
      if (typeof date === 'string' || typeof date === 'number') {
        dateObj = new Date(date)
      } else {
        return { style: { cursor: 'pointer' } }
      }
    }
    
    if (isNaN(dateObj.getTime())) {
      return { style: { cursor: 'pointer' } }
    }
    
    const dateKey = getDateKey(dateObj)
    if (!dateKey) return { style: { cursor: 'pointer' } }

    const sessions = sessionsByDate.get(dateKey) || []
    const hasSessions = sessions.length > 0

    return {
      style: {
        cursor: 'pointer',
        position: 'relative',
        ...(hasSessions ? {
          backgroundColor: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
        } : {}),
      },
    }
  }, [sessionsByDate, getDateKey])

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
    <Container size="xl" py="md">
      <Title order={1} mb="md">My Space</Title>

      <Paper p="md" shadow="sm" withBorder>
        <Title order={3} mb="md">Upcoming Sessions</Title>
        {upcomingSessions.length === 0 ? (
          <Stack gap="xs" align="center" justify="center" style={{ minHeight: '400px' }}>
            <Text c="dimmed" size="lg">No upcoming sessions scheduled</Text>
            <Text size="sm" c="dimmed">Your trainer will schedule sessions for you</Text>
          </Stack>
        ) : (
          <div className="client-calendar-wrapper">
            <Calendar
              value={null}
              month={displayedMonth}
              onMonthChange={setDisplayedMonth}
              onChange={handleDateClick}
              renderDay={renderDay}
              getDayProps={getDayProps}
              styles={{
                calendar: {
                  width: '100%',
                },
                month: {
                  width: '100%',
                },
                weekday: {
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  paddingBottom: '0.5rem',
                  paddingTop: '0.25rem',
                  textAlign: 'center',
                  color: 'var(--mantine-color-gray-6)',
                },
                day: {
                  fontSize: '0.85rem',
                  height: '4rem',
                  minHeight: '4rem',
                  width: '100%',
                  borderRadius: 0,
                  border: 'none',
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                  padding: 0,
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
              size="md"
              fullWidth
            />
          </div>
        )}
      </Paper>

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
