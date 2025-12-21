import { useState, useEffect } from 'react'
import { UnstyledButton, Badge, useMantineTheme } from '@mantine/core'
import { NavLink } from 'react-router-dom'
import api from '../services/api'

function AlertsBadge() {
  const [unreadCount, setUnreadCount] = useState(0)
  const theme = useMantineTheme()

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
    <UnstyledButton
      component={NavLink}
      to="/trainer/alerts"
      style={{ 
        position: 'relative',
        padding: '0.375rem 0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--mantine-radius-sm)',
        transition: 'background-color 0.2s ease',
        textDecoration: 'none',
        color: 'inherit'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = theme.colorScheme === 'dark' 
          ? 'var(--mantine-color-dark-5)' 
          : 'var(--mantine-color-gray-1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {/* Bell/Alert Icon SVG */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: 'block', flexShrink: 0 }}
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
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

export default AlertsBadge

