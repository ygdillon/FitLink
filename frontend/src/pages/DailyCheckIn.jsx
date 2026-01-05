import { useState, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { Container, Paper, Title, Text, Stack, Group, Radio, Textarea, Button, Alert, Badge, Box, NumberInput, Checkbox, TextInput, FileButton, Image, Card, Tabs } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import api from '../services/api'

function DailyCheckIn() {
  const location = useLocation()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    workout_completed: null,
    diet_stuck_to: null,
    workout_rating: null,
    notes: '',
    workout_duration: null,
    sleep_hours: null,
    sleep_quality: null,
    energy_level: null,
    pain_experienced: false,
    pain_location: '',
    pain_intensity: null,
    progress_photo: null
  })
  const [photoPreview, setPhotoPreview] = useState(null)
  const [todayCheckIn, setTodayCheckIn] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState('')
  const [fromWorkout, setFromWorkout] = useState(false)
  const [checkInHistory, setCheckInHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [hasCompletedWorkouts, setHasCompletedWorkouts] = useState(false)
  const [checkingWorkouts, setCheckingWorkouts] = useState(true)

  const [isRequired, setIsRequired] = useState(false)

  useEffect(() => {
    // Check if coming from workout completion
    if (location.state?.fromWorkout) {
      setFromWorkout(true)
      setIsRequired(location.state?.required || false)
      setFormData(prev => ({
        ...prev,
        workout_completed: true
      }))
    }
    fetchTodayCheckIn()
    fetchCheckInHistory()
    checkCompletedWorkouts()
  }, [location])

  const checkCompletedWorkouts = async () => {
    try {
      setCheckingWorkouts(true)
      const response = await api.get('/client/workouts')
      // Check if there are any completed workouts
      const completed = response.data.filter(w => w.status === 'completed')
      setHasCompletedWorkouts(completed.length > 0)
    } catch (error) {
      console.error('Error checking completed workouts:', error)
      // If error, allow check-in (don't block on API error)
      setHasCompletedWorkouts(true)
    } finally {
      setCheckingWorkouts(false)
    }
  }

  const fetchCheckInHistory = async () => {
    try {
      const response = await api.get('/client/check-ins?limit=30')
      setCheckInHistory(response.data)
    } catch (error) {
      console.error('Error fetching check-in history:', error)
    }
  }

  const fetchTodayCheckIn = async () => {
    try {
      const response = await api.get('/client/check-in/today')
      if (response.data.checked_in !== false) {
        setTodayCheckIn(response.data)
        setFormData({
          workout_completed: response.data.workout_completed,
          diet_stuck_to: response.data.diet_stuck_to,
          workout_rating: response.data.workout_rating || null,
          notes: response.data.notes || '',
          workout_duration: response.data.workout_duration || null,
          sleep_hours: response.data.sleep_hours || null,
          sleep_quality: response.data.sleep_quality || null,
          energy_level: response.data.energy_level || null,
          pain_experienced: response.data.pain_experienced || false,
          pain_location: response.data.pain_location || '',
          pain_intensity: response.data.pain_intensity || null,
          progress_photo: response.data.progress_photo || null
        })
        if (response.data.progress_photo) {
          setPhotoPreview(response.data.progress_photo)
        }
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

  const handlePhotoUpload = (file) => {
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result)
        setFormData({ ...formData, progress_photo: reader.result })
      }
      reader.readAsDataURL(file)
    }
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

    // Validate pain fields if pain is experienced
    if (formData.pain_experienced === true) {
      if (!formData.pain_location || formData.pain_location.trim() === '') {
        setMessage('Please specify where you experienced pain')
        return
      }
      if (formData.pain_intensity === null || formData.pain_intensity === undefined) {
        setMessage('Please rate the pain intensity')
        return
      }
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
      setIsRequired(false) // Clear required flag after submission
      setPhotoPreview(null) // Clear photo preview
      
      // If this was a required check-in after workout, navigate back to workouts
      if (isRequired && location.state?.workoutId) {
        setTimeout(() => {
          navigate('/client/workouts')
        }, 2000)
      }
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
    <Container size={800} py="xl">
      <Paper shadow="md" p="xl" radius="sm" withBorder>
        <Tabs defaultValue="today" onTabChange={(value) => setShowHistory(value === 'history')}>
          <Tabs.List mb="xl">
            <Tabs.Tab value="today">Today's Check-In</Tabs.Tab>
            <Tabs.Tab value="history">Check-In History</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="today">
            <Title order={1} mb="xs">Daily Check-In</Title>
            <Text c="dimmed" mb="xl">{today}</Text>
        
        {fromWorkout && (
          <Alert 
            color={isRequired ? "orange" : "green"} 
            mb="md" 
            title={isRequired ? "Check-in Required" : "Workout Completed!"}
          >
            {isRequired 
              ? "A check-in is required after completing your workout. Please complete the form below to continue."
              : "Great job! Let's complete your check-in to help your trainer track your progress."
            }
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
                  {todayCheckIn.workout_duration && (
                    <Badge color="blue" variant="light">
                      {todayCheckIn.workout_duration} min
                    </Badge>
                  )}
                </Group>
                <Group>
                  <Text fw={500}>Diet:</Text>
                  <Text>{todayCheckIn.diet_stuck_to ? '✓ Stuck to plan' : '✗ Did not stick to plan'}</Text>
                </Group>
                {(todayCheckIn.sleep_hours || todayCheckIn.sleep_quality) && (
                  <Group>
                    <Text fw={500}>Sleep:</Text>
                    {todayCheckIn.sleep_hours && <Text>{todayCheckIn.sleep_hours} hours</Text>}
                    {todayCheckIn.sleep_quality && (
                      <Badge color="blue" variant="light">
                        Quality: {todayCheckIn.sleep_quality}/10
                      </Badge>
                    )}
                  </Group>
                )}
                {todayCheckIn.energy_level && (
                  <Group>
                    <Text fw={500}>Energy Level:</Text>
                    <Badge color="yellow" variant="light">
                      {todayCheckIn.energy_level}/10
                    </Badge>
                  </Group>
                )}
                {todayCheckIn.pain_experienced && (
                  <Group>
                    <Text fw={500}>Pain:</Text>
                    <Badge color="red" variant="light">
                      {todayCheckIn.pain_location} - Intensity: {todayCheckIn.pain_intensity}/10
                    </Badge>
                  </Group>
                )}
                {todayCheckIn.progress_photo && (
                  <Box>
                    <Text fw={500} mb="xs">Progress Photo:</Text>
                    <Image src={todayCheckIn.progress_photo} alt="Progress" width={200} height={200} fit="cover" radius="sm" />
                  </Box>
                )}
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
                  notes: todayCheckIn.notes || '',
                  workout_duration: todayCheckIn.workout_duration || null,
                  sleep_hours: todayCheckIn.sleep_hours || null,
                  sleep_quality: todayCheckIn.sleep_quality || null,
                  energy_level: todayCheckIn.energy_level || null,
                  pain_experienced: todayCheckIn.pain_experienced || false,
                  pain_location: todayCheckIn.pain_location || '',
                  pain_intensity: todayCheckIn.pain_intensity || null,
                  progress_photo: todayCheckIn.progress_photo || null
                })
                if (todayCheckIn.progress_photo) {
                  setPhotoPreview(todayCheckIn.progress_photo)
                }
              }}
            >
              Edit Check-in
            </Button>
          </Stack>
        )}

        {!submitted && (
          <>
            {checkingWorkouts ? (
              <Alert color="blue" title="Loading...">
                Checking your workout status...
              </Alert>
            ) : !hasCompletedWorkouts ? (
              <Alert color="yellow" title="No Completed Workouts" mb="md">
                <Stack gap="xs">
                  <Text>
                    You need to complete at least one workout before you can check in.
                  </Text>
                  <Button 
                    component={Link}
                    to="/client/workouts" 
                    variant="filled"
                    color="green"
                  >
                    Go to Workouts
                  </Button>
                </Stack>
              </Alert>
            ) : (
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
                <>
                  <Box>
                    <Text fw={500} mb="xs">Workout Difficulty Scale (1-10) *</Text>
                    <Text size="sm" c="dimmed" mb="md">
                      How difficult was this workout for you? This helps your trainer adjust your program.
                    </Text>
                    <Box mt="md">
                      <Radio.Group
                        value={formData.workout_rating?.toString() || ''}
                        onChange={(value) => setFormData({ ...formData, workout_rating: parseInt(value) })}
                      >
                        <Group gap="xs" mb="xs" wrap="wrap">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rating => (
                            <Radio
                              key={rating}
                              value={rating.toString()}
                              styles={{ radio: { display: 'none' } }}
                              label={
                                <Button
                                  variant={formData.workout_rating === rating ? 'filled' : 'outline'}
                                  color={formData.workout_rating === rating ? 'green' : 'gray'}
                                  size="sm"
                                  style={{ minWidth: 45, flex: '0 0 auto' }}
                                  component="span"
                                >
                                  {rating}
                                </Button>
                              }
                            />
                          ))}
                        </Group>
                      </Radio.Group>
                      <Group justify="space-between" mb="xs">
                        <Text size="xs" c="dimmed">Very Easy</Text>
                        <Text size="xs" c="dimmed">Very Hard</Text>
                      </Group>
                      {formData.workout_rating && (
                        <Alert color="blue" size="sm">
                          {formData.workout_rating <= 3 && 'Easy workout - You found this workout very manageable'}
                          {formData.workout_rating >= 4 && formData.workout_rating <= 6 && 'Moderate workout - Good challenge level'}
                          {formData.workout_rating >= 7 && formData.workout_rating <= 8 && 'Challenging workout - Pushed your limits'}
                          {formData.workout_rating >= 9 && 'Extremely challenging - Very difficult to complete'}
                        </Alert>
                      )}
                    </Box>
                  </Box>

                  <NumberInput
                    label="Workout Duration (minutes)"
                    placeholder="How long did your workout take?"
                    value={formData.workout_duration}
                    onChange={(value) => setFormData({ ...formData, workout_duration: value })}
                    min={1}
                    max={300}
                    description="Optional: Track how long you spent on your workout"
                  />
                </>
              )}

              <Stack gap="md" mt="md">
                <Title order={4}>Recovery & Wellness</Title>
                
                <NumberInput
                  label="Sleep Hours"
                  placeholder="Hours of sleep last night"
                  value={formData.sleep_hours}
                  onChange={(value) => setFormData({ ...formData, sleep_hours: value })}
                  min={0}
                  max={24}
                  decimalScale={1}
                  step={0.5}
                  description="How many hours did you sleep last night?"
                />

                <Box>
                  <Text fw={500} mb="xs">Sleep Quality (1-10)</Text>
                  <Group gap="xs" mb="xs" wrap="wrap">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(quality => (
                      <Button
                        key={quality}
                        variant={formData.sleep_quality === quality ? 'filled' : 'outline'}
                        color={formData.sleep_quality === quality ? 'blue' : 'gray'}
                        size="sm"
                        style={{ minWidth: 45, flex: '0 0 auto' }}
                        onClick={() => setFormData({ ...formData, sleep_quality: quality })}
                      >
                        {quality}
                      </Button>
                    ))}
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Poor</Text>
                    <Text size="xs" c="dimmed">Excellent</Text>
                  </Group>
                </Box>

                <Box>
                  <Text fw={500} mb="xs">Energy Level (1-10)</Text>
                  <Group gap="xs" mb="xs" wrap="wrap">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                      <Button
                        key={level}
                        variant={formData.energy_level === level ? 'filled' : 'outline'}
                        color={formData.energy_level === level ? 'yellow' : 'gray'}
                        size="sm"
                        style={{ minWidth: 45, flex: '0 0 auto' }}
                        onClick={() => setFormData({ ...formData, energy_level: level })}
                      >
                        {level}
                      </Button>
                    ))}
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Low</Text>
                    <Text size="xs" c="dimmed">High</Text>
                  </Group>
                  <Text size="xs" c="dimmed" mt="xs">
                    How would you rate your energy level today?
                  </Text>
                </Box>
              </Stack>

              <Stack gap="md" mt="md">
                <Title order={4}>Pain & Discomfort</Title>
                
                <Radio.Group
                  label="Did you experience pain or discomfort?"
                  value={formData.pain_experienced?.toString()}
                  onChange={(value) => {
                    const painValue = value === 'true'
                    setFormData({ 
                      ...formData, 
                      pain_experienced: painValue,
                      pain_location: painValue ? formData.pain_location : '',
                      pain_intensity: painValue ? formData.pain_intensity : null
                    })
                  }}
                  required
                >
                  <Group mt="xs">
                    <Radio value="true" label="Yes" />
                    <Radio value="false" label="No" />
                  </Group>
                </Radio.Group>

                {formData.pain_experienced === true && (
                  <>
                    <TextInput
                      label="Pain Location *"
                      placeholder="e.g., Lower back, right knee, shoulder"
                      value={formData.pain_location}
                      onChange={(e) => setFormData({ ...formData, pain_location: e.target.value })}
                      required
                      description="Where did you experience pain or discomfort?"
                    />

                    <Box>
                      <Text fw={500} mb="xs">Pain Intensity (1-10) *</Text>
                      <Group gap="xs" mb="xs" wrap="wrap">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(intensity => (
                          <Button
                            key={intensity}
                            variant={formData.pain_intensity === intensity ? 'filled' : 'outline'}
                            color={formData.pain_intensity === intensity ? 'red' : 'gray'}
                            size="sm"
                            style={{ minWidth: 45, flex: '0 0 auto' }}
                            onClick={() => setFormData({ ...formData, pain_intensity: intensity })}
                          >
                            {intensity}
                          </Button>
                        ))}
                      </Group>
                      <Group justify="space-between">
                        <Text size="xs" c="dimmed">Mild</Text>
                        <Text size="xs" c="dimmed">Severe</Text>
                      </Group>
                    </Box>
                  </>
                )}
              </Stack>

              <Textarea
                label="Notes (optional)"
                placeholder="How did it go? Any challenges? What went well?"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                description="If you didn't complete your workout or stick to your diet, let your trainer know what happened."
              />

              <Box>
                <Text fw={500} mb="xs">Progress Photo (optional)</Text>
                <Stack gap="sm">
                  <FileButton onChange={handlePhotoUpload} accept="image/png,image/jpeg,image/jpg">
                    {(props) => <Button {...props} variant="outline">Upload Photo</Button>}
                  </FileButton>
                  {photoPreview && (
                    <Box>
                      <Image src={photoPreview} alt="Progress photo" width={200} height={200} fit="cover" radius="sm" />
                      <Button 
                        size="xs" 
                        color="red" 
                        variant="subtle" 
                        mt="xs"
                        onClick={() => {
                          setPhotoPreview(null)
                          setFormData({ ...formData, progress_photo: null })
                        }}
                      >
                        Remove Photo
                      </Button>
                    </Box>
                  )}
                </Stack>
                <Text size="xs" c="dimmed" mt="xs">
                  Upload a progress photo to track your transformation
                </Text>
              </Box>

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
          </>
        )}
          </Tabs.Panel>

          <Tabs.Panel value="history">
            <Title order={1} mb="md">Check-In History</Title>
            {checkInHistory.length === 0 ? (
              <Text c="dimmed">No check-ins yet. Complete your first check-in to see it here!</Text>
            ) : (
              <Stack gap="md">
                {checkInHistory.map(checkIn => (
                  <Card key={checkIn.id} withBorder p="md">
                    <Stack gap="sm">
                      <Group justify="space-between">
                        <Text fw={500}>
                          {new Date(checkIn.check_in_date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </Text>
                        <Badge color={checkIn.status === 'completed' ? 'green' : 'yellow'}>
                          {checkIn.status}
                        </Badge>
                      </Group>
                      
                      <Group>
                        <Text size="sm">
                          <Text span fw={500}>Workout:</Text> {checkIn.workout_completed ? '✓ Completed' : '✗ Not completed'}
                        </Text>
                        {checkIn.workout_rating && (
                          <Badge color="green" variant="light">
                            Rating: {checkIn.workout_rating}/10
                          </Badge>
                        )}
                        {checkIn.workout_duration && (
                          <Badge color="blue" variant="light">
                            {checkIn.workout_duration} min
                          </Badge>
                        )}
                      </Group>
                      
                      <Group>
                        <Text size="sm">
                          <Text span fw={500}>Diet:</Text> {checkIn.diet_stuck_to ? '✓ Stuck to plan' : '✗ Did not stick to plan'}
                        </Text>
                      </Group>

                      {(checkIn.sleep_hours || checkIn.sleep_quality) && (
                        <Group>
                          <Text size="sm">
                            <Text span fw={500}>Sleep:</Text> {checkIn.sleep_hours && `${checkIn.sleep_hours} hours`}
                            {checkIn.sleep_quality && (
                              <Badge color="blue" variant="light" ml="xs">
                                Quality: {checkIn.sleep_quality}/10
                              </Badge>
                            )}
                          </Text>
                        </Group>
                      )}

                      {checkIn.energy_level && (
                        <Group>
                          <Text size="sm">
                            <Text span fw={500}>Energy Level:</Text>
                            <Badge color="yellow" variant="light" ml="xs">
                              {checkIn.energy_level}/10
                            </Badge>
                          </Text>
                        </Group>
                      )}

                      {checkIn.pain_experienced && (
                        <Group>
                          <Text size="sm">
                            <Text span fw={500}>Pain:</Text>
                            <Badge color="red" variant="light" ml="xs">
                              {checkIn.pain_location} - Intensity: {checkIn.pain_intensity}/10
                            </Badge>
                          </Text>
                        </Group>
                      )}

                      {checkIn.progress_photo && (
                        <Box>
                          <Text size="sm" fw={500} mb="xs">Progress Photo:</Text>
                          <Image src={checkIn.progress_photo} alt="Progress" width={150} height={150} fit="cover" radius="sm" />
                        </Box>
                      )}

                      {checkIn.notes && (
                        <Box>
                          <Text size="sm" fw={500} mb="xs">Notes:</Text>
                          <Text size="sm" c="dimmed">{checkIn.notes}</Text>
                        </Box>
                      )}

                      {checkIn.trainer_response && (
                        <Alert color="blue" title="Trainer Response">
                          {checkIn.trainer_response}
                        </Alert>
                      )}
                    </Stack>
                  </Card>
                ))}
              </Stack>
            )}
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Container>
  )
}

export default DailyCheckIn

