import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Container, Paper, Title, Text, Stack, Group, Radio, Textarea, Button, Alert, Badge, Box } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import api from '../services/api'

function DailyCheckIn() {
  const location = useLocation()
  const [formData, setFormData] = useState({
    workout_completed: null,
    diet_stuck_to: null,
    workout_rating: null,
    notes: ''
  })
  const [todayCheckIn, setTodayCheckIn] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState('')
  const [fromWorkout, setFromWorkout] = useState(false)

  useEffect(() => {
    // Check if coming from workout completion
    if (location.state?.fromWorkout) {
      setFromWorkout(true)
      setFormData(prev => ({
        ...prev,
        workout_completed: true
      }))
    }
    fetchTodayCheckIn()
  }, [location])

  const fetchTodayCheckIn = async () => {
    try {
      const response = await api.get('/client/check-in/today')
      if (response.data.checked_in !== false) {
        setTodayCheckIn(response.data)
        setFormData({
          workout_completed: response.data.workout_completed,
          diet_stuck_to: response.data.diet_stuck_to,
          workout_rating: response.data.workout_rating || null,
          notes: response.data.notes || ''
        })
        setSubmitted(true)
      }
    } catch (error) {
      console.error('Error fetching check-in:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (value === 'true' ? true : value === 'false' ? false : value)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.workout_completed === null || formData.diet_stuck_to === null) {
      setMessage('Please answer both questions')
      return
    }

    if (formData.workout_completed === true && formData.workout_rating === null) {
      setMessage('Please rate your workout')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      await api.post('/client/check-in', formData)
      setSubmitted(true)
      setMessage('Check-in submitted successfully!')
      notifications.show({
        title: 'Check-in Submitted',
        message: 'Your trainer will review your check-in and provide feedback.',
        color: 'green',
      })
      fetchTodayCheckIn()
      setFromWorkout(false) // Clear the fromWorkout flag after submission
    } catch (error) {
      console.error('Error submitting check-in:', error)
      setMessage('Failed to submit check-in')
      notifications.show({
        title: 'Error',
        message: 'Failed to submit check-in. Please try again.',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  return (
    <Container size={600} py="xl">
      <Paper shadow="md" p="xl" radius="md" withBorder>
        <Title order={1} mb="xs">Daily Check-In</Title>
        <Text c="dimmed" mb="xl">{today}</Text>
        
        {fromWorkout && (
          <Alert color="green" mb="md" title="Workout Completed!">
            Great job! Let's complete your check-in to help your trainer track your progress.
          </Alert>
        )}

        {submitted && todayCheckIn && (
          <Stack gap="md">
            <Alert color="green" title="✓ Check-in Complete!">
              Your check-in has been submitted successfully.
            </Alert>
            
            <Paper p="md" withBorder>
              <Stack gap="sm">
                <Group>
                  <Text fw={500}>Workout:</Text>
                  <Text>{todayCheckIn.workout_completed ? '✓ Completed' : '✗ Not completed'}</Text>
                  {todayCheckIn.workout_rating && (
                    <Badge color="green" variant="light">
                      Rating: {todayCheckIn.workout_rating}/10
                    </Badge>
                  )}
                </Group>
                <Group>
                  <Text fw={500}>Diet:</Text>
                  <Text>{todayCheckIn.diet_stuck_to ? '✓ Stuck to plan' : '✗ Did not stick to plan'}</Text>
                </Group>
                {todayCheckIn.notes && (
                  <div>
                    <Text fw={500} mb="xs">Notes:</Text>
                    <Text>{todayCheckIn.notes}</Text>
                  </div>
                )}
                {todayCheckIn.trainer_response && (
                  <Alert color="blue" title="Trainer Response">
                    {todayCheckIn.trainer_response}
                  </Alert>
                )}
              </Stack>
            </Paper>

            <Button
              variant="outline"
              onClick={() => {
                setSubmitted(false)
                setFormData({
                  workout_completed: todayCheckIn.workout_completed,
                  diet_stuck_to: todayCheckIn.diet_stuck_to,
                  workout_rating: todayCheckIn.workout_rating || null,
                  notes: todayCheckIn.notes || ''
                })
              }}
            >
              Edit Check-in
            </Button>
          </Stack>
        )}

        {!submitted && (
          <form onSubmit={handleSubmit}>
            <Stack gap="lg">
              <Radio.Group
                label="Did you complete your workout today? *"
                value={formData.workout_completed?.toString()}
                onChange={(value) => setFormData({ ...formData, workout_completed: value === 'true' })}
                required
              >
                <Group mt="xs">
                  <Radio value="true" label="Yes ✓" />
                  <Radio value="false" label="No ✗" />
                </Group>
              </Radio.Group>

              <Radio.Group
                label="Did you stick to your diet plan today? *"
                value={formData.diet_stuck_to?.toString()}
                onChange={(value) => setFormData({ ...formData, diet_stuck_to: value === 'true' })}
                required
              >
                <Group mt="xs">
                  <Radio value="true" label="Yes ✓" />
                  <Radio value="false" label="No ✗" />
                </Group>
              </Radio.Group>

              {formData.workout_completed === true && (
                <Box>
                  <Text fw={500} mb="xs">Rate your workout today (1-10) *</Text>
                  <Box mt="md">
                    <Group gap="xs" mb="xs">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rating => (
                        <Radio
                          key={rating}
                          value={rating.toString()}
                          checked={formData.workout_rating === rating}
                          onChange={() => setFormData({ ...formData, workout_rating: rating })}
                          styles={{ radio: { display: 'none' } }}
                        >
                          <Button
                            variant={formData.workout_rating === rating ? 'filled' : 'outline'}
                            color={formData.workout_rating === rating ? 'green' : 'gray'}
                            size="sm"
                            style={{ minWidth: 45 }}
                          >
                            {rating}
                          </Button>
                        </Radio>
                      ))}
                    </Group>
                    <Group justify="space-between" mb="xs">
                      <Text size="xs" c="dimmed">Very Easy</Text>
                      <Text size="xs" c="dimmed">Very Hard</Text>
                    </Group>
                    {formData.workout_rating && (
                      <Alert color="blue" size="sm">
                        {formData.workout_rating <= 3 && 'Easy workout'}
                        {formData.workout_rating >= 4 && formData.workout_rating <= 6 && 'Moderate workout'}
                        {formData.workout_rating >= 7 && formData.workout_rating <= 8 && 'Challenging workout'}
                        {formData.workout_rating >= 9 && 'Extremely challenging'}
                      </Alert>
                    )}
                  </Box>
                  <Text size="xs" c="dimmed" mt="xs">
                    This helps your trainer understand the intensity and adjust your program if needed.
                  </Text>
                </Box>
              )}

              <Textarea
                label="Notes (optional)"
                placeholder="How did it go? Any challenges? What went well?"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                description="If you didn't complete your workout or stick to your diet, let your trainer know what happened."
              />

              {message && (
                <Alert color={message.includes('success') ? 'green' : 'red'}>
                  {message}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                loading={loading}
                size="md"
              >
                Submit Check-in
              </Button>
            </Stack>
          </form>
        )}
      </Paper>
    </Container>
  )
}

export default DailyCheckIn

