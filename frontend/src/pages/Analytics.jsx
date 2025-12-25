import { useState, useEffect } from 'react'
import { Container, Title, Text, Stack, Card, Badge, Group, Paper, Loader, SimpleGrid, Tabs, Select, ScrollArea, Button, ActionIcon, useMantineColorScheme } from '@mantine/core'
import { IconBell, IconUserPlus, IconCheck, IconAlertTriangle, IconHeart, IconX } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { useMantineTheme } from '@mantine/core'
import api from '../services/api'
import './Analytics.css'

function Analytics() {
  const navigate = useNavigate()
  const theme = useMantineTheme()
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const [loading, setLoading] = useState(true)
  const [alertsLoading, setAlertsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30') // days
  const [analytics, setAnalytics] = useState({
    financial: {},
    clients: {},
    workouts: {},
    checkIns: {}
  })
  const [alertsData, setAlertsData] = useState({
    items: [],
    counts: { alerts: 0, requests: 0, checkIns: 0, total: 0 }
  })

  useEffect(() => {
    fetchAnalytics()
    fetchAlertsWidget()
  }, [timeRange])

  useEffect(() => {
    // Refresh alerts every 30 seconds
    const interval = setInterval(() => {
      fetchAlertsWidget()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/trainer/analytics?days=${timeRange}`)
      setAnalytics(response.data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAlertsWidget = async () => {
    try {
      setAlertsLoading(true)
      const response = await api.get('/trainer/analytics/alerts-widget')
      setAlertsData(response.data)
    } catch (error) {
      console.error('Error fetching alerts widget:', error)
    } finally {
      setAlertsLoading(false)
    }
  }

  const markAlertAsRead = async (alertId) => {
    try {
      await api.put(`/trainer/alerts/${alertId}/read`)
      fetchAlertsWidget() // Refresh
    } catch (error) {
      console.error('Error marking alert as read:', error)
    }
  }

  const getAlertIcon = (item) => {
    if (item.type === 'request') return <IconUserPlus size={18} />
    if (item.type === 'checkin') return <IconCheck size={18} />
    if (item.alert_type === 'low_rating' || item.alert_type === 'pain_report') return <IconAlertTriangle size={18} />
    return <IconBell size={18} />
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

  const handleItemClick = (item) => {
    if (item.type === 'request') {
      navigate('/trainer/requests')
    } else if (item.type === 'checkin') {
      navigate(`/trainer/clients/${item.client_id}`)
    } else if (item.type === 'alert') {
      navigate(`/trainer/clients/${item.client_id}`)
      if (!item.is_read) {
        markAlertAsRead(item.id)
      }
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`
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
      <Group justify="space-between" mb="xl">
        <Title order={1}>Analytics</Title>
        <Select
          value={timeRange}
          onChange={setTimeRange}
          data={[
            { value: '7', label: 'Last 7 days' },
            { value: '30', label: 'Last 30 days' },
            { value: '90', label: 'Last 90 days' },
            { value: '365', label: 'Last year' },
            { value: 'all', label: 'All time' }
          ]}
          withinPortal
        />
      </Group>

      <Tabs defaultValue="financial">
        <Tabs.List mb="xl">
          <Tabs.Tab value="financial">Financial</Tabs.Tab>
          <Tabs.Tab value="clients">Clients</Tabs.Tab>
          <Tabs.Tab value="workouts">Workouts</Tabs.Tab>
          <Tabs.Tab value="checkins">Check-ins</Tabs.Tab>
        </Tabs.List>

        {/* Financial Analytics */}
        <Tabs.Panel value="financial">
          <Stack gap="xl">
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              <Card withBorder p="md" radius="md">
                <Text size="sm" c="dimmed" mb="xs">Total Revenue</Text>
                <Title order={2} c="robinhoodGreen.6">
                  {formatCurrency(analytics.financial.totalRevenue)}
                </Title>
                <Text size="xs" c="dimmed" mt="xs">
                  {timeRange === 'all' ? 'All time' : `Last ${timeRange} days`}
                </Text>
              </Card>

              <Card withBorder p="md" radius="md">
                <Text size="sm" c="dimmed" mb="xs">Monthly Recurring Revenue</Text>
                <Title order={2} c="robinhoodGreen.6">
                  {formatCurrency(analytics.financial.monthlyRecurringRevenue)}
                </Title>
                <Text size="xs" c="dimmed" mt="xs">From active subscriptions</Text>
              </Card>

              <Card withBorder p="md" radius="md">
                <Text size="sm" c="dimmed" mb="xs">Active Subscriptions</Text>
                <Title order={2}>
                  {analytics.financial.activeSubscriptions || 0}
                </Title>
                <Text size="xs" c="dimmed" mt="xs">
                  {analytics.financial.cancelledSubscriptions ? 
                    `${analytics.financial.cancelledSubscriptions} cancelled` : 
                    'All active'}
                </Text>
              </Card>

              <Card withBorder p="md" radius="md">
                <Text size="sm" c="dimmed" mb="xs">Average Revenue Per Client</Text>
                <Title order={2}>
                  {formatCurrency(analytics.financial.avgRevenuePerClient)}
                </Title>
                <Text size="xs" c="dimmed" mt="xs">
                  {analytics.financial.totalClients ? 
                    `Across ${analytics.financial.totalClients} clients` : 
                    'No clients yet'}
                </Text>
              </Card>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {/* Alerts Widget */}
              <Card withBorder p="md" radius="md" style={{ minHeight: '400px' }}>
                <Group justify="space-between" mb="md">
                  <Group>
                    <IconBell size={20} color={theme.colors.blue[6]} />
                    <Title order={3}>Alerts & Notifications</Title>
                  </Group>
                  {alertsData.counts.total > 0 && (
                    <Badge color="blue" variant="filled" size="lg">
                      {alertsData.counts.total}
                    </Badge>
                  )}
                </Group>

                {alertsLoading ? (
                  <Group justify="center" py="xl">
                    <Loader size="sm" />
                  </Group>
                ) : alertsData.items.length === 0 ? (
                  <Paper p="xl" withBorder style={{ backgroundColor: isDark ? theme.colors.dark[7] : theme.colors.gray[0] }}>
                    <Stack align="center" gap="xs">
                      <IconBell size={40} color={isDark ? theme.colors.gray[6] : theme.colors.gray[5]} />
                      <Text c="dimmed" ta="center">No new alerts</Text>
                      <Text size="sm" c="dimmed" ta="center">
                        You're all caught up!
                      </Text>
                    </Stack>
                  </Paper>
                ) : (
                  <ScrollArea h={350}>
                    <Stack gap="xs">
                      {alertsData.items.map((item, index) => (
                        <Paper
                          key={`${item.type}-${item.id || index}`}
                          p="sm"
                          withBorder
                          style={{
                            cursor: 'pointer',
                            backgroundColor: item.is_read 
                              ? (isDark ? theme.colors.dark[7] : theme.colors.gray[0])
                              : (isDark ? theme.colors.blue[9] : theme.colors.blue[0]),
                            borderLeft: `3px solid ${theme.colors[getAlertColor(item)][6]}`,
                            transition: 'all 0.2s'
                          }}
                          onClick={() => handleItemClick(item)}
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
                              <div style={{ color: theme.colors[getAlertColor(item)][6] }}>
                                {getAlertIcon(item)}
                              </div>
                              <Stack gap={2} style={{ flex: 1 }}>
                                <Group gap="xs" align="center">
                                  <Badge size="sm" color={getAlertColor(item)} variant="light">
                                    {item.type === 'request' ? 'New Request' :
                                     item.type === 'checkin' ? 'Check-in' :
                                     item.alert_type === 'low_rating' ? 'Low Rating' :
                                     item.alert_type === 'pain_report' ? 'Pain Report' :
                                     item.alert_type === 'missed_checkin' ? 'Missed Check-in' :
                                     item.alert_type || 'Alert'}
                                  </Badge>
                                  {!item.is_read && item.type === 'alert' && (
                                    <Badge size="xs" color="blue" variant="dot">New</Badge>
                                  )}
                                </Group>
                                <Text size="sm" fw={500} lineClamp={1}>
                                  {item.type === 'request' 
                                    ? `New request from ${item.client_name}`
                                    : item.type === 'checkin'
                                    ? `${item.client_name} submitted a check-in`
                                    : item.title || item.message}
                                </Text>
                                {item.type === 'checkin' && item.workout_rating && (
                                  <Text size="xs" c="dimmed">
                                    Workout rating: {item.workout_rating}/10
                                  </Text>
                                )}
                                {item.type === 'request' && item.message && (
                                  <Text size="xs" c="dimmed" lineClamp={1}>
                                    {item.message}
                                  </Text>
                                )}
                                <Text size="xs" c="dimmed">
                                  {formatTimeAgo(item.created_at || item.check_in_date || item.date)}
                                </Text>
                              </Stack>
                            </Group>
                            {item.type === 'alert' && !item.is_read && (
                              <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAlertAsRead(item.id)
                                }}
                              >
                                <IconX size={14} />
                              </ActionIcon>
                            )}
                          </Group>
                        </Paper>
                      ))}
                    </Stack>
                  </ScrollArea>
                )}

                {alertsData.counts.total > 0 && (
                  <Group justify="space-between" mt="md" pt="md" style={{ borderTop: `1px solid ${theme.colors.gray[3]}` }}>
                    <Text size="sm" c="dimmed">
                      {alertsData.counts.alerts > 0 && `${alertsData.counts.alerts} alert${alertsData.counts.alerts !== 1 ? 's' : ''}`}
                      {alertsData.counts.alerts > 0 && alertsData.counts.requests > 0 && ' • '}
                      {alertsData.counts.requests > 0 && `${alertsData.counts.requests} request${alertsData.counts.requests !== 1 ? 's' : ''}`}
                      {alertsData.counts.checkIns > 0 && (alertsData.counts.alerts > 0 || alertsData.counts.requests > 0) && ' • '}
                      {alertsData.counts.checkIns > 0 && `${alertsData.counts.checkIns} check-in${alertsData.counts.checkIns !== 1 ? 's' : ''}`}
                    </Text>
                    <Button
                      variant="subtle"
                      size="xs"
                      onClick={() => navigate('/alerts')}
                    >
                      View All
                    </Button>
                  </Group>
                )}
              </Card>

              <Card withBorder p="md" radius="md">
                <Title order={3} mb="md">Revenue Breakdown</Title>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text>Subscription Revenue</Text>
                    <Text fw={500}>{formatCurrency(analytics.financial.subscriptionRevenue)}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text>One-Time Payments</Text>
                    <Text fw={500}>{formatCurrency(analytics.financial.oneTimeRevenue)}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text>Total Payments</Text>
                    <Text fw={500}>{analytics.financial.totalPayments || 0}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text>Payment Success Rate</Text>
                    <Badge color={analytics.financial.paymentSuccessRate >= 95 ? 'green' : 'yellow'}>
                      {formatPercentage(analytics.financial.paymentSuccessRate)}
                    </Badge>
                  </Group>
                </Stack>
              </Card>

              <Card withBorder p="md" radius="md">
                <Title order={3} mb="md">Subscription Metrics</Title>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text>Active Subscriptions</Text>
                    <Badge color="green">{analytics.financial.activeSubscriptions || 0}</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text>Cancelled Subscriptions</Text>
                    <Badge color="red">{analytics.financial.cancelledSubscriptions || 0}</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text>Churn Rate</Text>
                    <Badge color={analytics.financial.churnRate < 5 ? 'green' : 'yellow'}>
                      {formatPercentage(analytics.financial.churnRate)}
                    </Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text>Average Subscription Duration</Text>
                    <Text fw={500}>
                      {analytics.financial.avgSubscriptionDuration ? 
                        `${analytics.financial.avgSubscriptionDuration} days` : 
                        'N/A'}
                    </Text>
                  </Group>
                </Stack>
              </Card>
            </SimpleGrid>

            {analytics.financial.topClients && analytics.financial.topClients.length > 0 && (
              <Card withBorder p="md" radius="md">
                <Title order={3} mb="md">Top Paying Clients</Title>
                <Stack gap="sm">
                  {analytics.financial.topClients.map((client, index) => (
                    <Group key={client.id} justify="space-between" p="sm" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
                      <Group>
                        <Badge variant="light" color="gray">{index + 1}</Badge>
                        <Text fw={500}>{client.name}</Text>
                      </Group>
                      <Text fw={500} c="robinhoodGreen.6">
                        {formatCurrency(client.totalRevenue)}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Card>
            )}
          </Stack>
        </Tabs.Panel>

        {/* Client Analytics */}
        <Tabs.Panel value="clients">
          <Stack gap="xl">
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              <Card withBorder p="md" radius="md">
                <Text size="sm" c="dimmed" mb="xs">Total Clients</Text>
                <Title order={2}>{analytics.clients.totalClients || 0}</Title>
                <Text size="xs" c="dimmed" mt="xs">All time</Text>
              </Card>

              <Card withBorder p="md" radius="md">
                <Text size="sm" c="dimmed" mb="xs">Active Clients</Text>
                <Title order={2} c="green">{analytics.clients.activeClients || 0}</Title>
                <Text size="xs" c="dimmed" mt="xs">Currently active</Text>
              </Card>

              <Card withBorder p="md" radius="md">
                <Text size="sm" c="dimmed" mb="xs">New Clients</Text>
                <Title order={2} c="blue">
                  {analytics.clients.newClients || 0}
                </Title>
                <Text size="xs" c="dimmed" mt="xs">
                  {timeRange === 'all' ? 'All time' : `Last ${timeRange} days`}
                </Text>
              </Card>

              <Card withBorder p="md" radius="md">
                <Text size="sm" c="dimmed" mb="xs">Client Retention Rate</Text>
                <Title order={2}>
                  {formatPercentage(analytics.clients.retentionRate)}
                </Title>
                <Text size="xs" c="dimmed" mt="xs">Clients staying active</Text>
              </Card>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Card withBorder p="md" radius="md">
                <Title order={3} mb="md">Client Engagement</Title>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text>Average Workouts per Client</Text>
                    <Text fw={500}>{analytics.clients.avgWorkoutsPerClient?.toFixed(1) || 0}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text>Average Check-ins per Client</Text>
                    <Text fw={500}>{analytics.clients.avgCheckInsPerClient?.toFixed(1) || 0}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text>Most Engaged Client</Text>
                    <Text fw={500} c="dimmed">
                      {analytics.clients.mostEngagedClient || 'N/A'}
                    </Text>
                  </Group>
                </Stack>
              </Card>

              <Card withBorder p="md" radius="md">
                <Title order={3} mb="md">Client Progress</Title>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text>Clients with Goals</Text>
                    <Badge>{analytics.clients.clientsWithGoals || 0}</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text>Goal Achievement Rate</Text>
                    <Badge color="green">
                      {formatPercentage(analytics.clients.goalAchievementRate)}
                    </Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text>Average Progress Score</Text>
                    <Text fw={500}>
                      {analytics.clients.avgProgressScore ? 
                        analytics.clients.avgProgressScore.toFixed(1) : 
                        'N/A'}
                    </Text>
                  </Group>
                </Stack>
              </Card>
            </SimpleGrid>
          </Stack>
        </Tabs.Panel>

        {/* Workout Analytics */}
        <Tabs.Panel value="workouts">
          <Stack gap="xl">
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              <Card withBorder p="md" radius="md">
                <Text size="sm" c="dimmed" mb="xs">Total Workouts Assigned</Text>
                <Title order={2}>{analytics.workouts.totalAssigned || 0}</Title>
                <Text size="xs" c="dimmed" mt="xs">
                  {timeRange === 'all' ? 'All time' : `Last ${timeRange} days`}
                </Text>
              </Card>

              <Card withBorder p="md" radius="md">
                <Text size="sm" c="dimmed" mb="xs">Completed Workouts</Text>
                <Title order={2} c="green">{analytics.workouts.totalCompleted || 0}</Title>
                <Text size="xs" c="dimmed" mt="xs">Successfully completed</Text>
              </Card>

              <Card withBorder p="md" radius="md">
                <Text size="sm" c="dimmed" mb="xs">Completion Rate</Text>
                <Title order={2}>
                  {formatPercentage(analytics.workouts.completionRate)}
                </Title>
                <Badge 
                  color={
                    analytics.workouts.completionRate >= 80 ? 'green' : 
                    analytics.workouts.completionRate >= 60 ? 'yellow' : 'red'
                  }
                  mt="xs"
                >
                  {analytics.workouts.completionRate >= 80 ? 'Excellent' : 
                   analytics.workouts.completionRate >= 60 ? 'Good' : 'Needs Improvement'}
                </Badge>
              </Card>

              <Card withBorder p="md" radius="md">
                <Text size="sm" c="dimmed" mb="xs">Average Workout Rating</Text>
                <Title order={2}>
                  {analytics.workouts.avgRating ? 
                    `${analytics.workouts.avgRating.toFixed(1)}/10` : 
                    'N/A'}
                </Title>
                <Text size="xs" c="dimmed" mt="xs">From client check-ins</Text>
              </Card>
            </SimpleGrid>

            <Card withBorder p="md" radius="md">
              <Title order={3} mb="md">Workout Performance</Title>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text>Average Workout Duration</Text>
                  <Text fw={500}>
                    {analytics.workouts.avgDuration ? 
                      `${analytics.workouts.avgDuration} minutes` : 
                      'N/A'}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text>Most Popular Workout</Text>
                  <Text fw={500} c="dimmed">
                    {analytics.workouts.mostPopularWorkout || 'N/A'}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text>Peak Workout Day</Text>
                  <Text fw={500} c="dimmed">
                    {analytics.workouts.peakWorkoutDay || 'N/A'}
                  </Text>
                </Group>
              </Stack>
            </Card>
          </Stack>
        </Tabs.Panel>

        {/* Check-in Analytics */}
        <Tabs.Panel value="checkins">
          <Stack gap="xl">
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              <Card withBorder p="md" radius="md">
                <Text size="sm" c="dimmed" mb="xs">Total Check-ins</Text>
                <Title order={2}>{analytics.checkIns.totalCheckIns || 0}</Title>
                <Text size="xs" c="dimmed" mt="xs">
                  {timeRange === 'all' ? 'All time' : `Last ${timeRange} days`}
                </Text>
              </Card>

              <Card withBorder p="md" radius="md">
                <Text size="sm" c="dimmed" mb="xs">Check-in Completion Rate</Text>
                <Title order={2}>
                  {formatPercentage(analytics.checkIns.completionRate)}
                </Title>
                <Badge 
                  color={
                    analytics.checkIns.completionRate >= 80 ? 'green' : 
                    analytics.checkIns.completionRate >= 60 ? 'yellow' : 'red'
                  }
                  mt="xs"
                >
                  {analytics.checkIns.completionRate >= 80 ? 'Excellent' : 
                   analytics.checkIns.completionRate >= 60 ? 'Good' : 'Needs Improvement'}
                </Badge>
              </Card>

              <Card withBorder p="md" radius="md">
                <Text size="sm" c="dimmed" mb="xs">Average Sleep Quality</Text>
                <Title order={2}>
                  {analytics.checkIns.avgSleepQuality ? 
                    `${analytics.checkIns.avgSleepQuality.toFixed(1)}/10` : 
                    'N/A'}
                </Title>
                <Text size="xs" c="dimmed" mt="xs">Client average</Text>
              </Card>

              <Card withBorder p="md" radius="md">
                <Text size="sm" c="dimmed" mb="xs">Average Energy Level</Text>
                <Title order={2}>
                  {analytics.checkIns.avgEnergyLevel ? 
                    `${analytics.checkIns.avgEnergyLevel.toFixed(1)}/10` : 
                    'N/A'}
                </Title>
                <Text size="xs" c="dimmed" mt="xs">Client average</Text>
              </Card>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Card withBorder p="md" radius="md">
                <Title order={3} mb="md">Wellness Metrics</Title>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text>Average Sleep Hours</Text>
                    <Text fw={500}>
                      {analytics.checkIns.avgSleepHours ? 
                        `${analytics.checkIns.avgSleepHours.toFixed(1)} hours` : 
                        'N/A'}
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text>Pain Reports</Text>
                    <Badge color="red">
                      {analytics.checkIns.painReports || 0}
                    </Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text>Response Rate</Text>
                    <Badge color="blue">
                      {formatPercentage(analytics.checkIns.responseRate)}
                    </Badge>
                  </Group>
                </Stack>
              </Card>

              <Card withBorder p="md" radius="md">
                <Title order={3} mb="md">Engagement</Title>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text>Consistent Check-ins</Text>
                    <Badge color="green">
                      {analytics.checkIns.consistentClients || 0} clients
                    </Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text>Average Check-ins per Client</Text>
                    <Text fw={500}>
                      {analytics.checkIns.avgCheckInsPerClient?.toFixed(1) || 0}
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text>Best Check-in Day</Text>
                    <Text fw={500} c="dimmed">
                      {analytics.checkIns.bestCheckInDay || 'N/A'}
                    </Text>
                  </Group>
                </Stack>
              </Card>
            </SimpleGrid>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Container>
  )
}

export default Analytics



