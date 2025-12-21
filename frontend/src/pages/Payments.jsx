import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Container, Title, Text, Stack, Card, Badge, Button, Group, Paper, Loader, Alert, SimpleGrid, Tabs } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './Payments.css'

function Payments() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [payments, setPayments] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [stripeStatus, setStripeStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Get active tab from URL params, default to 'history'
  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'history')
  
  // Check if we're coming from dropdown navigation (has tab param)
  const isDirectNavigation = !!tabFromUrl
  
  // Update active tab when URL param changes
  useEffect(() => {
    const tab = searchParams.get('tab') || 'history'
    setActiveTab(tab)
  }, [searchParams])
  
  // Update URL when tab changes (only if not from direct navigation)
  const handleTabChange = (value) => {
    setActiveTab(value)
    if (!isDirectNavigation) {
      setSearchParams({ tab: value })
    } else {
      // If coming from dropdown, remove tab param to show full tabs view
      setSearchParams({})
    }
  }

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      if (user.role === 'trainer') {
        const [paymentsRes, statusRes] = await Promise.all([
          api.get('/payments/trainer/history'),
          api.get('/payments/trainer/connect/status')
        ])
        setPayments(paymentsRes.data)
        setStripeStatus(statusRes.data)
      } else {
        const [paymentsRes, subsRes] = await Promise.all([
          api.get('/payments/client/history'),
          api.get('/payments/client/subscriptions')
        ])
        setPayments(paymentsRes.data)
        setSubscriptions(subsRes.data)
      }
    } catch (error) {
      console.error('Error fetching payment data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectStripe = async () => {
    try {
      const response = await api.post('/payments/trainer/connect/setup')
      window.location.href = response.data.onboardingUrl
    } catch (error) {
      console.error('Error connecting Stripe:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to setup payment account',
        color: 'red',
      })
    }
  }

  const handleCancelSubscription = async (subscriptionId) => {
    if (!window.confirm('Are you sure you want to cancel this subscription?')) {
      return
    }

    try {
      await api.post(`/payments/subscriptions/${subscriptionId}/cancel`)
      fetchData()
      notifications.show({
        title: 'Subscription Cancelled',
        message: 'Subscription has been cancelled successfully',
        color: 'yellow',
      })
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to cancel subscription',
        color: 'red',
      })
    }
  }

  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader size="lg" />
      </Group>
    )
  }

  if (user.role === 'trainer') {
    return (
      <Container size="xl" py="xl">
        <Title order={1} mb="xl">Payments</Title>

        <Tabs value={activeTab} onChange={handleTabChange}>
          {!isDirectNavigation && (
            <Tabs.List mb="xl">
              <Tabs.Tab value="history">Payment History</Tabs.Tab>
              <Tabs.Tab value="setup">Payment Setup</Tabs.Tab>
              <Tabs.Tab value="manage">Manage Payments</Tabs.Tab>
            </Tabs.List>
          )}

          <Tabs.Panel value="history">
            <Paper p="md" withBorder>
              <Title order={2} mb="md">Payment History</Title>
              {payments.length === 0 ? (
                <Text c="dimmed">No payments yet</Text>
              ) : (
                <Stack gap="md">
                  {payments.map(payment => (
                    <Card key={payment.id} withBorder>
                      <Group justify="space-between" mb="xs">
                        <div>
                          <Title order={4}>{payment.client_name}</Title>
                          <Text size="sm" c="dimmed">{payment.payment_type}</Text>
                        </div>
                        <Text size="lg" fw={700}>
                          ${payment.amount} {payment.currency.toUpperCase()}
                        </Text>
                      </Group>
                      <Group justify="space-between">
                        <Badge color={payment.status === 'completed' ? 'green' : 'yellow'}>
                          {payment.status}
                        </Badge>
                        <Text size="sm" c="dimmed">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </Text>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              )}
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="setup">
            <Paper p="md" withBorder>
              <Title order={2} mb="md">Payment Setup</Title>
              {!stripeStatus?.connected ? (
                <Stack gap="md">
                  <Text>Connect your Stripe account to receive payments directly from clients with zero platform fees.</Text>
                  <Button onClick={handleConnectStripe}>
                    Connect Stripe Account
                  </Button>
                </Stack>
              ) : (
                <Stack gap="sm">
                  <Group>
                    <Text fw={500}>Status:</Text>
                    <Badge color={stripeStatus.onboardingCompleted ? 'green' : 'yellow'}>
                      {stripeStatus.onboardingCompleted ? 'Active' : 'Pending Setup'}
                    </Badge>
                  </Group>
                  <Group>
                    <Text fw={500}>Charges Enabled:</Text>
                    <Badge color={stripeStatus.chargesEnabled ? 'green' : 'red'}>
                      {stripeStatus.chargesEnabled ? 'Yes' : 'No'}
                    </Badge>
                  </Group>
                  <Group>
                    <Text fw={500}>Payouts Enabled:</Text>
                    <Badge color={stripeStatus.payoutsEnabled ? 'green' : 'red'}>
                      {stripeStatus.payoutsEnabled ? 'Yes' : 'No'}
                    </Badge>
                  </Group>
                  {!stripeStatus.onboardingCompleted && (
                    <Alert color="yellow">
                      Complete your Stripe onboarding to receive payments.
                    </Alert>
                  )}
                </Stack>
              )}
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="manage">
            <Paper p="md" withBorder>
              <Title order={2} mb="md">Manage Payments</Title>
              <Stack gap="md">
                <Text>Manage your payment settings, subscriptions, and billing information.</Text>
                {stripeStatus?.connected && (
                  <Group>
                    <Text fw={500}>Account Status:</Text>
                    <Badge color={stripeStatus.onboardingCompleted ? 'green' : 'yellow'}>
                      {stripeStatus.onboardingCompleted ? 'Active' : 'Pending Setup'}
                    </Badge>
                  </Group>
                )}
              </Stack>
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Container>
    )
  }

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">Payments</Title>

      {subscriptions.length > 0 && (
        <Paper p="md" withBorder mb="xl">
          <Title order={2} mb="md">Active Subscriptions</Title>
          <Stack gap="md">
            {subscriptions.map(sub => (
              <Card key={sub.id} withBorder>
                <Group justify="space-between" mb="xs">
                  <div>
                    <Title order={4}>{sub.trainer_name}</Title>
                    <Text size="sm" c="dimmed">${sub.amount}/{sub.billing_cycle}</Text>
                  </div>
                  <Badge color={sub.status === 'active' ? 'green' : 'gray'}>
                    {sub.status}
                  </Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Next billing: {new Date(sub.current_period_end).toLocaleDateString()}</Text>
                  {sub.status === 'active' && (
                    <Button
                      variant="outline"
                      color="red"
                      size="sm"
                      onClick={() => handleCancelSubscription(sub.id)}
                    >
                      Cancel Subscription
                    </Button>
                  )}
                </Group>
              </Card>
            ))}
          </Stack>
        </Paper>
      )}

      <Paper p="md" withBorder>
        <Title order={2} mb="md">Payment History</Title>
        {payments.length === 0 ? (
          <Text c="dimmed">No payments yet</Text>
        ) : (
          <Stack gap="md">
            {payments.map(payment => (
              <Card key={payment.id} withBorder>
                <Group justify="space-between" mb="xs">
                  <div>
                    <Title order={4}>{payment.trainer_name}</Title>
                    <Text size="sm" c="dimmed">{payment.payment_type}</Text>
                  </div>
                  <Text size="lg" fw={700}>
                    ${payment.amount} {payment.currency.toUpperCase()}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Badge color={payment.status === 'completed' ? 'green' : 'yellow'}>
                    {payment.status}
                  </Badge>
                  <Text size="sm" c="dimmed">
                    {new Date(payment.created_at).toLocaleDateString()}
                  </Text>
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </Paper>
    </Container>
  )
}

export default Payments

