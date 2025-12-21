import { useState, useEffect } from 'react'
import { Button, Badge } from '@mantine/core'
import { NavLink } from 'react-router-dom'
import api from '../services/api'

function AlertsBadge() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchUnreadCount()
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/trainer/alerts/unread-count')
      setUnreadCount(response.data.count || 0)
    } catch (error) {
      // Silently fail - alerts are optional
      console.error('Error fetching unread count:', error)
    }
  }

  return (
    <Button
      component={NavLink}
      to="/trainer/alerts"
      variant="subtle"
      size="sm"
      style={{ padding: '0.375rem 0.75rem', position: 'relative' }}
    >
      Alerts
      {unreadCount > 0 && (
        <Badge
          color="red"
          size="xs"
          variant="filled"
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            minWidth: '18px',
            height: '18px',
            padding: '0 4px',
            fontSize: '10px'
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  )
}

export default AlertsBadge

