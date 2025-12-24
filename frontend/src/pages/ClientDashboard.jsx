import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
  const [calendarKey, setCalendarKey] = useState(0)
  const calendarWrapperRef = useRef(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const sessionsRes = await api.get('/schedule/client/upcoming').catch(() => ({ data: [] }))
      const sessions = sessionsRes.data || []
      console.log('[ClientDashboard] Fetched sessions:', sessions.length)
      if (sessions.length > 0) {
        console.log('[ClientDashboard] First session:', {
          id: sessions[0].id,
          session_date: sessions[0].session_date,
          session_time: sessions[0].session_time
        })
      }
      setUpcomingSessions(sessions)
      // Force calendar re-render when sessions are loaded
      setCalendarKey(prev => prev + 1)
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
        console.log(`[ClientDashboard] Added session ${session.id} to date ${dateKey}`)
      }
    })
    console.log('[ClientDashboard] Sessions grouped by date:', Array.from(grouped.keys()))
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

  // Memoize getDayProps to add session data to calendar days
  const getDayProps = useCallback((date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return { style: { cursor: 'pointer' } }
    }
    try {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateKey = `${year}-${month}-${day}`
      
      const sessions = sessionsByDate.get(dateKey) || []
      const hasSessions = sessions.length > 0
      
      if (hasSessions && (dateKey.startsWith('2025-12') || dateKey.startsWith('2026-01'))) {
        console.log(`[ClientDashboard getDayProps] ${dateKey}: ${sessions.length} sessions`)
      }
      
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
      
      return {
        'data-date-key': dateKey,
        'data-has-sessions': hasSessions ? 'true' : undefined,
        'data-session-times': hasSessions ? sessionTimesStr : undefined,
        'data-extra-count': extraCount > 0 ? extraCount.toString() : undefined,
        style: {
          cursor: 'pointer',
          position: 'relative',
          ...(hasSessions ? {
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
          } : {}),
        },
      }
    } catch (error) {
      console.error('[ClientDashboard getDayProps] Error:', error)
      return { style: { cursor: 'pointer' } }
    }
  }, [sessionsByDate])

  // Handle date click
  const handleDateClick = (date) => {
    if (!date) return
    const sessions = getSessionsForDate(date)
    if (sessions.length > 0) {
      setSelectedDate(date)
      openModal()
    }
  }

  // Inject session times into DOM after calendar renders
  useEffect(() => {
    if (!calendarWrapperRef.current) {
      console.log('[ClientDashboard] Calendar wrapper not ready')
      return
    }
    
    if (sessionsByDate.size === 0) {
      console.log('[ClientDashboard] No sessions to display')
      return
    }

    console.log('[ClientDashboard] Injecting session times, mapSize:', sessionsByDate.size)
    
    // Function to inject session times
    const injectSessionTimes = () => {
      // Try multiple selectors to find calendar day elements
      let dayElements = calendarWrapperRef.current.querySelectorAll('[data-mantine-calendar-day]')
      
      // If that doesn't work, try finding table cells
      if (dayElements.length === 0) {
        dayElements = calendarWrapperRef.current.querySelectorAll('table tbody td button, table tbody td [role="button"]')
      }
      
      // If still nothing, try finding any button in the calendar
      if (dayElements.length === 0) {
        dayElements = calendarWrapperRef.current.querySelectorAll('button[type="button"]')
      }
      
      console.log('[ClientDashboard] Found', dayElements.length, 'day elements')
      
      if (dayElements.length === 0) {
        console.log('[ClientDashboard] No day elements found, will retry...')
        return false
      }
      
      let injectedCount = 0
      dayElements.forEach((dayEl) => {
        // Try to get the date from various attributes
        const dateKey = dayEl.getAttribute('data-date-key') || 
                       dayEl.getAttribute('data-day') ||
                       dayEl.closest('[data-date-key]')?.getAttribute('data-date-key')
        
        const hasSessions = dayEl.getAttribute('data-has-sessions') === 'true' ||
                          dayEl.closest('[data-has-sessions="true"]') !== null
        
        let sessionTimes = dayEl.getAttribute('data-session-times') ||
                         dayEl.closest('[data-session-times]')?.getAttribute('data-session-times')
        
        // If we don't have sessionTimes from attributes, try to get it from sessionsByDate
        if (!sessionTimes && dateKey) {
          const sessions = sessionsByDate.get(dateKey) || []
          if (sessions.length > 0) {
            const times = sessions.map(session => {
              if (session.session_time) {
                const [hours, minutes] = session.session_time.split(':')
                const hour = parseInt(hours)
                const ampm = hour >= 12 ? 'PM' : 'AM'
                const displayHour = hour % 12 || 12
                return `${displayHour}:${minutes.padStart(2, '0')} ${ampm}`
              }
              return null
            }).filter(Boolean).slice(0, 2)
            sessionTimes = times.join(', ')
            
            // Set the attribute for future reference
            dayEl.setAttribute('data-date-key', dateKey)
            dayEl.setAttribute('data-has-sessions', 'true')
            dayEl.setAttribute('data-session-times', sessionTimes)
          }
        }
        
        if (dateKey && (dateKey.startsWith('2025-12') || dateKey.startsWith('2026-01'))) {
          console.log(`[ClientDashboard] Checking ${dateKey}: hasSessions=${hasSessions}, times=${sessionTimes}`)
        }
        
        if (hasSessions && sessionTimes) {
          // Remove existing session time element
          const existing = dayEl.querySelector('.session-times')
          if (existing) existing.remove()
          
          // Create and add session times element
          const sessionEl = document.createElement('div')
          sessionEl.className = 'session-times'
          sessionEl.style.cssText = 'font-size: 0.65rem; line-height: 1.2; color: rgba(34, 197, 94, 0.95); font-weight: 500; margin-top: 0.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; flex-shrink: 0;'
          sessionEl.textContent = sessionTimes
          
          const extraCount = dayEl.getAttribute('data-extra-count') ||
                           dayEl.closest('[data-extra-count]')?.getAttribute('data-extra-count')
          if (extraCount && parseInt(extraCount) > 0) {
            sessionEl.textContent = `${sessionTimes} +${extraCount} more`
          }
          
          dayEl.appendChild(sessionEl)
          injectedCount++
          
          if (dateKey && (dateKey.startsWith('2025-12') || dateKey.startsWith('2026-01'))) {
            console.log(`[ClientDashboard] ✅ Injected session times for ${dateKey}:`, sessionEl.textContent)
          }
        } else {
          const existing = dayEl.querySelector('.session-times')
          if (existing) existing.remove()
        }
      })
      
      console.log('[ClientDashboard] Injected session times into', injectedCount, 'days')
      return true
    }
    
    // Try immediately
    if (!injectSessionTimes()) {
      // If it fails, wait a bit and try again
      const timeout1 = setTimeout(() => {
        if (!injectSessionTimes()) {
          // Try one more time after a longer delay
          const timeout2 = setTimeout(() => {
            injectSessionTimes()
          }, 500)
          return () => clearTimeout(timeout2)
        }
      }, 100)
      return () => clearTimeout(timeout1)
    }
  }, [sessionsByDate, calendarKey])

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
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">My Space</Title>

      <Paper p="lg" shadow="sm" withBorder style={{ minHeight: '600px' }}>
        <Title order={3} mb="md">Upcoming Sessions</Title>
        {upcomingSessions.length === 0 ? (
          <Stack gap="xs" align="center" justify="center" style={{ minHeight: '500px' }}>
            <Text c="dimmed" size="lg">No upcoming sessions scheduled</Text>
            <Text size="sm" c="dimmed">Your trainer will schedule sessions for you</Text>
          </Stack>
        ) : (
          <div ref={calendarWrapperRef} className="client-calendar-wrapper" style={{ width: '100%' }}>
            <Calendar
              key={calendarKey}
              value={null}
              onChange={handleDateClick}
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

