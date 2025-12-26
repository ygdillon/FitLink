import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Container, Paper, Title, Text, Stack, Group, Avatar, Badge, Button, Divider, Loader, Alert } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

function TrainerProfile() {
  const { trainerId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [trainer, setTrainer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [currentTrainer, setCurrentTrainer] = useState(null)
  const [pendingRequests, setPendingRequests] = useState([])

  useEffect(() => {
    fetchTrainerProfile()
    if (user?.role === 'client') {
      fetchCurrentTrainer()
      fetchPendingRequests()
    }
  }, [trainerId, user])

  const fetchTrainerProfile = async () => {
    try {
      setLoading(true)
      // Search for the trainer by ID
      const response = await api.get(`/client/trainers/search`)
      const trainers = response.data || []
      const foundTrainer = trainers.find(t => t.id === parseInt(trainerId))
      
      if (foundTrainer) {
        setTrainer(foundTrainer)
      } else {
        // If not found in search, try to get from a different endpoint or show error
        setTrainer(null)
      }
    } catch (error) {
      console.error('Error fetching trainer profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrentTrainer = async () => {
    try {
      const response = await api.get('/client/trainer')
      setCurrentTrainer(response.data)
    } catch (error) {
      if (error.response?.status === 404) {
        setCurrentTrainer(null)
      }
    }
  }

  const fetchPendingRequests = async () => {
    try {
      const response = await api.get('/client/trainer/requests')
      setPendingRequests(response.data || [])
    } catch (error) {
      console.error('Error fetching pending requests:', error)
    }
  }

  const handleRequestTrainer = async () => {
    if (!trainer) return

    // Check if onboarding is completed
    try {
      const response = await api.get('/client/profile/onboarding-status')
      if (!response.data.onboarding_completed) {
        notifications.show({
          title: 'Profile Incomplete',
          message: 'Please complete your profile before requesting a trainer.',
          color: 'red',
        })
        setTimeout(() => {
          navigate('/client/onboarding')
        }, 2000)
        return
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error)
      notifications.show({
        title: 'Error',
        message: 'Unable to verify profile completion. Please try again.',
        color: 'red',
      })
      return
    }

    setRequesting(true)
    try {
      await api.post(`/client/trainer/request`, { 
        trainerId: trainer.id,
        message: null
      })
      notifications.show({
        title: 'Request Sent',
        message: 'Trainer request sent successfully! The trainer will review your request.',
        color: 'green',
      })
      fetchPendingRequests()
    } catch (error) {
      console.error('Error requesting trainer:', error)
      if (error.response?.data?.requires_onboarding) {
        notifications.show({
          title: 'Profile Incomplete',
          message: 'Please complete your profile before requesting a trainer.',
          color: 'red',
        })
        setTimeout(() => {
          navigate('/client/onboarding')
        }, 2000)
      } else {
        notifications.show({
          title: 'Error',
          message: error.response?.data?.message || 'Failed to send trainer request',
          color: 'red',
        })
      }
    } finally {
      setRequesting(false)
    }
  }

  if (loading) {
    return (
      <Container size="md" py="xl">
        <Group justify="center">
          <Loader size="lg" />
        </Group>
      </Container>
    )
  }

  if (!trainer) {
    return (
      <Container size="md" py="xl">
        <Alert color="red" title="Trainer Not Found">
          The trainer profile you're looking for doesn't exist or is no longer available.
        </Alert>
      </Container>
    )
  }

  const isCurrentTrainer = currentTrainer && currentTrainer.id === trainer.id
  const hasPendingRequest = pendingRequests.some(r => r.trainerId === trainer.id && r.status === 'pending')

  return (
    <Container size="md" py="xl">
      <Paper shadow="md" p="xl" radius="md" withBorder>
        <Stack gap="lg">
          {/* Header */}
          <Group gap="md" align="flex-start">
            <Avatar
              src={trainer.profile_image}
              size={120}
              radius="50%"
              color="robinhoodGreen"
            >
              {trainer.name?.charAt(0).toUpperCase() || 'T'}
            </Avatar>
            <Stack gap="xs" style={{ flex: 1 }}>
              <Group justify="space-between" align="flex-start">
                <div>
                  <Title order={2}>{trainer.name}</Title>
                  <Group gap="xs" mt="xs">
                    <Text size="sm" c="green" fw={500}>Exceptional 5.0</Text>
                    <Text size="sm" c="dimmed">({trainer.total_clients || 0} clients)</Text>
                  </Group>
                  {trainer.location && (
                    <Group gap={4} mt="xs">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--mantine-color-gray-6)' }}>
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <Text size="sm" c="dimmed">{trainer.location}</Text>
                    </Group>
                  )}
                </div>
                {user?.role === 'client' && (
                  <div>
                    {isCurrentTrainer ? (
                      <Button disabled size="sm" variant="light">Current Trainer</Button>
                    ) : hasPendingRequest ? (
                      <Button disabled size="sm" variant="outline">Request Pending</Button>
                    ) : (
                      <Button
                        onClick={handleRequestTrainer}
                        loading={requesting}
                        size="sm"
                        color="blue"
                      >
                        Request Trainer
                      </Button>
                    )}
                  </div>
                )}
              </Group>
            </Stack>
          </Group>

          <Divider />

          {/* Bio */}
          {trainer.bio && (
            <div>
              <Title order={4} mb="sm">About</Title>
              <Text>{trainer.bio}</Text>
            </div>
          )}

          {/* Specialties */}
          {trainer.specialties && (Array.isArray(trainer.specialties) ? trainer.specialties : Object.values(trainer.specialties)).length > 0 && (
            <div>
              <Title order={4} mb="sm">Specialties</Title>
              <Group gap="xs">
                {(Array.isArray(trainer.specialties)
                  ? trainer.specialties
                  : Object.values(trainer.specialties)
                ).map((spec, idx) => (
                  <Badge key={idx} size="md" variant="light" color="blue">
                    {spec}
                  </Badge>
                ))}
              </Group>
            </div>
          )}

          {/* Certifications */}
          {trainer.certifications && (Array.isArray(trainer.certifications) ? trainer.certifications : Object.values(trainer.certifications)).length > 0 && (
            <div>
              <Title order={4} mb="sm">Certifications</Title>
              <Group gap="xs">
                {(Array.isArray(trainer.certifications)
                  ? trainer.certifications
                  : Object.values(trainer.certifications)
                ).map((cert, idx) => (
                  <Badge key={idx} size="md" variant="light" color="green">
                    {cert}
                  </Badge>
                ))}
              </Group>
            </div>
          )}

          {/* Fitness Goals */}
          {trainer.fitness_goals && (Array.isArray(trainer.fitness_goals) ? trainer.fitness_goals : Object.values(trainer.fitness_goals)).length > 0 && (
            <div>
              <Title order={4} mb="sm">Preferred Client Goals</Title>
              <Group gap="xs">
                {(Array.isArray(trainer.fitness_goals)
                  ? trainer.fitness_goals
                  : Object.values(trainer.fitness_goals)
                ).map((goal, idx) => (
                  <Badge key={idx} size="sm" variant="dot" color="orange">
                    {goal}
                  </Badge>
                ))}
              </Group>
            </div>
          )}

          {/* Client Age Ranges */}
          {trainer.client_age_ranges && (Array.isArray(trainer.client_age_ranges) ? trainer.client_age_ranges : Object.values(trainer.client_age_ranges)).length > 0 && (
            <div>
              <Title order={4} mb="sm">Preferred Client Age Ranges</Title>
              <Group gap="xs">
                {(Array.isArray(trainer.client_age_ranges)
                  ? trainer.client_age_ranges
                  : Object.values(trainer.client_age_ranges)
                ).map((range, idx) => (
                  <Badge key={idx} size="sm" variant="dot" color="purple">
                    {range}
                  </Badge>
                ))}
              </Group>
            </div>
          )}

          {/* Pricing */}
          {trainer.hourly_rate && (
            <div>
              <Title order={4} mb="sm">Pricing</Title>
              <Text size="xl" fw={700} c="green">
                ${trainer.hourly_rate} per hour
              </Text>
            </div>
          )}

          {/* Contact Info */}
          {trainer.phoneNumber && (
            <div>
              <Title order={4} mb="sm">Contact</Title>
              <Text>{trainer.phoneNumber}</Text>
            </div>
          )}

          {/* Action Button */}
          {user?.role === 'client' && !isCurrentTrainer && !hasPendingRequest && (
            <Group justify="center" mt="md">
              <Button
                onClick={handleRequestTrainer}
                loading={requesting}
                size="lg"
                color="blue"
              >
                Request This Trainer
              </Button>
            </Group>
          )}
        </Stack>
      </Paper>
    </Container>
  )
}

export default TrainerProfile

