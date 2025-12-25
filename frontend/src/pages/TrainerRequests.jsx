import { useState, useEffect } from 'react'
import { Container, Title, Text, Badge, Button, Card, Stack, Group, Avatar, Modal, Textarea, Alert, Loader, Accordion, Divider, Paper, Box } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import api from '../services/api'

function TrainerRequests({ showTitle = true }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [opened, { open, close }] = useDisclosure(false)
  const [actionType, setActionType] = useState('') // 'approve' or 'reject'
  const [responseMessage, setResponseMessage] = useState('')
  const [expandedRequest, setExpandedRequest] = useState(null) // Track which request is expanded

  useEffect(() => {
    fetchRequests()
    // Mark requests as read when page is viewed
    markRequestsAsRead()
  }, [])

  const markRequestsAsRead = async () => {
    try {
      await api.put('/trainer/requests/mark-read')
    } catch (error) {
      console.error('Error marking requests as read:', error)
    }
  }

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const response = await api.get('/trainer/requests')
      setRequests(response.data)
    } catch (error) {
      console.error('Error fetching requests:', error)
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        setMessage('Cannot connect to server. Please make sure the backend server is running on port 5001.')
      } else {
        setMessage(error.response?.data?.message || 'Failed to load requests')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = (request) => {
    setSelectedRequest(request)
    setActionType('approve')
    open()
  }

  const handleReject = (request) => {
    setSelectedRequest(request)
    setActionType('reject')
    open()
  }

  const submitAction = async () => {
    if (!selectedRequest) return

    try {
      const endpoint = `/trainer/requests/${selectedRequest.id}/${actionType}`
      await api.post(endpoint, { trainerResponse: responseMessage.trim() || null })
      
      setMessage(`Request ${actionType === 'approve' ? 'approved' : 'rejected'} successfully!`)
      close()
      setSelectedRequest(null)
      setResponseMessage('')
      fetchRequests()
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error(`Error ${actionType}ing request:`, error)
      setMessage(error.response?.data?.message || `Failed to ${actionType} request`)
    }
  }

  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader size="lg" />
      </Group>
    )
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <>
      {showTitle && (
        <Group justify="space-between" mb="xl">
          <Title order={1}>Client Requests</Title>
          {pendingCount > 0 && (
            <Badge color="yellow" size="lg" variant="filled">
              {pendingCount} Pending
            </Badge>
          )}
        </Group>
      )}


      {message && (
        <Alert 
          color={message.includes('success') ? 'green' : 'red'} 
          mb="md"
          onClose={() => setMessage('')}
          withCloseButton
        >
          {message}
        </Alert>
      )}

      {requests.length === 0 ? (
        <Paper p="xl" withBorder>
          <Text c="dimmed" ta="center">
            No pending requests found.
          </Text>
        </Paper>
      ) : (
        <Stack gap="md">
          {requests.map(request => {
            const profile = request.profile || {}
            return (
              <Card key={request.id} shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Group>
                      <Avatar color="green" size="md" radius="xl">
                        {request.clientName.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Title order={4}>{request.clientName}</Title>
                        <Text size="sm" c="dimmed">{request.clientEmail}</Text>
                      </Box>
                    </Group>
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

                  {/* Quick Summary */}
                  {(profile.primary_goal || profile.location || profile.age || profile.activity_level) && (
                    <Group gap="md">
                      {profile.primary_goal && (
                        <Text size="sm">
                          <Text span fw={500}>Goal:</Text> {profile.primary_goal}
                          {profile.goal_target && ` - ${profile.goal_target}`}
                        </Text>
                      )}
                      {profile.location && (
                        <Text size="sm">
                          <Text span fw={500}>Location:</Text> {profile.location}
                        </Text>
                      )}
                      {profile.age && (
                        <Text size="sm">
                          <Text span fw={500}>Age:</Text> {profile.age}
                          {profile.gender && ` • ${profile.gender}`}
                        </Text>
                      )}
                      {profile.activity_level && (
                        <Text size="sm">
                          <Text span fw={500}>Activity:</Text> {profile.activity_level}
                        </Text>
                      )}
                    </Group>
                  )}

                  {request.message && (
                    <Box>
                      <Text fw={500} size="sm" mb="xs">Client Message:</Text>
                      <Text size="sm">{request.message}</Text>
                    </Box>
                  )}

                  {/* Expandable Full Profile */}
                  <Accordion>
                    <Accordion.Item value="profile">
                      <Accordion.Control>View Full Profile</Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap="md">
                          {/* Basic Information */}
                          {(profile.height || profile.weight || profile.gender || profile.age || profile.location) && (
                            <Box>
                              <Title order={5} mb="xs">Basic Information</Title>
                              <Group gap="md">
                                {profile.height && <Text size="sm"><Text span fw={500}>Height:</Text> {profile.height} cm</Text>}
                                {profile.weight && <Text size="sm"><Text span fw={500}>Weight:</Text> {profile.weight} kg</Text>}
                                {profile.gender && <Text size="sm"><Text span fw={500}>Gender:</Text> {profile.gender}</Text>}
                                {profile.age && <Text size="sm"><Text span fw={500}>Age:</Text> {profile.age}</Text>}
                                {profile.location && <Text size="sm"><Text span fw={500}>Location:</Text> {profile.location}</Text>}
                              </Group>
                            </Box>
                          )}

                          {/* Goals */}
                          {(profile.primary_goal || profile.secondary_goals) && (
                            <Box>
                              <Title order={5} mb="xs">Goals</Title>
                              <Stack gap="xs">
                                {profile.primary_goal && <Text size="sm"><Text span fw={500}>Primary:</Text> {profile.primary_goal}</Text>}
                                {profile.goal_target && <Text size="sm"><Text span fw={500}>Target:</Text> {profile.goal_target}</Text>}
                                {profile.goal_timeframe && <Text size="sm"><Text span fw={500}>Timeframe:</Text> {profile.goal_timeframe}</Text>}
                                {profile.secondary_goals && profile.secondary_goals.length > 0 && (
                                  <Box>
                                    <Text size="sm" fw={500} mb="xs">Secondary Goals:</Text>
                                    <Group gap="xs">
                                      {profile.secondary_goals.map((goal, idx) => (
                                        <Badge key={idx} size="sm" variant="light">{goal}</Badge>
                                      ))}
                                    </Group>
                                  </Box>
                                )}
                              </Stack>
                            </Box>
                          )}

                          {/* Nutrition */}
                          {(profile.nutrition_habits || profile.nutrition_experience || profile.average_daily_eating) && (
                            <Box>
                              <Title order={5} mb="xs">Nutrition</Title>
                              <Stack gap="xs">
                                {profile.nutrition_habits && <Text size="sm"><Text span fw={500}>Habits:</Text> {profile.nutrition_habits}</Text>}
                                {profile.nutrition_experience && <Text size="sm"><Text span fw={500}>Experience:</Text> {profile.nutrition_experience}</Text>}
                                {profile.average_daily_eating && <Text size="sm"><Text span fw={500}>Daily Eating:</Text> {profile.average_daily_eating}</Text>}
                              </Stack>
                            </Box>
                          )}

                          {/* Health & Lifestyle */}
                          {(profile.injuries || profile.sleep_hours || profile.stress_level || profile.lifestyle_activity) && (
                            <Box>
                              <Title order={5} mb="xs">Health & Lifestyle</Title>
                              <Stack gap="xs">
                                {profile.injuries && <Text size="sm"><Text span fw={500}>Injuries:</Text> {profile.injuries}</Text>}
                                {profile.sleep_hours && <Text size="sm"><Text span fw={500}>Sleep:</Text> {profile.sleep_hours} hours/night</Text>}
                                {profile.stress_level && <Text size="sm"><Text span fw={500}>Stress:</Text> {profile.stress_level}</Text>}
                                {profile.lifestyle_activity && <Text size="sm"><Text span fw={500}>Lifestyle:</Text> {profile.lifestyle_activity}</Text>}
                              </Stack>
                            </Box>
                          )}

                          {/* Psychological */}
                          {(profile.psychological_barriers || profile.mindset || profile.motivation_why) && (
                            <Box>
                              <Title order={5} mb="xs">Psychological Factors</Title>
                              <Stack gap="xs">
                                {profile.psychological_barriers && <Text size="sm"><Text span fw={500}>Barriers:</Text> {profile.psychological_barriers}</Text>}
                                {profile.mindset && <Text size="sm"><Text span fw={500}>Mindset:</Text> {profile.mindset}</Text>}
                                {profile.motivation_why && <Text size="sm"><Text span fw={500}>Motivation:</Text> {profile.motivation_why}</Text>}
                              </Stack>
                            </Box>
                          )}

                          {/* Preferences */}
                          {(profile.training_preference || profile.communication_preference || profile.barriers) && (
                            <Box>
                              <Title order={5} mb="xs">Preferences</Title>
                              <Stack gap="xs">
                                {profile.training_preference && <Text size="sm"><Text span fw={500}>Training:</Text> {profile.training_preference}</Text>}
                                {profile.communication_preference && <Text size="sm"><Text span fw={500}>Communication:</Text> {profile.communication_preference}</Text>}
                                {profile.barriers && <Text size="sm"><Text span fw={500}>Barriers:</Text> {profile.barriers}</Text>}
                              </Stack>
                            </Box>
                          )}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  </Accordion>

                  {request.trainerResponse && (
                    <Alert color="blue" title="Your Response">
                      {request.trainerResponse}
                    </Alert>
                  )}

                  <Divider />

                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                      Received: {new Date(request.createdAt).toLocaleDateString()}
                    </Text>
                    {request.status === 'pending' && (
                      <Group>
                        <Button color="green" onClick={() => handleApprove(request)}>
                          Approve
                        </Button>
                        <Button color="red" variant="outline" onClick={() => handleReject(request)}>
                          Reject
                        </Button>
                      </Group>
                    )}
                  </Group>
                </Stack>
              </Card>
            )
          })}
        </Stack>
      )}

      <Modal 
        opened={opened} 
        onClose={close} 
        title={`${actionType === 'approve' ? 'Approve' : 'Reject'} Request`}
      >
        <Stack gap="md">
          <Text>
            {actionType === 'approve' 
              ? `Are you sure you want to approve ${selectedRequest?.clientName}'s request? They will be added as your client.`
              : `Are you sure you want to reject ${selectedRequest?.clientName}'s request?`
            }
          </Text>
          <Textarea
            label="Response Message (Optional)"
            placeholder={actionType === 'approve' 
              ? "Welcome! I'm excited to work with you..."
              : "Thank you for your interest, but..."
            }
            value={responseMessage}
            onChange={(e) => setResponseMessage(e.target.value)}
            rows={4}
          />
          <Group justify="flex-end">
            <Button 
              variant="outline" 
              onClick={() => {
                close()
                setResponseMessage('')
                setSelectedRequest(null)
              }}
            >
              Cancel
            </Button>
            <Button 
              color={actionType === 'approve' ? 'green' : 'red'}
              onClick={submitAction}
            >
              {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}

export default TrainerRequests

