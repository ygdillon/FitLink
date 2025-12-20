import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Title, Text, Tabs, Paper, Card, Avatar, Badge, Button, TextInput, Textarea, Modal, Stack, Group, Alert, Loader, Divider } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './Settings.css'

function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [currentTrainer, setCurrentTrainer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState(user?.role === 'client' ? 'current' : 'account') // 'current', 'find', 'requests', or 'account'
  const [pendingRequests, setPendingRequests] = useState([])
  const [requestMessage, setRequestMessage] = useState('')
  const [opened, { open, close }] = useDisclosure(false)
  const [selectedTrainer, setSelectedTrainer] = useState(null)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    fetchCurrentTrainer()
    fetchPendingRequests()
  }, [])

  const fetchCurrentTrainer = async () => {
    try {
      const response = await api.get('/client/trainer')
      setCurrentTrainer(response.data)
    } catch (error) {
      console.error('Error fetching trainer:', error)
      if (error.response?.status === 404) {
        setCurrentTrainer(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingRequests = async () => {
    try {
      const response = await api.get('/client/trainer/requests')
      setPendingRequests(response.data)
    } catch (error) {
      console.error('Error fetching requests:', error)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setSearching(true)
    setMessage('')
    try {
      const response = await api.get(`/client/trainers/search?q=${encodeURIComponent(searchQuery)}`)
      setSearchResults(response.data)
      if (response.data.length === 0) {
        setMessage('No trainers found. Try a different search term.')
      }
    } catch (error) {
      console.error('Error searching trainers:', error)
      setMessage('Failed to search trainers')
    } finally {
      setSearching(false)
    }
  }

  const handleRequestTrainer = async (trainerId) => {
    // Check if onboarding is completed
    try {
      const response = await api.get('/client/profile/onboarding-status')
      if (!response.data.onboarding_completed) {
        setMessage('Please complete your profile before requesting a trainer. You will be redirected to complete your profile.')
        setTimeout(() => {
          window.location.href = '/client/onboarding'
        }, 2000)
        return
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error)
      setMessage('Unable to verify profile completion. Please try again.')
      return
    }

    setSelectedTrainer(searchResults.find(t => t.id === trainerId))
    open()
  }

  const submitTrainerRequest = async () => {
    if (!selectedTrainer) return

    try {
      await api.post(`/client/trainer/request`, { 
        trainerId: selectedTrainer.id,
        message: requestMessage.trim() || null
      })
      setMessage('Trainer request sent successfully! The trainer will review your request and get back to you.')
      close()
      setRequestMessage('')
      setSelectedTrainer(null)
      fetchPendingRequests()
      setActiveTab('requests')
    } catch (error) {
      console.error('Error requesting trainer:', error)
      if (error.response?.data?.requires_onboarding) {
        setMessage('Please complete your profile before requesting a trainer. Redirecting to profile setup...')
        setTimeout(() => {
          window.location.href = '/client/onboarding'
        }, 2000)
      } else {
        setMessage(error.response?.data?.message || 'Failed to send trainer request')
      }
    }
  }

  const handleDisconnectTrainer = async () => {
    if (!window.confirm('Are you sure you want to disconnect from your current trainer? You will lose access to their workouts and programs.')) {
      return
    }

    try {
      await api.delete('/client/trainer')
      setMessage('Disconnected from trainer successfully')
      setCurrentTrainer(null)
    } catch (error) {
      console.error('Error disconnecting trainer:', error)
      setMessage(error.response?.data?.message || 'Failed to disconnect from trainer')
    }
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
      <Title order={1} mb="xl">Settings</Title>

      {message && (
        <Alert 
          color={message.includes('success') || message.includes('sent') ? 'green' : 'red'} 
          mb="md"
          onClose={() => setMessage('')}
          withCloseButton
        >
          {message}
        </Alert>
      )}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          {user?.role === 'client' && (
            <>
              <Tabs.Tab value="current">Current Trainer</Tabs.Tab>
              <Tabs.Tab value="requests">
                Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
              </Tabs.Tab>
              <Tabs.Tab value="find">Find Trainer</Tabs.Tab>
            </>
          )}
          <Tabs.Tab value="account">Account</Tabs.Tab>
        </Tabs.List>

        {user?.role === 'client' && (
          <Tabs.Panel value="current" pt="md">
          <Title order={2} mb="md">Your Current Trainer</Title>
          {currentTrainer ? (
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Stack gap="md">
                <Group>
                  <Avatar color="green" size="lg" radius="xl">
                    {currentTrainer.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <Title order={4}>{currentTrainer.name}</Title>
                    <Text c="dimmed">{currentTrainer.email}</Text>
                    {currentTrainer.phoneNumber && (
                      <Text size="sm" c="dimmed">📞 {currentTrainer.phoneNumber}</Text>
                    )}
                  </div>
                </Group>
                {currentTrainer.bio && (
                  <Text>{currentTrainer.bio}</Text>
                )}
                {currentTrainer.specialties && currentTrainer.specialties.length > 0 && (
                  <div>
                    <Text fw={500} mb="xs">Specialties:</Text>
                    <Group gap="xs">
                      {(Array.isArray(currentTrainer.specialties) 
                        ? currentTrainer.specialties 
                        : Object.values(currentTrainer.specialties)
                      ).map((spec, idx) => (
                        <Badge key={idx} variant="light">{spec}</Badge>
                      ))}
                    </Group>
                  </div>
                )}
                {currentTrainer.hourly_rate && (
                  <Text><Text span fw={500}>Rate:</Text> ${currentTrainer.hourly_rate}/hour</Text>
                )}
                <Button color="red" variant="outline" onClick={handleDisconnectTrainer}>
                  Disconnect from Trainer
                </Button>
              </Stack>
            </Card>
          ) : (
            <Paper p="xl" withBorder>
              <Stack gap="xs" align="center">
                <Text c="dimmed">You don't have a trainer assigned yet.</Text>
                <Text c="dimmed" size="sm">Use the "Find Trainer" tab to search for and connect with a trainer.</Text>
              </Stack>
            </Paper>
          )}
          </Tabs.Panel>
        )}

        {user?.role === 'client' && (
          <Tabs.Panel value="requests" pt="md">
          <Title order={2} mb="md">Trainer Requests</Title>
          {pendingRequests.length > 0 ? (
            <Stack gap="md">
              {pendingRequests.map(request => (
                <Card key={request.id} shadow="sm" padding="lg" radius="md" withBorder>
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <div>
                        <Title order={4}>{request.trainerName}</Title>
                        <Text size="sm" c="dimmed">{request.trainerEmail}</Text>
                      </div>
                      <Badge 
                        color={
                          request.status === 'approved' ? 'green' : 
                          request.status === 'rejected' ? 'red' : 'yellow'
                        }
                      >
                        {request.status === 'pending' && '⏳ Pending'}
                        {request.status === 'approved' && '✓ Approved'}
                        {request.status === 'rejected' && '✗ Rejected'}
                      </Badge>
                    </Group>
                    {request.message && (
                      <div>
                        <Text fw={500} size="sm" mb="xs">Your Message:</Text>
                        <Text size="sm">{request.message}</Text>
                      </div>
                    )}
                    {request.trainerResponse && (
                      <Alert color="blue" title="Trainer Response">
                        {request.trainerResponse}
                      </Alert>
                    )}
                    <Text size="xs" c="dimmed">
                      Sent: {new Date(request.createdAt).toLocaleDateString()}
                    </Text>
                  </Stack>
                </Card>
              ))}
            </Stack>
          ) : (
            <Paper p="xl" withBorder>
              <Stack gap="xs" align="center">
                <Text c="dimmed">You don't have any trainer requests yet.</Text>
                <Text c="dimmed" size="sm">Use the "Find Trainer" tab to search for and request a trainer.</Text>
              </Stack>
            </Paper>
          )}
          </Tabs.Panel>
        )}

        {user?.role === 'client' && (
          <Tabs.Panel value="find" pt="md">
            <Title order={2} mb="md">Find a New Trainer</Title>
            <form onSubmit={handleSearch}>
              <Group mb="md">
                <TextInput
                  placeholder="Search by name, specialty, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 1 }}
                />
                <Button type="submit" loading={searching} disabled={!searchQuery.trim()}>
                  Search
                </Button>
              </Group>
            </form>

            {searchResults.length > 0 && (
              <Stack gap="md">
                <Title order={3}>Search Results</Title>
                {searchResults.map(trainer => (
                  <Card key={trainer.id} shadow="sm" padding="lg" radius="md" withBorder>
                    <Group justify="space-between" align="flex-start">
                      <Group>
                        <Avatar color="green" size="md" radius="xl">
                          {trainer.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Stack gap={4}>
                          <Title order={4}>{trainer.name}</Title>
                          <Text size="sm" c="dimmed">{trainer.email}</Text>
                          {trainer.phoneNumber && (
                            <Text size="sm" c="dimmed">📞 {trainer.phoneNumber}</Text>
                          )}
                          {trainer.bio && <Text size="sm">{trainer.bio}</Text>}
                          {trainer.specialties && trainer.specialties.length > 0 && (
                            <Group gap="xs" mt="xs">
                              <Text size="sm" fw={500}>Specialties:</Text>
                              {(Array.isArray(trainer.specialties) 
                                ? trainer.specialties 
                                : Object.values(trainer.specialties)
                              ).map((spec, idx) => (
                                <Badge key={idx} size="sm" variant="light">{spec}</Badge>
                              ))}
                            </Group>
                          )}
                          {trainer.hourly_rate && (
                            <Text size="sm"><Text span fw={500}>Rate:</Text> ${trainer.hourly_rate}/hour</Text>
                          )}
                          {trainer.total_clients !== undefined && (
                            <Text size="sm" c="dimmed">
                              <Text span fw={500}>Clients:</Text> {trainer.active_clients || 0} active / {trainer.total_clients || 0} total
                            </Text>
                          )}
                        </Stack>
                      </Group>
                      {currentTrainer && currentTrainer.id === trainer.id ? (
                        <Button disabled>Current Trainer</Button>
                      ) : pendingRequests.some(r => r.trainerId === trainer.id && r.status === 'pending') ? (
                        <Button disabled variant="outline">Request Pending</Button>
                      ) : (
                        <Button onClick={() => handleRequestTrainer(trainer.id)}>
                          Request Trainer
                        </Button>
                      )}
                    </Group>
                  </Card>
                ))}
              </Stack>
            )}
          </Tabs.Panel>
        )}

        <Tabs.Panel value="account" pt="md">
          <Title order={2} mb="md">Account Settings</Title>
          <Paper p="lg" withBorder>
            <Stack gap="md">
              <div>
                <Title order={4} mb="xs">Account Information</Title>
                <Text c="dimmed" mb="md">Manage your account settings and preferences</Text>
              </div>
              
              <Divider />
              
              <div>
                <Title order={4} mb="xs">Sign Out</Title>
                <Text c="dimmed" mb="md" size="sm">
                  Sign out of your FitLink account. You'll need to sign in again to access your account.
                </Text>
                <Button 
                  color="red" 
                  variant="filled" 
                  onClick={handleLogout}
                >
                  Sign Out
                </Button>
              </div>
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>

      <Modal 
        opened={opened} 
        onClose={close} 
        title={`Request Trainer: ${selectedTrainer?.name}`}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Send a message to introduce yourself and explain your fitness goals. This helps the trainer understand if they can help you.
          </Text>
          <Textarea
            label="Message (Optional but Recommended)"
            placeholder="Hi! I'm interested in working with you because... My goals are..."
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value)}
            rows={5}
          />
          <Group justify="flex-end">
            <Button variant="outline" onClick={() => {
              close()
              setRequestMessage('')
              setSelectedTrainer(null)
            }}>
              Cancel
            </Button>
            <Button onClick={submitTrainerRequest}>
              Send Request
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}

export default Settings

