import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Title, Text, Stack, Group, Button, TextInput, Select, Paper, Badge, Avatar, Loader, Alert, Box, ScrollArea } from '@mantine/core'
import { useMantineColorScheme } from '@mantine/core'
import api from '../services/api'
import ClientProfile from './ClientProfile'
import './Clients.css'

function Clients() {
  const navigate = useNavigate()
  const { clientId } = useParams()
  const { colorScheme } = useMantineColorScheme()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [isRedirecting, setIsRedirecting] = useState(false)
  
  const isDark = colorScheme === 'dark'
  const bgColor = isDark ? 'var(--mantine-color-dark-7)' : 'var(--mantine-color-gray-0)'
  const cardBgColor = isDark ? 'var(--mantine-color-dark-6)' : 'white'
  const hoverBgColor = isDark ? 'var(--mantine-color-dark-5)' : 'var(--mantine-color-gray-0)'

  useEffect(() => {
    fetchClients()
  }, [])

  // When clientId changes, verify it exists in the clients list
  useEffect(() => {
    if (clientId && clients.length > 0) {
      const clientExists = clients.some(c => c.id.toString() === clientId.toString())
      if (!clientExists) {
        console.log(`[DEBUG] Client ${clientId} not found in clients list. Redirecting to first client.`)
        setIsRedirecting(true)
        // Client doesn't exist, navigate to first client immediately
        const firstClientId = clients[0].id
        navigate(`/trainer/clients/${firstClientId}`, { replace: true })
        // Reset redirecting state after a short delay
        setTimeout(() => setIsRedirecting(false), 100)
      } else {
        setIsRedirecting(false)
      }
    } else if (!clientId) {
      setIsRedirecting(false)
    }
  }, [clientId, clients, navigate])

  const fetchClients = async () => {
    try {
      setError(null)
      const response = await api.get('/trainer/clients')
      const clientsData = response.data || []
      setClients(clientsData)
      
      // If no client is selected but we have clients, select the first one
      if (!clientId && clientsData.length > 0) {
        navigate(`/trainer/clients/${clientsData[0].id}`, { replace: true })
      }
      
      // If a clientId is in the URL but not in the list, redirect to first client
      if (clientId && clientsData.length > 0) {
        const clientExists = clientsData.some(c => c.id.toString() === clientId.toString())
        if (!clientExists) {
          console.log(`[DEBUG] Client ${clientId} from URL not found. Redirecting to first client (${clientsData[0].id}).`)
          setIsRedirecting(true)
          // Client doesn't exist, navigate to first client immediately
          navigate(`/trainer/clients/${clientsData[0].id}`, { replace: true })
          setTimeout(() => setIsRedirecting(false), 100)
        }
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      setError(error.response?.data?.message || 'Failed to load clients')
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Check if current clientId is valid - compute this once
  const isValidClientId = clientId && clients.length > 0 
    ? clients.some(c => c.id.toString() === clientId.toString())
    : false

  // If clientId exists but is invalid, redirect immediately
  useEffect(() => {
    if (clientId && clients.length > 0 && !isValidClientId && !isRedirecting) {
      console.log(`[DEBUG] Invalid clientId ${clientId} detected. Redirecting immediately.`)
      setIsRedirecting(true)
      const firstClientId = clients[0].id
      navigate(`/trainer/clients/${firstClientId}`, { replace: true })
    }
  }, [clientId, clients, isValidClientId, isRedirecting, navigate])

  const handleClientClick = (clientId) => {
    navigate(`/trainer/clients/${clientId}`)
  }

  if (loading) {
    return (
      <Box style={{ display: 'flex', height: 'calc(100vh - 60px)', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size="lg" />
      </Box>
    )
  }

  if (error) {
    return (
      <Box p="xl">
        <Alert color="red" title="Error loading clients" mb="md">
          {error}
        </Alert>
        <Button onClick={fetchClients}>Retry</Button>
      </Box>
    )
  }

  // Helper function to generate project description
  const getProjectDescription = (client) => {
    if (client.primary_goal) {
      const goal = client.primary_goal.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      if (client.goal_timeframe) {
        return `${goal} Project • ${client.goal_timeframe}`
      }
      return `${goal} Project`
    }
    return 'No Project Assigned'
  }

  return (
    <Box style={{ display: 'flex', height: 'calc(100vh - 60px)', gap: 0, overflow: 'hidden' }}>
      {/* Left Sidebar - Client List */}
      <Box style={{ 
        width: '280px', 
        borderRight: `1px solid ${isDark ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-3)'}`, 
        display: 'flex', 
        flexDirection: 'column', 
        backgroundColor: bgColor,
        overflow: 'hidden'
      }}>
        {/* Header */}
        <Box p="md" style={{ borderBottom: `1px solid ${isDark ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-3)'}`, backgroundColor: cardBgColor }}>
          <Group justify="space-between" mb="md">
            <Title order={3}>Active Clients ({filteredClients.length})</Title>
            <Button 
              size="xs" 
              onClick={() => navigate('/trainer/add-client')}
              color="robinhoodGreen"
            >
              + Add New Client
            </Button>
          </Group>
          
          {/* Filter Buttons */}
          <Group gap="xs" mb="md">
            <Button 
              variant={filterStatus === 'all' ? 'filled' : 'light'} 
              size="xs"
              onClick={() => setFilterStatus('all')}
              color="robinhoodGreen"
            >
              All
            </Button>
            <Button 
              variant={filterStatus === 'active' ? 'filled' : 'light'} 
              size="xs"
              onClick={() => setFilterStatus('active')}
              color="robinhoodGreen"
            >
              Active
            </Button>
            <Button 
              variant={filterStatus === 'inactive' ? 'filled' : 'light'} 
              size="xs"
              onClick={() => setFilterStatus('inactive')}
              color="robinhoodGreen"
            >
              Inactive
            </Button>
          </Group>

          {/* Search */}
          <TextInput
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="sm"
          />
        </Box>

        {/* Client List */}
        <ScrollArea style={{ flex: 1 }}>
          <Stack gap={0}>
            {filteredClients.length === 0 ? (
              <Paper p="md" m="md" withBorder>
                <Stack align="center" gap="xs">
                  <Text c="dimmed" size="sm" ta="center">
                    {clients.length === 0 
                      ? 'No clients yet. Add your first client to get started!'
                      : 'No clients match your search.'}
                  </Text>
                  {clients.length === 0 && (
                    <Button 
                      size="sm" 
                      onClick={() => navigate('/trainer/add-client')}
                      color="robinhoodGreen"
                    >
                      Add First Client
                    </Button>
                  )}
                </Stack>
              </Paper>
            ) : (
              filteredClients.map(client => {
                const isSelected = clientId === client.id.toString()
                return (
                  <Paper
                    key={client.id}
                    p="md"
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isSelected 
                        ? (isDark ? 'var(--mantine-color-robinhoodGreen-9)' : 'var(--mantine-color-robinhoodGreen-0)')
                        : cardBgColor,
                      borderLeft: isSelected ? '3px solid var(--mantine-color-robinhoodGreen-6)' : '3px solid transparent',
                      borderBottom: `1px solid ${isDark ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-2)'}`,
                      transition: 'all 0.2s ease',
                      borderRadius: 0
                    }}
                    onClick={() => handleClientClick(client.id)}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = hoverBgColor
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = cardBgColor
                      }
                    }}
                  >
                    <Group gap="sm" align="flex-start" wrap="nowrap">
                      <Avatar color="robinhoodGreen" radius="xl" size="md">
                        {client.name?.charAt(0).toUpperCase() || 'C'}
                      </Avatar>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text fw={500} size="sm" truncate mb={4}>
                          {client.name}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={2} mb={4}>
                          {getProjectDescription(client)}
                        </Text>
                        {client.start_date && (
                          <Text size="xs" c="dimmed">
                            Started: {new Date(client.start_date).toLocaleDateString()}
                          </Text>
                        )}
                      </Box>
                    </Group>
                  </Paper>
                )
              })
            )}
          </Stack>
        </ScrollArea>
      </Box>

      {/* Right Side - Client Details */}
      <Box style={{ flex: 1, overflow: 'hidden', backgroundColor: bgColor }}>
        {(() => {
          // Don't render ClientProfile if redirecting or if clientId is invalid
          if (isRedirecting || (clientId && !isValidClientId)) {
            return (
              <Box p="xl" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader size="lg" />
              </Box>
            )
          }
          
          // Only render ClientProfile if we have a valid clientId
          if (clientId && isValidClientId) {
            return <ClientProfile />
          } else {
            return (
              <Box p="xl" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Stack align="center" gap="md">
                  <Text size="xl" c="dimmed">Select a client to view their details</Text>
                  {clients.length === 0 && (
                    <Button 
                      onClick={() => navigate('/trainer/add-client')}
                      color="robinhoodGreen"
                    >
                      + Add Your First Client
                    </Button>
                  )}
                </Stack>
              </Box>
            )
          }
        })()}
      </Box>
    </Box>
  )
}

export default Clients
