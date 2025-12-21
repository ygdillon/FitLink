import { useState, useEffect } from 'react'
import { Container, Title, Text, Stack, Card, Badge, Group, Paper, Loader, Button, Alert, Box, ScrollArea } from '@mantine/core'
import { useMantineColorScheme } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import './Alerts.css'

function Alerts() {
  const { colorScheme } = useMantineColorScheme()
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all', 'unread', 'read'
  const isDark = colorScheme === 'dark'

  useEffect(() => {
    fetchAlerts()
  }, [filter])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      const params = filter === 'unread' ? '?unread_only=true' : filter === 'read' ? '?unread_only=false' : ''
      const response = await api.get(`/trainer/alerts${params}`)
      setAlerts(response.data)
    } catch (error) {
      console.error('Error fetching alerts:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load alerts',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (alertId) => {
    try {
      await api.put(`/trainer/alerts/${alertId}/read`)
      setAlerts(alerts.map(alert => 
        alert.id === alertId 
          ? { ...alert, is_read: true, read_at: new Date().toISOString() }
          : alert
      ))
    } catch (error) {
      console.error('Error marking alert as read:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to mark alert as read',
        color: 'red',
      })
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.put('/trainer/alerts/read-all')
      setAlerts(alerts.map(alert => ({ ...alert, is_read: true })))
      notifications.show({
        title: 'Success',
        message: 'All alerts marked as read',
        color: 'green',
      })
    } catch (error) {
      console.error('Error marking all as read:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to mark all alerts as read',
        color: 'red',
      })
    }
  }

  const deleteAlert = async (alertId) => {
    try {
      await api.delete(`/trainer/alerts/${alertId}`)
      setAlerts(alerts.filter(alert => alert.id !== alertId))
      notifications.show({
        title: 'Success',
        message: 'Alert deleted',
        color: 'green',
      })
    } catch (error) {
      console.error('Error deleting alert:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to delete alert',
        color: 'red',
      })
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'urgent': return 'red'
      case 'high': return 'orange'
      case 'medium': return 'yellow'
      case 'low': return 'blue'
      default: return 'gray'
    }
  }

  const getAlertTypeLabel = (type) => {
    switch (type) {
      case 'low_rating': return 'Low Rating'
      case 'pain_report': return 'Pain Report'
      case 'missed_checkin': return 'Missed Check-in'
      case 'consistency_drop': return 'Consistency Drop'
      case 'positive_trend': return 'Positive Trend'
      default: return type
    }
  }

  const handleViewClient = (clientId) => {
    navigate(`/trainer/clients/${clientId}`)
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

  const unreadCount = alerts.filter(a => !a.is_read).length
  const filteredAlerts = filter === 'all' 
    ? alerts 
    : filter === 'unread' 
      ? alerts.filter(a => !a.is_read)
      : alerts.filter(a => a.is_read)

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Alerts</Title>
        <Group>
          {unreadCount > 0 && (
            <Button
              variant="light"
              size="sm"
              onClick={markAllAsRead}
              color="robinhoodGreen"
            >
              Mark All as Read
            </Button>
          )}
          <Group gap="xs">
            <Button
              variant={filter === 'all' ? 'filled' : 'outline'}
              onClick={() => setFilter('all')}
              color="robinhoodGreen"
              size="sm"
            >
              All
            </Button>
            <Button
              variant={filter === 'unread' ? 'filled' : 'outline'}
              onClick={() => setFilter('unread')}
              color="robinhoodGreen"
              size="sm"
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </Button>
            <Button
              variant={filter === 'read' ? 'filled' : 'outline'}
              onClick={() => setFilter('read')}
              color="robinhoodGreen"
              size="sm"
            >
              Read
            </Button>
          </Group>
        </Group>
      </Group>

      {filteredAlerts.length === 0 ? (
        <Paper p="xl" withBorder>
          <Text c="dimmed" ta="center">
            {filter === 'unread' 
              ? 'No unread alerts' 
              : filter === 'read'
                ? 'No read alerts'
                : 'No alerts yet'}
          </Text>
        </Paper>
      ) : (
        <Stack gap="md">
          {filteredAlerts.map(alert => (
            <Card
              key={alert.id}
              withBorder
              p="md"
              style={{
                backgroundColor: isDark 
                  ? (alert.is_read ? 'var(--mantine-color-dark-7)' : 'var(--mantine-color-dark-6)')
                  : (alert.is_read ? 'var(--mantine-color-gray-0)' : 'white'),
                borderLeft: `4px solid var(--mantine-color-${getSeverityColor(alert.severity)}-6)`,
                opacity: alert.is_read ? 0.7 : 1
              }}
            >
              <Group justify="space-between" align="flex-start" mb="xs">
                <Group>
                  <Badge color={getSeverityColor(alert.severity)} variant="filled">
                    {getAlertTypeLabel(alert.alert_type)}
                  </Badge>
                  {!alert.is_read && (
                    <Badge color="blue" variant="dot">New</Badge>
                  )}
                  <Text size="sm" c="dimmed">
                    {new Date(alert.created_at).toLocaleString()}
                  </Text>
                </Group>
                <Group gap="xs">
                  <Button
                    variant="subtle"
                    size="xs"
                    onClick={() => handleViewClient(alert.client_id)}
                    color="robinhoodGreen"
                  >
                    View Client
                  </Button>
                  {!alert.is_read && (
                    <Button
                      variant="subtle"
                      size="xs"
                      onClick={() => markAsRead(alert.id)}
                      color="blue"
                    >
                      Mark Read
                    </Button>
                  )}
                  <Button
                    variant="subtle"
                    size="xs"
                    color="red"
                    onClick={() => deleteAlert(alert.id)}
                  >
                    Delete
                  </Button>
                </Group>
              </Group>

              <Title order={4} mb="xs">{alert.title}</Title>
              <Text mb="md">{alert.message}</Text>

              {alert.metadata && (
                <Box mb="xs">
                  {alert.metadata.rating && (
                    <Text size="sm" c="dimmed">
                      Rating: {alert.metadata.rating}/10
                    </Text>
                  )}
                  {alert.metadata.pain_location && (
                    <Text size="sm" c="dimmed">
                      Pain Location: {alert.metadata.pain_location}
                      {alert.metadata.pain_intensity && ` (Intensity: ${alert.metadata.pain_intensity}/10)`}
                    </Text>
                  )}
                </Box>
              )}

              <Text size="sm" c="dimmed">
                From: {alert.client_name} ({alert.client_email})
              </Text>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  )
}

export default Alerts

