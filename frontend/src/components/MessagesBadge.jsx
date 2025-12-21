import { useState, useEffect } from 'react'
import { UnstyledButton, Badge } from '@mantine/core'
import { NavLink, useLocation } from 'react-router-dom'
import api from '../services/api'

function MessagesBadge() {
  const [unreadCount, setUnreadCount] = useState(0)
  const location = useLocation()

  useEffect(() => {
    fetchUnreadCount()
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  // Refresh count when navigating to/from messages page
  useEffect(() => {
    if (location.pathname === '/messages') {
      // Refresh immediately when on messages page
      fetchUnreadCount()
    }
  }, [location.pathname])

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/messages/unread-count')
      setUnreadCount(response.data.count || 0)
    } catch (error) {
      // Silently fail - messages are optional
      console.error('Error fetching unread count:', error)
    }
  }

  return (
    <UnstyledButton
      component={NavLink}
      to="/messages"
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
        e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {/* Envelope Icon SVG */}
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
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
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

export default MessagesBadge

