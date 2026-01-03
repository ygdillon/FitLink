import { useState, useEffect } from 'react'
import { Container, Title, Text, Stack, Card, Badge, Group, Paper, Loader, SimpleGrid, Tabs, Select, Button, useMantineColorScheme } from '@mantine/core'
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
  const [timeRange, setTimeRange] = useState('30') // days
  const [analytics, setAnalytics] = useState({
    financial: {},
    clients: {},
    workouts: {},
    checkIns: {}
  })

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

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
              <Card withBorder p="md" radius="sm">
                <Text size="sm" c="dimmed" mb="xs">Total Revenue</Text>
                <Title order={2} c="robinhoodGreen.6">
                  {formatCurrency(analytics.financial.totalRevenue)}
                </Title>
                <Text size="xs" c="dimmed" mt="xs">
                  {timeRange === 'all' ? 'All time' : `Last ${timeRange} days`}
                </Text>
              </Card>

              <Card withBorder p="md" radius="sm">
                <Text size="sm" c="dimmed" mb="xs">Monthly Recurring Revenue</Text>
                <Title order={2} c="robinhoodGreen.6">
                  {formatCurrency(analytics.financial.monthlyRecurringRevenue)}
                </Title>
                <Text size="xs" c="dimmed" mt="xs">From active subscriptions</Text>
              </Card>

              <Card withBorder p="md" radius="sm">
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

              <Card withBorder p="md" radius="sm">
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
              <Card withBorder p="md" radius="sm">
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

              <Card withBorder p="md" radius="sm">
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
              <Card withBorder p="md" radius="sm">
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
              <Card withBorder p="md" radius="sm">
                <Text size="sm" c="dimmed" mb="xs">Total Clients</Text>
                <Title order={2}>{analytics.clients.totalClients || 0}</Title>
                <Text size="xs" c="dimmed" mt="xs">All time</Text>
              </Card>

              <Card withBorder p="md" radius="sm">
                <Text size="sm" c="dimmed" mb="xs">Active Clients</Text>
                <Title order={2} c="green">{analytics.clients.activeClients || 0}</Title>
                <Text size="xs" c="dimmed" mt="xs">Currently active</Text>
              </Card>

              <Card withBorder p="md" radius="sm">
                <Text size="sm" c="dimmed" mb="xs">New Clients</Text>
                <Title order={2} c="blue">
                  {analytics.clients.newClients || 0}
                </Title>
                <Text size="xs" c="dimmed" mt="xs">
                  {timeRange === 'all' ? 'All time' : `Last ${timeRange} days`}
                </Text>
              </Card>

              <Card withBorder p="md" radius="sm">
                <Text size="sm" c="dimmed" mb="xs">Client Retention Rate</Text>
                <Title order={2}>
                  {formatPercentage(analytics.clients.retentionRate)}
                </Title>
                <Text size="xs" c="dimmed" mt="xs">Clients staying active</Text>
              </Card>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Card withBorder p="md" radius="sm">
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

              <Card withBorder p="md" radius="sm">
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
              <Card withBorder p="md" radius="sm">
                <Text size="sm" c="dimmed" mb="xs">Total Workouts Assigned</Text>
                <Title order={2}>{analytics.workouts.totalAssigned || 0}</Title>
                <Text size="xs" c="dimmed" mt="xs">
                  {timeRange === 'all' ? 'All time' : `Last ${timeRange} days`}
                </Text>
              </Card>

              <Card withBorder p="md" radius="sm">
                <Text size="sm" c="dimmed" mb="xs">Completed Workouts</Text>
                <Title order={2} c="green">{analytics.workouts.totalCompleted || 0}</Title>
                <Text size="xs" c="dimmed" mt="xs">Successfully completed</Text>
              </Card>

              <Card withBorder p="md" radius="sm">
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

              <Card withBorder p="md" radius="sm">
                <Text size="sm" c="dimmed" mb="xs">Average Workout Rating</Text>
                <Title order={2}>
                  {analytics.workouts.avgRating ? 
                    `${analytics.workouts.avgRating.toFixed(1)}/10` : 
                    'N/A'}
                </Title>
                <Text size="xs" c="dimmed" mt="xs">From client check-ins</Text>
              </Card>
            </SimpleGrid>

            <Card withBorder p="md" radius="sm">
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
              <Card withBorder p="md" radius="sm">
                <Text size="sm" c="dimmed" mb="xs">Total Check-ins</Text>
                <Title order={2}>{analytics.checkIns.totalCheckIns || 0}</Title>
                <Text size="xs" c="dimmed" mt="xs">
                  {timeRange === 'all' ? 'All time' : `Last ${timeRange} days`}
                </Text>
              </Card>

              <Card withBorder p="md" radius="sm">
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

              <Card withBorder p="md" radius="sm">
                <Text size="sm" c="dimmed" mb="xs">Average Sleep Quality</Text>
                <Title order={2}>
                  {analytics.checkIns.avgSleepQuality ? 
                    `${analytics.checkIns.avgSleepQuality.toFixed(1)}/10` : 
                    'N/A'}
                </Title>
                <Text size="xs" c="dimmed" mt="xs">Client average</Text>
              </Card>

              <Card withBorder p="md" radius="sm">
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
              <Card withBorder p="md" radius="sm">
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

              <Card withBorder p="md" radius="sm">
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



