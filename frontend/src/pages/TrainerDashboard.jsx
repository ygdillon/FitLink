import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Container, Grid, Paper, Title, Text, Stack, Group, Badge, Loader, Button, Anchor, Modal, Divider } from '@mantine/core'
import { Calendar } from '@mantine/dates'
import { useDisclosure } from '@mantine/hooks'
import api from '../services/api'
import './Dashboard.css'
import './TrainerDashboard.css'

function TrainerDashboard() {
  const [revenue, setRevenue] = useState({ total: 0, thisMonth: 0, thisWeek: 0 })
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [revenueRes, sessionsRes] = await Promise.all([
        api.get('/payments/trainer/history').catch(() => ({ data: [] })),
        api.get('/schedule/trainer/upcoming').catch(() => ({ data: [] }))
      ])
      
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
      console.log('[Fetch] Fetched sessions:', sessions.length)
      if (sessions.length > 0) {
        console.log('[Fetch] First session:', {
          id: sessions[0].id,
          session_date: sessions[0].session_date,
          trainer_id: sessions[0].trainer_id,
          client_name: sessions[0].client_name,
          status: sessions[0].status
        })
        // Test date extraction
        const testDate = sessions[0].session_date
        const extracted = typeof testDate === 'string' ? testDate.split('T')[0].split(' ')[0] : 'N/A'
        console.log('[Fetch] Date extraction test:', { original: testDate, extracted })
      } else {
        console.warn('[Fetch] No sessions found. Make sure you have scheduled sessions for your clients.')
      }
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
        // Normalize date key to YYYY-MM-DD format
        // Backend returns ISO format like '2025-12-23T08:00:00.000Z'
        // We need to extract just the date part to avoid timezone issues
        let dateKey
        try {
          if (typeof session.session_date === 'string') {
            // Extract the date part directly from ISO string (YYYY-MM-DD)
            // This avoids timezone conversion issues - we want the date as stored in the database
            const dateStr = session.session_date.trim()
            dateKey = dateStr.split('T')[0].split(' ')[0]
            
            // Validate it's in YYYY-MM-DD format
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
              console.warn('Invalid date format after extraction:', session.session_date, 'extracted:', dateKey)
              // Fallback: parse as Date and use UTC methods
              const date = new Date(session.session_date)
              if (!isNaN(date.getTime())) {
                dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
              } else {
                console.warn('Invalid date format:', session.session_date)
                return
              }
            }
          } else {
            // If it's a Date object, use UTC methods to avoid timezone shift
            const date = new Date(session.session_date)
            if (isNaN(date.getTime())) {
              console.warn('Invalid date object:', session.session_date)
              return
            }
            // Use UTC methods to get the date without timezone conversion
            dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
          }
          
          if (!grouped.has(dateKey)) {
            grouped.set(dateKey, [])
          }
          grouped.get(dateKey).push(session)
          console.log(`[Grouping] Added session ${session.id} to date ${dateKey} (from ${session.session_date})`)
        } catch (error) {
          console.error('Error processing session date:', session.session_date, error)
        }
      }
    })
    console.log('[SessionsByDate] Sessions grouped by date:', Array.from(grouped.entries()).slice(0, 10))
    console.log('[SessionsByDate] Total sessions:', upcomingSessions.length, 'Grouped dates:', grouped.size)
    console.log('[SessionsByDate] All date keys:', Array.from(grouped.keys()))
    console.log('[SessionsByDate] December 2025 dates:', Array.from(grouped.keys()).filter(key => key.startsWith('2025-12')))
    return grouped
  }, [upcomingSessions])

  // Get sessions for a specific date
  const getSessionsForDate = (date) => {
    if (!date) return []
    try {
      // Normalize date to YYYY-MM-DD format - use local date components
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateKey = `${year}-${month}-${day}`
      const sessions = sessionsByDate.get(dateKey) || []
      if (sessions.length > 0) {
        console.log(`[getSessionsForDate] Found ${sessions.length} sessions for ${dateKey}`)
      }
      return sessions
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
    <Container size="xl" py="md" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Grid gutter="md" style={{ height: '100%', flex: 1, minHeight: 0, alignItems: 'stretch' }}>
        {/* Left Sidebar - Total Revenue */}
        <Grid.Col span={{ base: 12, md: 3 }} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Paper p="md" shadow="sm" withBorder style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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

        {/* Right Panel - Schedule Calendar - Full Height */}
        <Grid.Col span={{ base: 12, md: 9 }} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div className="calendar-paper-wrapper" style={{ height: '100%', position: 'relative', border: '1px solid var(--mantine-color-gray-4)', borderRadius: 'var(--mantine-radius-md)', overflow: 'hidden' }}>
            <Paper 
              p="lg" 
              shadow="md" 
              withBorder={false}
              className="calendar-paper"
              style={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                minHeight: 0,
                width: '100%',
                boxSizing: 'border-box',
                position: 'relative',
                border: 'none',
                borderRadius: 0,
                boxShadow: 'none'
              }}
            >
            <Group justify="flex-end" mb="md" style={{ flexShrink: 0, height: '2.5rem' }}>
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
              <Stack gap="xs" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, margin: 0, padding: 0, width: '100%', paddingBottom: '0.5rem' }}>
                <div className="calendar-wrapper" style={{ flex: 1, overflow: 'auto', minHeight: 0, margin: 0, padding: 0, width: '100%' }}>
                  <Calendar
                    value={null}
                    onChange={handleDateClick}
                    getDayProps={(date) => {
                      // Validate that date is a Date object
                      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
                        return { style: { cursor: 'pointer' } }
                      }
                      try {
                        // Normalize date to YYYY-MM-DD format
                        // Use the date directly without timezone conversion to match session dates
                        const year = date.getFullYear()
                        const month = String(date.getMonth() + 1).padStart(2, '0')
                        const day = String(date.getDate()).padStart(2, '0')
                        const dateKey = `${year}-${month}-${day}`
                        
                        // Check if this is December 2025 or a date with sessions
                        const isDecember2025 = date.getMonth() === 11 && date.getFullYear() === 2025
                        const isTargetDate = dateKey === '2025-12-30' // Focus on the date we know has sessions
                        
                        // Always log December 30th and any date that should have sessions
                        if (isTargetDate || (isDecember2025 && date.getDate() >= 28)) {
                          const availableKeys = Array.from(sessionsByDate.keys())
                          const hasKey = sessionsByDate.has(dateKey)
                          console.log(`[Calendar] Checking date ${dateKey} (Dec ${day}, 2025)`)
                          console.log(`[Calendar] Map has key? ${hasKey}, Map size: ${sessionsByDate.size}`)
                          console.log(`[Calendar] Available keys:`, availableKeys)
                          if (isTargetDate) {
                            console.log(`[Calendar] ⚠️ CRITICAL: Date ${dateKey} should have sessions!`)
                            console.log(`[Calendar] Map contents:`, Array.from(sessionsByDate.entries()))
                            // Try direct lookup
                            const directLookup = sessionsByDate.get(dateKey)
                            console.log(`[Calendar] Direct lookup for ${dateKey}:`, directLookup)
                            console.log(`[Calendar] Type check - dateKey type:`, typeof dateKey, 'Map key types:', Array.from(sessionsByDate.keys()).map(k => typeof k))
                          }
                        }
                        
                        const hasSessions = sessionsByDate.has(dateKey)
                        
                        // Force highlight for target dates if they exist in the map
                        if (isTargetDate && sessionsByDate.has(dateKey)) {
                          console.log(`[Calendar] ✅ FORCING highlight for ${dateKey}`)
                        }
                        
                        // Enhanced debug logging - log all dates in December and when sessions are found
                        if (date.getMonth() === 11 || hasSessions) { // December is month 11 (0-indexed)
                          if (hasSessions) {
                            console.log(`[Calendar] ✅ Date ${dateKey} HAS SESSIONS:`, sessionsByDate.get(dateKey))
                          } else if (date.getMonth() === 11 && date.getFullYear() === 2025) {
                            // Log December dates to see what keys are being checked
                            console.log(`[Calendar] Date ${dateKey}: hasSessions=${hasSessions}, available December keys:`, Array.from(sessionsByDate.keys()).filter(k => k.startsWith('2025-12')))
                          }
                        }
                        
                        // Force highlight if it's a target date and exists in map
                        const shouldHighlight = hasSessions || (isTargetDate && sessionsByDate.has(dateKey))
                        
                        return {
                          'data-has-sessions': shouldHighlight ? 'true' : undefined,
                          style: shouldHighlight
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
                        height: '4.5rem',
                        minHeight: '4.5rem',
                        width: '100%',
                        borderRadius: 0,
                        border: 'none',
                        margin: 0,
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'flex-start',
                        padding: '0.4rem',
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
                <Group justify="center" style={{ flexShrink: 0, height: '2rem', paddingTop: '0.75rem', paddingBottom: '0.75rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                  <Badge size="md" variant="dot" color="green" radius="md">
                    Has Sessions
                  </Badge>
                </Group>
              </Stack>
            )}
            </Paper>
          </div>
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

