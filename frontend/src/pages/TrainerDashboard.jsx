import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Container, Grid, Paper, Title, Text, Stack, Group, Badge, Loader, Button, Anchor, Modal, Divider, useMantineTheme, ScrollArea, ActionIcon, useMantineColorScheme } from '@mantine/core'
import { Calendar } from '@mantine/dates'
import { useDisclosure } from '@mantine/hooks'
import api from '../services/api'
import './Dashboard.css'
import './TrainerDashboard.css'

// Icon components for alerts
const IconBell = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

const IconUserPlus = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </svg>
)

const IconCheck = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const IconAlertTriangle = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

const IconX = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

function TrainerDashboard() {
  const theme = useMantineTheme()
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const [revenue, setRevenue] = useState({ total: 0, thisMonth: 0, thisWeek: 0 })
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
  const [displayedMonth, setDisplayedMonth] = useState(new Date())
  const navigate = useNavigate()
  const [alertsLoading, setAlertsLoading] = useState(true)
  const [alertsData, setAlertsData] = useState({
    items: [],
    counts: { alerts: 0, requests: 0, checkIns: 0, total: 0 }
  })

  useEffect(() => {
    fetchDashboardData()
    fetchAlertsWidget()
  }, [])

  useEffect(() => {
    // Refresh alerts every 30 seconds
    const interval = setInterval(() => {
      fetchAlertsWidget()
    }, 30000)
    return () => clearInterval(interval)
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
      setUpcomingSessions(sessions)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAlertsWidget = async () => {
    try {
      setAlertsLoading(true)
      const response = await api.get('/trainer/analytics/alerts-widget')
      setAlertsData(response.data || { items: [], counts: { alerts: 0, requests: 0, checkIns: 0, total: 0 } })
    } catch (error) {
      console.error('Error fetching alerts widget:', error)
      setAlertsData({ items: [], counts: { alerts: 0, requests: 0, checkIns: 0, total: 0 } })
    } finally {
      setAlertsLoading(false)
    }
  }

  const markAlertAsRead = async (alertId) => {
    try {
      await api.put(`/trainer/alerts/${alertId}/read`)
      fetchAlertsWidget()
    } catch (error) {
      console.error('Error marking alert as read:', error)
    }
  }

  const getAlertIcon = (item) => {
    if (item.type === 'request') return <IconUserPlus size={18} color={theme.colors[getAlertColor(item)][6]} />
    if (item.type === 'checkin') return <IconCheck size={18} color={theme.colors[getAlertColor(item)][6]} />
    if (item.alert_type === 'low_rating' || item.alert_type === 'pain_report') return <IconAlertTriangle size={18} color={theme.colors[getAlertColor(item)][6]} />
    return <IconBell size={18} color={theme.colors[getAlertColor(item)][6]} />
  }

  const getAlertColor = (item) => {
    if (item.type === 'request') return 'blue'
    if (item.type === 'checkin') return 'green'
    if (item.severity === 'urgent') return 'red'
    if (item.severity === 'high') return 'orange'
    if (item.severity === 'medium') return 'yellow'
    return 'blue'
  }

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid date'
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const handleAlertItemClick = (item) => {
    // Mark alert as read if it's unread
    if (!item.is_read && item.id) {
      markAlertAsRead(item.id)
    }
    
    // Navigate based on alert type
    if (item.type === 'request') {
      navigate('/trainer/requests')
    } else if (item.type === 'checkin' || item.type === 'alert') {
      navigate(`/trainer/clients/${item.client_id}`)
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
        } catch (error) {
          console.error('Error processing session date:', session.session_date, error)
        }
      }
    })
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

  // Get sessions for a specific date
  const getSessionsForDate = useCallback((date) => {
    if (!date) return []
    try {
      const dateKey = getDateKey(date)
      if (!dateKey) return []
      return sessionsByDate.get(dateKey) || []
    } catch (error) {
      console.error('Error getting sessions for date:', error)
      return []
    }
  }, [sessionsByDate, getDateKey])

  // Handle date click - open modal to show session details
  const handleDateClick = useCallback((date) => {
    if (!date) return
    setSelectedDate(date)
    openModal()
  }, [openModal])

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
      onClick: (e) => {
        e.preventDefault()
        e.stopPropagation()
        handleDateClick(dateObj)
      },
      style: {
        cursor: 'pointer',
        position: 'relative',
        ...(hasSessions ? {
          backgroundColor: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
        } : {}),
      },
    }
  }, [sessionsByDate, getDateKey, handleDateClick])


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

            <Divider my="md" />

            {/* Alerts Widget */}
            <Stack gap="xs" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <IconBell size={18} color={theme.colors.blue[6]} />
                  <Title order={4}>Alerts</Title>
                </Group>
                {alertsData.counts.total > 0 && (
                  <Badge color="blue" variant="filled" size="sm">
                    {alertsData.counts.total}
                  </Badge>
                )}
              </Group>

              {alertsLoading ? (
                <Group justify="center" py="md">
                  <Loader size="sm" />
                </Group>
              ) : alertsData.items.length === 0 ? (
                <Paper p="md" withBorder style={{ backgroundColor: isDark ? theme.colors.dark[7] : theme.colors.gray[0] }}>
                  <Stack align="center" gap="xs">
                    <IconBell size={32} color={isDark ? theme.colors.gray[6] : theme.colors.gray[5]} />
                    <Text size="sm" c="dimmed" ta="center">No new alerts</Text>
                  </Stack>
                </Paper>
              ) : (
                <ScrollArea style={{ flex: 1, minHeight: 0 }}>
                  <Stack gap="xs">
                    {alertsData.items.slice(0, 5).map((item, index) => (
                      <Paper
                        key={`${item.type}-${item.id || index}`}
                        p="xs"
                        withBorder
                        style={{
                          cursor: 'pointer',
                          backgroundColor: item.is_read 
                            ? (isDark ? theme.colors.dark[7] : theme.colors.gray[0])
                            : (isDark ? theme.colors.blue[9] : theme.colors.blue[0]),
                          borderLeft: `3px solid ${theme.colors[getAlertColor(item)][6]}`,
                          transition: 'all 0.2s'
                        }}
                        onClick={() => handleAlertItemClick(item)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDark ? theme.colors.dark[6] : theme.colors.gray[1]
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = item.is_read 
                            ? (isDark ? theme.colors.dark[7] : theme.colors.gray[0])
                            : (isDark ? theme.colors.blue[9] : theme.colors.blue[0])
                        }}
                      >
                        <Group justify="space-between" align="flex-start" gap="xs">
                          <Group gap="xs" style={{ flex: 1 }}>
                            {getAlertIcon(item)}
                            <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                              <Group gap="xs" align="center">
                                <Badge size="xs" color={getAlertColor(item)} variant="light">
                                  {item.type === 'request' ? 'Request' :
                                   item.type === 'checkin' ? 'Check-in' :
                                   item.alert_type === 'low_rating' ? 'Low Rating' :
                                   item.alert_type === 'pain_report' ? 'Pain' :
                                   item.alert_type || 'Alert'}
                                </Badge>
                                {!item.is_read && item.type === 'alert' && (
                                  <Badge size="xs" color="blue" variant="dot">New</Badge>
                                )}
                              </Group>
                              <Text size="xs" fw={500} lineClamp={1}>
                                {item.type === 'request' 
                                  ? item.client_name
                                  : item.type === 'checkin'
                                  ? item.client_name
                                  : item.title || item.message}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {formatTimeAgo(item.created_at || item.check_in_date || item.date)}
                              </Text>
                            </Stack>
                          </Group>
                          {item.type === 'alert' && !item.is_read && (
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                markAlertAsRead(item.id)
                              }}
                            >
                              <IconX size={12} />
                            </ActionIcon>
                          )}
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                </ScrollArea>
              )}

              {alertsData.counts.total > 0 && (
                <Anchor component={Link} to="/alerts" size="xs" c="blue" mt="xs">
                  View All Alerts →
                </Anchor>
              )}
            </Stack>
          </Paper>
        </Grid.Col>

        {/* Right Panel - Schedule Calendar - Full Height */}
        <Grid.Col span={{ base: 12, md: 9 }} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div className="calendar-paper-wrapper" style={{ height: '100%', position: 'relative', border: '1px solid var(--mantine-color-gray-4)', borderRadius: 'var(--mantine-radius-sm)', overflow: 'hidden' }}>
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
                    size="lg"
                    fullWidth
                  />
                </div>
              </Stack>
            )}
            </Paper>
          </div>
        </Grid.Col>
      </Grid>

      {/* Session Details Modal - Compact Popup */}
      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={
          selectedDate
            ? `${selectedDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })} - Session Details`
            : 'Session Details'
        }
        size="sm"
        centered
        styles={{
          content: {
            backgroundColor: theme.colorScheme === 'dark' 
              ? theme.colors.dark[7] 
              : theme.colors.gray[8],
          },
          header: {
            backgroundColor: theme.colorScheme === 'dark' 
              ? theme.colors.dark[7] 
              : theme.colors.gray[8],
            borderBottom: `1px solid ${theme.colorScheme === 'dark' 
              ? theme.colors.dark[5] 
              : theme.colors.gray[6]}`,
            paddingBottom: theme.spacing.sm,
            marginBottom: theme.spacing.sm,
          },
          body: {
            backgroundColor: theme.colorScheme === 'dark' 
              ? theme.colors.dark[7] 
              : theme.colors.gray[8],
            paddingTop: theme.spacing.md,
          },
          title: {
            color: theme.colors.gray[0],
          },
          close: {
            color: theme.colors.gray[0],
          },
        }}
      >
        {selectedDate && (
          <Stack gap="md">
            {getSessionsForDate(selectedDate).length === 0 ? (
              <Text c="var(--mantine-color-gray-4)" ta="center" py="md" size="sm">
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
                  <Paper 
                    key={session.id} 
                    p="sm" 
                    withBorder
                    style={{ 
                      backgroundColor: theme.colorScheme === 'dark' 
                        ? theme.colors.dark[6] 
                        : theme.colors.gray[7],
                      borderColor: theme.colorScheme === 'dark' 
                        ? theme.colors.dark[4] 
                        : theme.colors.gray[6],
                    }}
                  >
                    <Stack gap="xs">
                      {/* Header: Client Name and Status */}
                      <Group justify="space-between" align="flex-start">
                        <div>
                          <Text fw={600} size="md" c="var(--mantine-color-gray-0)">
                            {session.client_name || 'Client'}
                          </Text>
                          <Text 
                            size="sm" 
                            fw={600}
                            c="green.4"
                            mt={4}
                            style={{ 
                              fontSize: '1rem',
                              letterSpacing: '0.5px'
                            }}
                          >
                            {session.session_time
                              ? new Date(`2000-01-01T${session.session_time}`).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : 'Time TBD'}
                          </Text>
                        </div>
                        <Badge 
                          color={session.status === 'completed' ? 'green' : session.status === 'confirmed' ? 'blue' : 'gray'}
                          size="sm"
                          variant="filled"
                        >
                          {session.status || 'scheduled'}
                        </Badge>
                      </Group>

                      {/* Workout Info */}
                        {session.workout_name && (
                        <Group gap="xs" align="center">
                          <Text size="xs" c="var(--mantine-color-gray-4)" fw={500} style={{ minWidth: '60px' }}>
                            Workout:
                          </Text>
                          <Text size="sm" fw={500} c="var(--mantine-color-gray-0)">
                            {session.workout_name}
                            </Text>
                        </Group>
                        )}

                      {/* Session Type */}
                        {session.session_type && (
                        <Group gap="xs" align="center">
                          <Text size="xs" c="var(--mantine-color-gray-4)" fw={500} style={{ minWidth: '60px' }}>
                            Type:
                            </Text>
                          <Badge variant="light" size="xs" tt="capitalize" color="green">
                              {session.session_type.replace('_', ' ')}
                          </Badge>
                        </Group>
                        )}

                      {/* Location */}
                      {session.location && (
                        <Group gap="xs" align="flex-start">
                          <Text size="xs" c="var(--mantine-color-gray-4)" fw={500} style={{ minWidth: '60px' }}>
                            Where:
                          </Text>
                          <Text size="sm" c="var(--mantine-color-gray-0)" style={{ flex: 1 }}>
                            {session.location}
                          </Text>
                        </Group>
                      )}

                      {/* Meeting Link */}
                      {session.meeting_link && (
                        <Group gap="xs" align="flex-start">
                          <Text size="xs" c="dimmed" fw={500} style={{ minWidth: '60px' }}>
                            Link:
                          </Text>
                          <Anchor 
                            href={session.meeting_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            size="sm"
                            c="green.6"
                            style={{ flex: 1, wordBreak: 'break-all' }}
                          >
                            Join Meeting
                          </Anchor>
                        </Group>
                      )}

                      {/* Notes */}
                      {session.notes && (
                        <Group gap="xs" align="flex-start">
                          <Text size="xs" c="var(--mantine-color-gray-4)" fw={500} style={{ minWidth: '60px' }}>
                            Notes:
                          </Text>
                          <Text size="xs" c="var(--mantine-color-gray-1)" style={{ flex: 1 }}>
                            {session.notes}
                          </Text>
                        </Group>
                      )}

                      {/* Action Button */}
                      <Group justify="flex-end" mt="xs">
                        <Button
                          variant="light"
                          size="xs"
                          compact
                          color="green"
                          onClick={() => {
                            const clientId = session.client_profile_id || session.client_id
                            if (clientId) {
                              navigate(`/trainer/clients/${clientId}`)
                              closeModal()
                            }
                          }}
                        >
                          View Client →
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

