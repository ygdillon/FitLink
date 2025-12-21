import { useState, useEffect } from 'react'
import { UnstyledButton, Badge, useMantineColorScheme } from '@mantine/core'
import { NavLink, useLocation } from 'react-router-dom'
import api from '../services/api'

function RequestsBadge() {
  const [unreadCount, setUnreadCount] = useState(0)
  const location = useLocation()
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'

  useEffect(() => {
    fetchUnreadCount()
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  // Refresh count when navigating to/from requests page
  useEffect(() => {
    if (location.pathname === '/trainer/requests') {
      // Refresh immediately when on requests page
      fetchUnreadCount()
      // Mark as read when viewing the page
      markAsRead()
    }
  }, [location.pathname])

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/trainer/requests/unread-count')
      setUnreadCount(response.data.count || 0)
    } catch (error) {
      // Silently fail - requests are optional
      console.error('Error fetching unread count:', error)
    }
  }

  const markAsRead = async () => {
    try {
      await api.put('/trainer/requests/mark-read')
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking requests as read:', error)
    }
  }

  const RequestIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  )

  return (
    <UnstyledButton
      component={NavLink}
      to="/trainer/requests"
      style={{ 
        position: 'relative',
        padding: '0.5rem 0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        borderRadius: 'var(--mantine-radius-sm)',
        transition: 'background-color 0.2s ease',
        textDecoration: 'none',
        color: 'inherit',
        width: '100%'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = isDark 
          ? 'var(--mantine-color-dark-5)' 
          : 'var(--mantine-color-gray-1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      <RequestIcon />
      <span style={{ flex: 1, textAlign: 'left' }}>Requests</span>
      {unreadCount > 0 && (
        <Badge
          color="red"
          size="xs"
          variant="filled"
          style={{
            minWidth: '18px',
            height: '18px',
            padding: '0 4px',
            fontSize: '10px',
            border: '2px solid white',
            boxSizing: 'border-box'
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </UnstyledButton>
  )
}

export default RequestsBadge

