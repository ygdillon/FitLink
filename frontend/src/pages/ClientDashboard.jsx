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
      console.log('[STEP 1] 🔵 Starting data fetch from API...')
      const sessionsRes = await api.get('/schedule/client/upcoming').catch(() => ({ data: [] }))
      const sessions = sessionsRes.data || []
      console.log('[STEP 1] ✅ Fetched', sessions.length, 'sessions from API')
      
      if (sessions.length > 0) {
        console.log('[STEP 1] 📋 First session sample:', {
          id: sessions[0].id,
          session_date: sessions[0].session_date,
          session_time: sessions[0].session_time,
          status: sessions[0].status
        })
        console.log('[STEP 1] 📋 All session dates:', sessions.map(s => s.session_date).slice(0, 5))
      } else {
        console.warn('[STEP 1] ⚠️ No sessions returned from API!')
      }
      
      setUpcomingSessions(sessions)
      // Force calendar re-render when sessions are loaded
      setCalendarKey(prev => prev + 1)
    } catch (error) {
      console.error('[STEP 1] ❌ Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group sessions by date for calendar display
  const sessionsByDate = useMemo(() => {
    console.log('[STEP 2] 🔵 Grouping sessions by date, total sessions:', upcomingSessions.length)
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
      } else {
        console.warn('[STEP 2] ⚠️ Session missing session_date:', session.id)
      }
    })
    console.log('[STEP 2] ✅ Sessions grouped into', grouped.size, 'unique dates')
    console.log('[STEP 2] 📅 Date keys:', Array.from(grouped.keys()).sort())
    // Log a sample of what's in each date
    if (grouped.size > 0) {
      const firstDate = Array.from(grouped.keys())[0]
      console.log('[STEP 2] 📅 Sample date', firstDate, 'has', grouped.get(firstDate).length, 'sessions')
    }
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
      
      // Log for dates with sessions (only first few to avoid spam)
      if (hasSessions) {
        const sessionCount = sessions.length
        console.log(`[STEP 3] 🟢 getDayProps for ${dateKey}: ${sessionCount} sessions, will highlight`)
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
      
      const props = {
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
      
      if (hasSessions) {
        console.log(`[STEP 3] 🟢 Returning props for ${dateKey} with data-date-key="${dateKey}", data-has-sessions="true"`)
      }
      
      return props
    } catch (error) {
      console.error('[STEP 3] ❌ getDayProps Error:', error)
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
        console.log('[STEP 4] 🔵 Starting session time injection...')
        
        if (!calendarWrapperRef.current) {
          console.warn('[STEP 4] ❌ calendarWrapperRef.current is null!')
          return
        }
        
        // Use the same approach as TrainerDashboard - find Mantine calendar day elements
        const dayElements = calendarWrapperRef.current.querySelectorAll('[data-mantine-calendar-day]')
        console.log(`[STEP 4] ✅ Found ${dayElements.length} calendar day elements`)
        
        if (dayElements.length === 0) {
          console.warn('[STEP 4] ❌ No calendar day elements found!')
          // Try to see what's actually in the wrapper
          console.log('[STEP 4] 🔍 Calendar wrapper HTML structure:', calendarWrapperRef.current.innerHTML.substring(0, 500))
          return
        }
        
        // Get month/year from displayedMonth state (controlled)
        const month = displayedMonth.getMonth() + 1
        const year = displayedMonth.getFullYear()
        const monthName = displayedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        
        console.log(`[STEP 4] 📅 Injecting for month: ${monthName}`)
        console.log(`[STEP 4] 📊 SessionsByDate has ${sessionsByDate.size} dates with sessions`)
        console.log(`[STEP 4] 📅 Available session dates:`, Array.from(sessionsByDate.keys()).sort())
        
        let injectedCount = 0
        let processedCount = 0
        let foundWithDataAttr = 0
        let extractedFromText = 0
        let matchedWithSessions = 0
        
        // Sample a few elements to inspect their structure
        if (dayElements.length > 0) {
          const sampleEl = dayElements[0]
          console.log('[STEP 4] 🔍 Sample day element:', {
            tagName: sampleEl.tagName,
            className: sampleEl.className,
            textContent: sampleEl.textContent?.trim().substring(0, 30),
            hasDataDateKey: !!sampleEl.getAttribute('data-date-key'),
            hasDataHasSessions: !!sampleEl.getAttribute('data-has-sessions'),
            attributes: Array.from(sampleEl.attributes).map(attr => `${attr.name}="${attr.value}"`).join(', ')
          })
        }
        
        dayElements.forEach((dayEl, index) => {
          try {
            processedCount++
            
            // Step 1: Try to get date key from data attribute (set by getDayProps)
            let dateKey = dayEl.getAttribute('data-date-key')
            
            if (dateKey) {
              foundWithDataAttr++
              if (index < 5) {
                console.log(`[STEP 4] ✅ Element ${index} has data-date-key="${dateKey}"`)
              }
            } else {
              if (index < 5) {
                console.log(`[STEP 4] ⚠️ Element ${index} missing data-date-key attribute`)
              }
            }
            
            // Step 2: If no data attribute, extract from element's text content
            if (!dateKey) {
              const dayText = dayEl.textContent?.trim() || ''
              const dayMatch = dayText.match(/(\d+)/)
              const dayNumber = dayMatch ? parseInt(dayMatch[1]) : null
              
              if (dayNumber && dayNumber >= 1 && dayNumber <= 31) {
                dateKey = `${year}-${String(month).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`
                dayEl.setAttribute('data-date-key', dateKey)
                extractedFromText++
                if (index < 5) {
                  console.log(`[STEP 4] 📝 Extracted dateKey ${dateKey} from day number ${dayNumber}`)
                }
              }
            }
            
            if (!dateKey) {
              return // Can't determine date, skip
            }
            
            // Step 3: Check if this date has sessions
            const sessions = sessionsByDate.get(dateKey) || []
            if (sessions.length === 0) {
              return // No sessions for this date
            }
            
            matchedWithSessions++
            console.log(`[STEP 4] ✅ Date ${dateKey} has ${sessions.length} sessions - proceeding with injection`)
            
            // Step 4: Remove any existing session time element
            const existing = dayEl.querySelector('.session-times')
            if (existing) {
              existing.remove()
            }
            
            // Step 5: Format session times
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
            
            // Step 6: Create and inject session times element
            const sessionEl = document.createElement('div')
            sessionEl.className = 'session-times'
            sessionEl.style.cssText = 'font-size: 0.65rem; line-height: 1.2; color: rgba(34, 197, 94, 0.95); font-weight: 500; margin-top: 0.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; flex-shrink: 0;'
            sessionEl.textContent = extraCount > 0 ? `${sessionTimesStr} +${extraCount} more` : sessionTimesStr
            
            // Append to the day element
            dayEl.appendChild(sessionEl)
            injectedCount++
            
            console.log(`[STEP 4] ✅ Injected "${sessionEl.textContent}" into ${dateKey}`)
            
            // Verify it was added
            const verify = dayEl.querySelector('.session-times')
            if (!verify) {
              console.error(`[STEP 4] ❌ Session element not found after injection for ${dateKey}!`)
            } else {
              console.log(`[STEP 4] ✅ Verified session element exists in DOM for ${dateKey}`)
              // Also check if it's visible
              const rect = verify.getBoundingClientRect()
              console.log(`[STEP 4] 📐 Session element dimensions:`, { width: rect.width, height: rect.height, visible: rect.width > 0 && rect.height > 0 })
            }
          } catch (err) {
            console.error('[STEP 4] ❌ Error processing day element:', err, dayEl)
          }
        })
        
        console.log(`[STEP 4] 📊 Summary:`)
        console.log(`  - Processed: ${processedCount} days`)
        console.log(`  - Found with data-date-key: ${foundWithDataAttr}`)
        console.log(`  - Extracted from text: ${extractedFromText}`)
        console.log(`  - Matched with sessions: ${matchedWithSessions}`)
        console.log(`  - Injected: ${injectedCount} session times`)
        
        if (injectedCount === 0 && sessionsByDate.size > 0) {
          console.error(`[STEP 4] ❌ NO SESSIONS INJECTED!`)
          console.error(`[STEP 4] Debug info:`, {
            dayElementsFound: dayElements.length,
            sessionsByDateSize: sessionsByDate.size,
            month: monthName,
            availableDates: Array.from(sessionsByDate.keys()).sort(),
            foundWithDataAttr,
            extractedFromText,
            matchedWithSessions
          })
        } else if (injectedCount > 0) {
          console.log(`[STEP 4] ✅ Successfully injected ${injectedCount} session times!`)
        }
      } catch (err) {
        console.error('[STEP 4] ❌ Error in injectSessionTimes:', err)
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

