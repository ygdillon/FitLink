import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Container, Title, Text, Stack, Card, Badge, Button, Group, Modal, TextInput, NumberInput, Select, Textarea, Checkbox, Paper, Loader, Alert, Anchor } from '@mantine/core'
import { DatePickerInput, TimeInput } from '@mantine/dates'
import { useDisclosure } from '@mantine/hooks'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import api from '../services/api'
import './ClientSchedule.css'

function ClientSchedule({ clientId, clientName }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false)
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [workouts, setWorkouts] = useState([])
  
  const today = new Date()
  const threeMonthsLater = new Date()
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)
  
  const form = useForm({
    initialValues: {
      workoutId: '',
      sessionDate: today,
      sessionTime: new Date(today.setHours(9, 0, 0, 0)),
      duration: 60,
      sessionType: 'In-Person',
      location: '',
      meetingLink: '',
      notes: '',
      status: 'Scheduled',
      isRecurring: false,
      recurringPattern: 'Every Week',
      recurringEndDate: threeMonthsLater,
      dayOfWeek: ''
    },
    validate: {
      sessionDate: (value) => (!value ? 'Date is required' : null),
      sessionTime: (value) => (!value ? 'Time is required' : null),
      sessionType: (value) => (!value ? 'Session type is required' : null),
      recurringEndDate: (value, values) => (values.isRecurring && !value ? 'End date is required for recurring sessions' : null),
    },
  })

  useEffect(() => {
    fetchSessions()
    fetchWorkouts()
  }, [clientId])

  const fetchSessions = async () => {
    try {
      const response = await api.get(`/schedule/trainer/clients/${clientId}/sessions`)
      setSessions(response.data)
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWorkouts = async () => {
    try {
      const response = await api.get('/trainer/workouts')
      setWorkouts(response.data)
    } catch (error) {
      console.error('Error fetching workouts:', error)
    }
  }

  // Helper function to convert time string to minutes from midnight
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  // Helper function to check if two time ranges overlap
  const checkTimeOverlap = (newStartTime, newDuration, existingStartTime, existingDuration) => {
    const newStart = timeToMinutes(newStartTime)
    const newEnd = newStart + (newDuration || 60)
    const existingStart = timeToMinutes(existingStartTime)
    const existingEnd = existingStart + (existingDuration || 60)
    
    // Two ranges overlap if: newStart < existingEnd AND newEnd > existingStart
    return newStart < existingEnd && newEnd > existingStart
  }

  // Check for overlapping sessions before submitting
  // excludeSessionId: optional session ID to exclude from check (useful when updating)
  const checkForOverlaps = (sessionDate, sessionTime, duration, excludeSessionId = null) => {
    if (!sessionDate || !sessionTime) return null

    const dateStr = sessionDate instanceof Date 
      ? sessionDate.toISOString().split('T')[0]
      : sessionDate
    
    const timeStr = sessionTime instanceof Date
      ? sessionTime.toTimeString().slice(0, 5)
      : sessionTime

    const sessionDuration = duration || 60

    // Check all sessions for the same date (excluding cancelled/completed and the session being updated)
    const sameDateSessions = sessions.filter(s => {
      const sDate = s.session_date.split('T')[0]
      const isActive = s.status !== 'cancelled' && s.status !== 'completed'
      const isNotExcluded = excludeSessionId ? s.id !== excludeSessionId : true
      return sDate === dateStr && isActive && isNotExcluded
    })

    for (const existing of sameDateSessions) {
      if (checkTimeOverlap(timeStr, sessionDuration, existing.session_time, existing.duration || 60)) {
        return {
          client: existing.client_name || 'a client',
          time: existing.session_time,
          date: dateStr
        }
      }
    }

    return null
  }

  const handleCreateSession = async (values) => {
    setSubmitting(true)
    try {
      console.log('Submitting session with values:', values)
      const sessionDate = values.sessionDate instanceof Date 
        ? values.sessionDate.toISOString().split('T')[0]
        : values.sessionDate
      const sessionTime = values.sessionTime instanceof Date
        ? values.sessionTime.toTimeString().slice(0, 5)
        : values.sessionTime

      // Check for overlapping sessions before submitting
      const overlap = checkForOverlaps(values.sessionDate, values.sessionTime, values.duration)
      if (overlap) {
        notifications.show({
          title: 'Time Conflict',
          message: `This session overlaps with an existing session for ${overlap.client} at ${new Date(`2000-01-01T${overlap.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}. Please choose a different time.`,
          color: 'red',
        })
        setSubmitting(false)
        return
      }
      const recurringEndDate = values.recurringEndDate instanceof Date
        ? values.recurringEndDate.toISOString().split('T')[0]
        : values.recurringEndDate
      
      // Normalize sessionType from display format to backend format
      const sessionTypeMap = {
        'In-Person': 'in_person',
        'Online': 'online',
        'Hybrid': 'hybrid'
      }
      const normalizedSessionType = sessionTypeMap[values.sessionType] || values.sessionType.toLowerCase().replace('-', '_')
      
      // Normalize recurringPattern from display format to backend format
      const patternMap = {
        'Every Week': 'weekly',
        'Every 2 Weeks': 'biweekly',
        'Every Month': 'monthly'
      }
      const normalizedPattern = patternMap[values.recurringPattern] || values.recurringPattern.toLowerCase()
      
      const payload = {
        clientId: parseInt(clientId),
        workoutId: values.workoutId && values.workoutId !== '' ? parseInt(values.workoutId) : null,
        sessionDate,
        sessionTime,
        duration: values.duration,
        sessionType: normalizedSessionType,
        location: values.location || null,
        meetingLink: values.meetingLink || null,
        notes: values.notes || null
      }
      
      if (values.isRecurring) {
        payload.isRecurring = true
        payload.recurringPattern = normalizedPattern
        payload.recurringEndDate = recurringEndDate
        payload.dayOfWeek = values.sessionDate instanceof Date ? values.sessionDate.getDay() : parseInt(values.dayOfWeek)
      }
      
      const response = await api.post('/schedule/trainer/sessions', payload)
      
      if (values.isRecurring && response.data.sessions) {
        const color = response.data.conflicts && response.data.conflicts.length > 0 ? 'yellow' : 'green'
        notifications.show({
          title: 'Sessions Created',
          message: response.data.message || `Successfully created ${response.data.sessions.length} recurring sessions!`,
          color,
        })
      } else {
        notifications.show({
          title: 'Session Scheduled',
          message: 'Session scheduled successfully!',
          color: 'green',
        })
      }
      
      closeCreate()
      form.reset()
      fetchSessions()
    } catch (error) {
      console.error('Error creating session:', error)
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || error.message || 'Failed to schedule session',
        color: 'red',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateSession = async (values) => {
    try {
      const sessionDate = values.sessionDate instanceof Date 
        ? values.sessionDate.toISOString().split('T')[0]
        : values.sessionDate
      const sessionTime = values.sessionTime instanceof Date
        ? values.sessionTime.toTimeString().slice(0, 5)
        : values.sessionTime

      // Check for overlapping sessions before updating (exclude current session)
      if (selectedSession) {
        const overlap = checkForOverlaps(values.sessionDate, values.sessionTime, values.duration, selectedSession.id)
        if (overlap) {
          notifications.show({
            title: 'Time Conflict',
            message: `This session overlaps with an existing session for ${overlap.client} at ${new Date(`2000-01-01T${overlap.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}. Please choose a different time.`,
            color: 'red',
          })
          return
        }
      }
      
      // Normalize sessionType from display format to backend format
      const sessionTypeMap = {
        'In-Person': 'in_person',
        'Online': 'online',
        'Hybrid': 'hybrid'
      }
      const normalizedSessionType = sessionTypeMap[values.sessionType] || values.sessionType.toLowerCase().replace('-', '_')
      
      // Normalize status to lowercase
      const normalizedStatus = values.status ? values.status.toLowerCase() : 'scheduled'
      
      await api.put(`/schedule/trainer/sessions/${selectedSession.id}`, {
        ...values,
        sessionDate,
        sessionTime,
        sessionType: normalizedSessionType,
        status: normalizedStatus,
        workoutId: values.workoutId && values.workoutId !== '' ? parseInt(values.workoutId) : null
      })
      notifications.show({
        title: 'Session Updated',
        message: 'Session updated successfully!',
        color: 'green',
      })
      closeEdit()
      setSelectedSession(null)
      form.reset()
      fetchSessions()
    } catch (error) {
      console.error('Error updating session:', error)
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update session',
        color: 'red',
      })
    }
  }

  const handleCancelSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to cancel this session?')) return
    
    try {
      await api.post(`/schedule/trainer/sessions/${sessionId}/cancel`, {
        reason: 'Cancelled by trainer'
      })
      notifications.show({
        title: 'Session Cancelled',
        message: 'Session has been cancelled',
        color: 'yellow',
      })
      fetchSessions()
    } catch (error) {
      console.error('Error cancelling session:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to cancel session',
        color: 'red',
      })
    }
  }

  const openEditModal = (session) => {
    setSelectedSession(session)
    const sessionDate = new Date(session.session_date)
    const [hours, minutes] = session.session_time.split(':')
    const sessionTime = new Date(sessionDate)
    sessionTime.setHours(parseInt(hours), parseInt(minutes))
    
    // Convert session_type from backend format to display format
    const sessionTypeMap = {
      'in_person': 'In-Person',
      'online': 'Online',
      'hybrid': 'Hybrid'
    }
    const displaySessionType = sessionTypeMap[session.session_type] || 'In-Person'
    
    // Convert status to display format (capitalize first letter)
    const statusDisplay = session.status 
      ? session.status.charAt(0).toUpperCase() + session.status.slice(1).toLowerCase()
      : 'Scheduled'
    
    form.setValues({
      workoutId: session.workout_id ? session.workout_id.toString() : '',
      sessionDate: sessionDate,
      sessionTime: sessionTime,
      duration: session.duration || 60,
      sessionType: displaySessionType,
      location: session.location || '',
      meetingLink: session.meeting_link || '',
      notes: session.notes || '',
      status: statusDisplay,
      isRecurring: false,
      recurringPattern: 'weekly',
      recurringEndDate: threeMonthsLater,
      dayOfWeek: ''
    })
    openEdit()
  }

  const upcomingSessions = sessions.filter(s => 
    new Date(s.session_date) >= new Date().setHours(0,0,0,0) && 
    s.status !== 'cancelled'
  ).sort((a, b) => {
    const dateA = new Date(`${a.session_date}T${a.session_time}`)
    const dateB = new Date(`${b.session_date}T${b.session_time}`)
    return dateA - dateB
  })

  const pastSessions = sessions.filter(s => 
    new Date(s.session_date) < new Date().setHours(0,0,0,0) || 
    s.status === 'completed'
  ).sort((a, b) => {
    const dateA = new Date(`${a.session_date}T${a.session_time}`)
    const dateB = new Date(`${b.session_date}T${b.session_time}`)
    return dateB - dateA
  })

  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader size="lg" />
      </Group>
    )
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div></div>
        <Button 
          onClick={() => {
            form.setValues({
              ...form.values,
              sessionDate: today,
              sessionTime: new Date(today.setHours(9, 0, 0, 0)),
              recurringEndDate: threeMonthsLater
            })
            openCreate()
          }}
        >
          + Schedule Session
        </Button>
      </Group>

      {/* Upcoming Sessions */}
      <div>
        <Title order={3} mb="md">Upcoming Sessions ({upcomingSessions.length})</Title>
        {upcomingSessions.length === 0 ? (
          <Paper p="xl" withBorder>
            <Stack gap="xs" align="center">
              <Text c="dimmed">No upcoming sessions scheduled.</Text>
              <Text size="sm" c="dimmed">Click "Schedule Session" to book a session with {clientName}.</Text>
            </Stack>
          </Paper>
        ) : (
          <Stack gap="sm">
            {upcomingSessions.map(session => (
              <Card key={session.id} shadow="sm" padding="lg" radius="sm" withBorder>
                <Group justify="space-between" align="flex-start">
                  <Stack gap="xs">
                    <Group gap="md">
                      <div>
                        <Text fw={500}>
                          {new Date(session.session_date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {new Date(`2000-01-01T${session.session_time}`).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })} ({session.duration} min)
                        </Text>
                      </div>
                      <Badge variant="light">
                        {session.session_type === 'online' ? '🌐 Online' : 
                         session.session_type === 'hybrid' ? '🔄 Hybrid' : 
                         '📍 In-Person'}
                      </Badge>
                      <Badge color={session.status === 'completed' ? 'green' : 'blue'}>
                        {session.status}
                      </Badge>
                    </Group>
                    <Stack gap={4}>
                      {session.workout_name && (
                        <Text size="sm"><Text span fw={500}>Workout:</Text> {session.workout_name}</Text>
                      )}
                      {session.location && (
                        <Text size="sm">📍 {session.location}</Text>
                      )}
                      {session.meeting_link && (
                        <Anchor href={session.meeting_link} target="_blank" rel="noopener noreferrer" size="sm">
                          Join Meeting →
                        </Anchor>
                      )}
                      {session.notes && (
                        <Text size="sm" c="dimmed">{session.notes}</Text>
                      )}
                    </Stack>
                  </Stack>
                  <Group>
                    <Button variant="outline" size="sm" onClick={() => openEditModal(session)}>
                      Edit
                    </Button>
                    <Button variant="outline" color="red" size="sm" onClick={() => handleCancelSession(session.id)}>
                      Cancel
                    </Button>
                  </Group>
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </div>

      {/* Past Sessions */}
      {pastSessions.length > 0 && (
        <div>
          <Title order={3} mb="md">Past Sessions ({pastSessions.length})</Title>
          <Group gap="xs">
            {pastSessions.slice(0, 10).map(session => (
              <Card key={session.id} padding="sm" radius="sm" withBorder>
                <Stack gap={4}>
                  <Text size="sm" fw={500}>
                    {new Date(session.session_date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {new Date(`2000-01-01T${session.session_time}`).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    })}
                  </Text>
                  <Badge size="sm" color={session.status === 'completed' ? 'green' : 'gray'}>
                    {session.status}
                  </Badge>
                </Stack>
              </Card>
            ))}
          </Group>
        </div>
      )}

      <Modal opened={createOpened} onClose={closeCreate} title="Schedule New Session" size="lg">
        <form onSubmit={form.onSubmit(handleCreateSession)}>
          <Stack gap="md">
            <DatePickerInput
              label="Date *"
              placeholder="Select date"
              minDate={new Date()}
              {...form.getInputProps('sessionDate')}
              required
            />
            <TimeInput
              label="Time *"
              {...form.getInputProps('sessionTime')}
              required
            />
            <Group grow>
              <NumberInput
                label="Duration (minutes)"
                min={15}
                max={180}
                step={15}
                {...form.getInputProps('duration')}
              />
              <Select
                label="Type *"
                data={['In-Person', 'Online', 'Hybrid']}
                withinPortal
                {...form.getInputProps('sessionType')}
                required
              />
            </Group>
            {form.values.sessionType === 'In-Person' && (
              <TextInput
                label="Location"
                placeholder="Gym address or location"
                {...form.getInputProps('location')}
              />
            )}
            {form.values.sessionType === 'Online' && (
              <TextInput
                label="Meeting Link"
                type="url"
                placeholder="Zoom, Google Meet, or other meeting link"
                {...form.getInputProps('meetingLink')}
              />
            )}
            <Select
              label="Workout (optional)"
              placeholder="No specific workout"
              data={workouts.map(w => ({ value: w.id.toString(), label: w.name }))}
              searchable
              clearable
              withinPortal
              {...form.getInputProps('workoutId')}
            />
            <Textarea
              label="Notes"
              placeholder="Any special instructions or notes for this session..."
              rows={3}
              {...form.getInputProps('notes')}
            />
            
            <Checkbox
              label="Repeat"
              {...form.getInputProps('isRecurring', { type: 'checkbox' })}
            />
            
            {form.values.isRecurring && (
              <Stack gap="md">
                <Group grow>
                  <Select
                    label="Repeat Pattern"
                    data={['Every Week', 'Every 2 Weeks', 'Every Month']}
                    withinPortal
                    {...form.getInputProps('recurringPattern')}
                  />
                  <DatePickerInput
                    label="End Date *"
                    minDate={form.values.sessionDate}
                    {...form.getInputProps('recurringEndDate')}
                    required={form.values.isRecurring}
                  />
                </Group>
                {form.values.sessionDate && form.values.sessionTime && (
                  <Alert color="blue" size="sm">
                    <Text size="sm">
                      Schedule: Every {form.values.recurringPattern === 'Every Week' ? 'week' : 
                                     form.values.recurringPattern === 'Every 2 Weeks' ? '2 weeks' : 
                                     'month'} on {
                      ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
                        form.values.sessionDate instanceof Date ? form.values.sessionDate.getDay() : 0
                      ]
                    } at {form.values.sessionTime instanceof Date 
                      ? form.values.sessionTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                      : form.values.sessionTime} until {form.values.recurringEndDate instanceof Date
                        ? form.values.recurringEndDate.toLocaleDateString()
                        : 'end date'}
                    </Text>
                  </Alert>
                )}
              </Stack>
            )}
            
            <Group justify="flex-end">
              <Button variant="outline" onClick={closeCreate} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting} disabled={submitting}>
                Schedule Session
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={editOpened} onClose={() => { closeEdit(); setSelectedSession(null); form.reset() }} title="Edit Session" size="lg">
        {selectedSession && (
          <form onSubmit={form.onSubmit(handleUpdateSession)}>
            <Stack gap="md">
              <DatePickerInput
                label="Date *"
                placeholder="Select date"
                {...form.getInputProps('sessionDate')}
                required
              />
              <TimeInput
                label="Time *"
                {...form.getInputProps('sessionTime')}
                required
              />
              <Group grow>
                <NumberInput
                  label="Duration (minutes)"
                  min={15}
                  max={180}
                  step={15}
                  {...form.getInputProps('duration')}
                />
                <Select
                  label="Type *"
                  data={['In-Person', 'Online', 'Hybrid']}
                  withinPortal
                  {...form.getInputProps('sessionType')}
                  required
                />
              </Group>
              {form.values.sessionType === 'In-Person' && (
                <TextInput
                  label="Location"
                  placeholder="Gym address or location"
                  {...form.getInputProps('location')}
                />
              )}
              {form.values.sessionType === 'Online' && (
                <TextInput
                  label="Meeting Link"
                  type="url"
                  placeholder="Zoom, Google Meet, or other meeting link"
                  {...form.getInputProps('meetingLink')}
                />
              )}
              <Select
                label="Workout (optional)"
                placeholder="No specific workout"
                data={workouts.map(w => ({ value: w.id.toString(), label: w.name }))}
                searchable
                clearable
                withinPortal
                {...form.getInputProps('workoutId')}
              />
              <Select
                label="Status"
                data={['Scheduled', 'Confirmed', 'Completed', 'Cancelled']}
                withinPortal
                {...form.getInputProps('status')}
              />
              <Textarea
                label="Notes"
                rows={3}
                {...form.getInputProps('notes')}
              />
              <Group justify="flex-end">
                <Button variant="outline" onClick={() => { closeEdit(); setSelectedSession(null); form.reset() }}>
                  Cancel
                </Button>
                <Button type="submit">
                  Update Session
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>
    </Stack>
  )
}

export default ClientSchedule

