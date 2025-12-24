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
  const [displayedMonth, setDisplayedMonth] = useState(new Date())
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
    // Handle both Date objects and date strings from Mantine Calendar
    let dateObj = date
    
    // If it's a string, convert to Date
    if (typeof date === 'string') {
      dateObj = new Date(date)
    }
    
    // Validate the date
    if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return { style: { cursor: 'pointer' } }
    }
    
    try {
      const year = dateObj.getFullYear()
      const month = String(dateObj.getMonth() + 1).padStart(2, '0')
      const day = String(dateObj.getDate()).padStart(2, '0')
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

  // Handle month change from Calendar component
  const handleMonthChange = (date) => {
    console.log('[ClientDashboard] 🔵 handleMonthChange CALLED with date:', date)
    console.log('[ClientDashboard] 🔵 New month:', date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
    console.log('[ClientDashboard] 🔵 Current displayedMonth before update:', displayedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
    setDisplayedMonth(date)
    console.log('[ClientDashboard] 🔵 setDisplayedMonth called, state update queued')
  }

  // Debug: Log when displayedMonth changes
  useEffect(() => {
    console.log('[ClientDashboard] 🟢 displayedMonth state changed to:', displayedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
  }, [displayedMonth])

  // Inject session times into DOM after calendar renders or month changes
  useEffect(() => {
    console.log('[ClientDashboard] 🟡 Injection effect triggered')
    console.log('[ClientDashboard] 🟡 calendarWrapperRef.current:', !!calendarWrapperRef.current)
    console.log('[ClientDashboard] 🟡 sessionsByDate.size:', sessionsByDate.size)
    console.log('[ClientDashboard] 🟡 displayedMonth:', displayedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
    console.log('[ClientDashboard] 🟡 calendarKey:', calendarKey)
    
    if (!calendarWrapperRef.current || sessionsByDate.size === 0) {
      console.log('[ClientDashboard] 🟡 Injection effect EXITING early - missing ref or no sessions')
      return
    }

    const injectSessionTimes = () => {
      try {
        if (!calendarWrapperRef.current) return
        
        // Find all calendar day buttons - try multiple selectors
        // First, try to find elements with data-date-key attribute (set by getDayProps)
        let dayElements = calendarWrapperRef.current.querySelectorAll('[data-date-key]')
        
        // If that doesn't work, try Mantine's data attribute
        if (dayElements.length === 0) {
          dayElements = calendarWrapperRef.current.querySelectorAll('[data-mantine-calendar-day]')
        }
        
        // Fallback to table buttons
        if (dayElements.length === 0) {
          dayElements = calendarWrapperRef.current.querySelectorAll('table tbody td button')
        }
        
        // Last resort: all buttons
        if (dayElements.length === 0) {
          dayElements = calendarWrapperRef.current.querySelectorAll('button[type="button"]')
        }
        
        console.log(`[ClientDashboard] Found ${dayElements.length} day elements using selector`)
        
        // Get month/year from displayedMonth state (controlled)
        const month = displayedMonth.getMonth() + 1
        const year = displayedMonth.getFullYear()
        const monthName = displayedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        
        console.log(`[ClientDashboard] Injecting for month: ${monthName}, Found ${dayElements.length} day elements, SessionsByDate has ${sessionsByDate.size} dates`)
        
        let injectedCount = 0
        let processedCount = 0
        dayElements.forEach((dayEl) => {
          try {
            processedCount++
            // Try to get date key from data attribute first (set by getDayProps)
            let dateKey = dayEl.getAttribute('data-date-key')
            
            // Also check parent elements (Mantine might wrap the button)
            if (!dateKey && dayEl.parentElement) {
              dateKey = dayEl.parentElement.getAttribute('data-date-key')
            }
            
            // If no data attribute, extract from button text and calendar context
            if (!dateKey) {
              // Get the day number from the button text (it's usually the first text node)
              // Look for the first number in the text content
              const dayText = dayEl.textContent?.trim() || ''
              // Extract just the number (remove any session times that might already be there)
              const dayMatch = dayText.match(/^(\d+)/)
              const dayNumber = dayMatch ? parseInt(dayMatch[1]) : parseInt(dayText)
              
              if (!isNaN(dayNumber) && dayNumber >= 1 && dayNumber <= 31) {
                dateKey = `${year}-${String(month).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`
                // Set the attribute on both the element and its parent for future reference
                dayEl.setAttribute('data-date-key', dateKey)
                if (dayEl.parentElement) {
                  dayEl.parentElement.setAttribute('data-date-key', dateKey)
                }
                console.log(`[ClientDashboard] Extracted dateKey ${dateKey} from day number ${dayNumber}`)
              }
            }
            
            if (!dateKey) {
              return // Skip if we can't determine the date
            }
            
            const sessions = sessionsByDate.get(dateKey) || []
            if (sessions.length === 0) {
              return // No sessions for this date
            }
            
            console.log(`[ClientDashboard] Found ${sessions.length} sessions for ${dateKey}`)
            
            // Remove existing session time element
            const existing = dayEl.querySelector('.session-times')
            if (existing) existing.remove()
            
            // Format session times
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
            
            const sessionTimesStr = times.join(', ')
            const extraCount = sessions.length > 2 ? sessions.length - 2 : 0
            
            // Create and add session times element
            const sessionEl = document.createElement('div')
            sessionEl.className = 'session-times'
            sessionEl.style.cssText = 'font-size: 0.65rem; line-height: 1.2; color: rgba(34, 197, 94, 0.95); font-weight: 500; margin-top: 0.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; flex-shrink: 0;'
            sessionEl.textContent = extraCount > 0 ? `${sessionTimesStr} +${extraCount} more` : sessionTimesStr
            
            dayEl.appendChild(sessionEl)
            injectedCount++
            
            if (dateKey.startsWith('2025-12') || dateKey.startsWith('2026-01') || dateKey.startsWith('2026-02')) {
              console.log(`[ClientDashboard] ✅ Added session times to ${dateKey}:`, sessionEl.textContent)
            }
          } catch (err) {
            console.error('[ClientDashboard] Error processing day:', err)
          }
        })
        
        console.log(`[ClientDashboard] Processed ${processedCount} day elements, injected into ${injectedCount} days for ${monthName}`)
        if (injectedCount > 0) {
          console.log(`[ClientDashboard] ✅ Successfully injected session times into ${injectedCount} days`)
        } else if (sessionsByDate.size > 0) {
          console.warn(`[ClientDashboard] ⚠️ No sessions injected despite having ${sessionsByDate.size} dates with sessions`)
          console.log(`[ClientDashboard] Available session dates:`, Array.from(sessionsByDate.keys()).slice(0, 10))
        }
      } catch (err) {
        console.error('[ClientDashboard] Error in injectSessionTimes:', err)
      }
    }
    
    // Try multiple times with delays to catch calendar rendering
    injectSessionTimes()
    const timeout1 = setTimeout(injectSessionTimes, 200)
    const timeout2 = setTimeout(injectSessionTimes, 500)
    const timeout3 = setTimeout(injectSessionTimes, 1000)
    
    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
      clearTimeout(timeout3)
    }
  }, [sessionsByDate, calendarKey, displayedMonth])

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
          <div 
            ref={calendarWrapperRef} 
            className="client-calendar-wrapper" 
            style={{ width: '100%' }}
            onClick={(e) => {
              // Debug: Log all clicks to see what's being clicked
              const target = e.target
              console.log('[ClientDashboard] 🟪 Click detected on:', {
                tagName: target.tagName,
                textContent: target.textContent?.trim(),
                className: target.className,
                id: target.id,
                role: target.getAttribute('role'),
                'data-mantine': target.getAttribute('data-mantine-calendar-day') || target.getAttribute('data-mantine-calendar-month-label')
              })
              
              // Check if it's a navigation button
              if (target.tagName === 'BUTTON' || target.closest('button')) {
                const button = target.tagName === 'BUTTON' ? target : target.closest('button')
                const buttonText = button?.textContent?.trim() || ''
                console.log('[ClientDashboard] 🟪 Button clicked:', buttonText)
                
                // If it's a navigation button, manually trigger month change detection
                if (buttonText === '<' || buttonText === '>' || buttonText.includes('Previous') || buttonText.includes('Next') || button?.getAttribute('aria-label')?.includes('month')) {
                  console.log('[ClientDashboard] 🟪 Navigation button detected! Waiting for DOM update...')
                  setTimeout(() => {
                    // Try to read the new month from the calendar header
                    const header = calendarWrapperRef.current?.querySelector('[data-mantine-calendar-month-label]')?.textContent ||
                                  calendarWrapperRef.current?.querySelector('h2, h3')?.textContent ||
                                  ''
                    console.log('[ClientDashboard] 🟪 After navigation click, header is:', header)
                    
                    if (header) {
                      const monthMatch = header.match(/(January|February|March|April|May|June|July|August|September|October|November|December)/i)
                      const yearMatch = header.match(/(\d{4})/)
                      
                      if (monthMatch && yearMatch) {
                        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
                        const month = monthNames.indexOf(monthMatch[1].toLowerCase())
                        const year = parseInt(yearMatch[1])
                        const newMonth = new Date(year, month, 1)
                        
                        console.log('[ClientDashboard] 🟪 Parsed new month from header:', newMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
                        console.log('[ClientDashboard] 🟪 Current displayedMonth:', displayedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
                        
                        if (newMonth.getTime() !== displayedMonth.getTime()) {
                          console.log('[ClientDashboard] 🟪 Months differ! Updating displayedMonth state')
                          setDisplayedMonth(newMonth)
                        } else {
                          console.log('[ClientDashboard] 🟪 Months are the same, no update needed')
                        }
                      }
                    }
                  }, 200)
                }
              }
            }}
          >
            <Calendar
              key={calendarKey}
              value={null}
              month={displayedMonth}
              onMonthChange={(date) => {
                console.log('[ClientDashboard] 🔴 Calendar onMonthChange prop called with:', date)
                if (date) {
                  handleMonthChange(date)
                } else {
                  console.log('[ClientDashboard] 🔴 onMonthChange called with null/undefined!')
                }
              }}
              onChange={(date) => {
                console.log('[ClientDashboard] 🔴 Calendar onChange prop called with:', date)
                handleDateClick(date)
              }}
              getDayProps={(date) => {
                // Handle both Date objects and date strings
                let dateObj = date
                if (typeof date === 'string') {
                  dateObj = new Date(date)
                }
                
                // Validate date before processing
                if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
                  // Only log if it's actually invalid (not just a string that needs conversion)
                  if (date && typeof date !== 'string') {
                    console.log('[ClientDashboard] 🟣 getDayProps called with invalid date:', date)
                  }
                  return { style: { cursor: 'pointer' } }
                }
                // Log first few calls to see if getDayProps is being called for new month
                if (dateObj.getDate() <= 3) {
                  console.log('[ClientDashboard] 🟣 getDayProps called for date:', dateObj.toLocaleDateString())
                }
                return getDayProps(date)
              }}
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

