import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Paper, Title, Text, Stepper, Stack, TextInput, NumberInput, Select, Textarea, Button, Group, Checkbox, Alert, Progress, Box, SimpleGrid } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import api from '../services/api'

function ClientOnboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    // Basic Info
    height: '',
    weight: '',
    gender: '',
    age: '',
    location: '',
    
    // Workout Experience
    previous_experience: '',
    activity_level: '',
    available_dates: [],
    
    // Goals
    primary_goal: '',
    goal_target: '',
    goal_timeframe: '',
    secondary_goals: [],
    
    // Nutrition
    nutrition_habits: '',
    nutrition_experience: '',
    average_daily_eating: '',
    
    // Health & Lifestyle
    injuries: '',
    sleep_hours: '',
    stress_level: '',
    lifestyle_activity: '',
    
    // Psychological
    psychological_barriers: '',
    mindset: '',
    motivation_why: '',
    
    // Preferences
    training_preference: '',
    communication_preference: '',
    barriers: ''
  })

  useEffect(() => {
    // Check if already completed
    checkOnboardingStatus()
  }, [])

  const checkOnboardingStatus = async () => {
    try {
      const response = await api.get('/client/profile/onboarding-status')
      if (response.data.onboarding_completed) {
        navigate('/client')
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error)
    }
  }

  const handleDateChange = (day, time) => {
    const dates = form.values.available_dates || []
    const exists = dates.find(d => d.day === day && d.time === time)
    
    if (exists) {
      form.setFieldValue('available_dates', dates.filter(d => !(d.day === day && d.time === time)))
    } else {
      form.setFieldValue('available_dates', [...dates, { day, time }])
    }
  }

  const nextStep = () => {
    if (step === 1) {
      if (!form.validateField('height').hasError && 
          !form.validateField('weight').hasError && 
          !form.validateField('gender').hasError && 
          !form.validateField('age').hasError && 
          !form.validateField('location').hasError) {
        setStep(step + 1)
      }
    } else {
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    setStep(step - 1)
    setError('')
  }

  const handleSubmit = async (values) => {
    setLoading(true)
    setError('')

    try {
      const payload = {
        ...values,
        onboarding_completed: true,
        onboarding_data: values
      }
      await api.put('/client/profile', payload)
      notifications.show({
        title: 'Profile Complete',
        message: 'Your profile has been successfully saved!',
        color: 'green',
      })
      navigate('/client')
    } catch (err) {
      console.error('Error saving profile:', err)
      setError(err.response?.data?.message || 'Failed to save profile')
      notifications.show({
        title: 'Error',
        message: err.response?.data?.message || 'Failed to save profile',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  const form = useForm({
    initialValues: formData,
    validate: {
      height: (value) => (!value ? 'Height is required' : null),
      weight: (value) => (!value ? 'Weight is required' : null),
      gender: (value) => (!value ? 'Gender is required' : null),
      age: (value) => (!value ? 'Age is required' : null),
      location: (value) => (!value ? 'Location is required' : null),
      previous_experience: (value) => (!value ? 'Workout experience is required' : null),
      activity_level: (value) => (!value ? 'Activity level is required' : null),
      primary_goal: (value) => (!value ? 'Primary goal is required' : null),
      goal_target: (value) => (!value ? 'Goal target is required' : null),
      goal_timeframe: (value) => (!value ? 'Goal timeframe is required' : null),
      nutrition_habits: (value) => (!value ? 'Nutrition habits are required' : null),
      nutrition_experience: (value) => (!value ? 'Nutrition experience is required' : null),
      sleep_hours: (value) => (!value ? 'Sleep hours are required' : null),
      stress_level: (value) => (!value ? 'Stress level is required' : null),
      lifestyle_activity: (value) => (!value ? 'Lifestyle activity is required' : null),
      psychological_barriers: (value) => (!value ? 'Psychological barriers are required' : null),
      mindset: (value) => (!value ? 'Mindset is required' : null),
      motivation_why: (value) => (!value ? 'Motivation is required' : null),
      training_preference: (value) => (!value ? 'Training preference is required' : null),
      communication_preference: (value) => (!value ? 'Communication preference is required' : null),
    },
  })

  const totalSteps = 7

  return (
    <Container size={800} py="xl">
      <Paper shadow="md" p="xl" radius="md" withBorder>
        <Title order={1} mb="xs" ta="center">Complete Your Profile</Title>
        <Text c="dimmed" ta="center" mb="xl">Help trainers understand your needs and goals</Text>
        
        <Progress value={(step / totalSteps) * 100} mb="xl" />
        <Text ta="center" c="dimmed" mb="xl">Step {step} of {totalSteps}</Text>

        {error && <Alert color="red" mb="md">{error}</Alert>}

        <Stepper active={step - 1} onStepClick={setStep} breakpoint="sm" allowNextStepsSelect={false}>
          <Stepper.Step label="Basic Info" description="Personal information">
            <Stack gap="md" mt="xl">
              <Title order={3}>Basic Information</Title>
              <Group grow>
                <NumberInput
                  label="Height (cm) *"
                  placeholder="e.g., 175"
                  {...form.getInputProps('height')}
                  required
                />
                <NumberInput
                  label="Weight (kg) *"
                  placeholder="e.g., 70"
                  {...form.getInputProps('weight')}
                  required
                />
              </Group>
              <Group grow>
                <Select
                  label="Gender *"
                  placeholder="Select gender"
                  data={['Male', 'Female', 'Other', 'Prefer not to say']}
                  withinPortal
                  {...form.getInputProps('gender')}
                  required
                />
                <NumberInput
                  label="Age *"
                  placeholder="e.g., 30"
                  min={13}
                  {...form.getInputProps('age')}
                  required
                />
              </Group>
              <TextInput
                label="Where do you live? (City, State) *"
                placeholder="e.g., New York, NY"
                {...form.getInputProps('location')}
                required
              />
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="Experience" description="Workout background">
            <Stack gap="md" mt="xl">
              <Title order={3}>Workout Experience</Title>
              <Textarea
                label="How much workout experience do you have? *"
                placeholder="Describe your fitness background, any gym experience, sports, etc."
                rows={4}
                {...form.getInputProps('previous_experience')}
                required
              />
              <Select
                label="Current Activity Level *"
                placeholder="Select activity level"
                withinPortal
                data={[
                  'Sedentary (little to no exercise)',
                  'Light (exercise 1-3 days/week)',
                  'Moderate (exercise 3-5 days/week)',
                  'Active (exercise 6-7 days/week)',
                  'Very Active (intense exercise daily)'
                ]}
                {...form.getInputProps('activity_level')}
                required
              />
              <Box>
                <Text fw={500} mb="xs">Available Days & Times</Text>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md" p="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)', borderRadius: '8px' }}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <Stack key={day} gap="xs">
                      <Text fw={500} mb="xs">{day}</Text>
                      {['Morning (6-9 AM)', 'Midday (9 AM-12 PM)', 'Afternoon (12-5 PM)', 'Evening (5-9 PM)'].map(time => (
                        <Checkbox
                          key={time}
                          label={time}
                          checked={form.values.available_dates?.some(d => d.day === day && d.time === time)}
                          onChange={() => handleDateChange(day, time)}
                          mb="xs"
                        />
                      ))}
                    </Stack>
                  ))}
                </SimpleGrid>
              </Box>
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="Goals" description="Fitness objectives">
            <Stack gap="md" mt="xl">
              <Title order={3}>Your Goals</Title>
              <Select
                label="Primary Goal *"
                placeholder="Select primary goal"
                withinPortal
                data={[
                  'Lose Weight',
                  'Gain Muscle',
                  'Improve Strength',
                  'Improve Endurance',
                  'General Fitness',
                  'Athletic Performance',
                  'Rehabilitation',
                  'Other'
                ]}
                {...form.getInputProps('primary_goal')}
                required
              />
              <TextInput
                label="Goal Target *"
                placeholder="e.g., Lose 20 lbs, Gain 10 lbs muscle, Run a 5K"
                {...form.getInputProps('goal_target')}
                required
              />
              <TextInput
                label="Goal Timeframe *"
                placeholder="e.g., 3 months, 6 months, 1 year"
                {...form.getInputProps('goal_timeframe')}
                required
              />
              <div>
                <Text fw={500} mb="xs">Secondary Goals (select all that apply)</Text>
                <Stack gap="xs">
                  {['Improve flexibility', 'Better posture', 'Increase energy', 'Reduce stress', 'Build confidence', 'Better sleep'].map(goal => (
                    <Checkbox
                      key={goal}
                      label={goal}
                      checked={form.values.secondary_goals?.includes(goal)}
                      onChange={(e) => {
                        const current = form.values.secondary_goals || []
                        if (e.currentTarget.checked) {
                          form.setFieldValue('secondary_goals', [...current, goal])
                        } else {
                          form.setFieldValue('secondary_goals', current.filter(g => g !== goal))
                        }
                      }}
                    />
                  ))}
                </Stack>
              </div>
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="Nutrition" description="Eating habits">
            <Stack gap="md" mt="xl">
              <Title order={3}>Nutrition</Title>
              <Textarea
                label="Current Nutrition Habits *"
                placeholder="Describe your current eating patterns, meal frequency, typical foods, etc."
                rows={4}
                {...form.getInputProps('nutrition_habits')}
                required
              />
              <Textarea
                label="Nutrition/Dieting Experience *"
                placeholder="Have you tried dieting before? What worked? What didn't?"
                rows={4}
                {...form.getInputProps('nutrition_experience')}
                required
              />
              <Textarea
                label="Average Daily Eating"
                placeholder="Describe a typical day of eating for you"
                rows={3}
                {...form.getInputProps('average_daily_eating')}
              />
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="Health" description="Lifestyle factors">
            <Stack gap="md" mt="xl">
              <Title order={3}>Health & Lifestyle</Title>
              <Textarea
                label="Injuries or Limitations"
                placeholder="List any injuries, physical limitations, or health concerns (leave blank if none)"
                rows={3}
                {...form.getInputProps('injuries')}
              />
              <NumberInput
                label="Average Hours of Sleep per Night *"
                placeholder="e.g., 7"
                min={0}
                max={12}
                {...form.getInputProps('sleep_hours')}
                required
              />
              <Select
                label="Stress Level *"
                placeholder="Select stress level"
                data={['Low', 'Moderate', 'High']}
                withinPortal
                {...form.getInputProps('stress_level')}
                required
              />
              <Textarea
                label="Lifestyle Activity Description *"
                placeholder="Describe your daily routine, job activity level, hobbies, etc."
                rows={4}
                {...form.getInputProps('lifestyle_activity')}
                required
              />
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="Psychology" description="Mindset & motivation">
            <Stack gap="md" mt="xl">
              <Title order={3}>Psychological Factors</Title>
              <Textarea
                label="Psychological Barriers *"
                placeholder="What has kept you from achieving your fitness goals? (fear, lack of time, motivation, etc.)"
                rows={4}
                {...form.getInputProps('psychological_barriers')}
                required
              />
              <Textarea
                label="Current Mindset *"
                placeholder="How do you feel about fitness and your ability to achieve your goals?"
                rows={4}
                {...form.getInputProps('mindset')}
                required
              />
              <Textarea
                label="Your 'Why' - Motivation *"
                placeholder="Why do you want to get fit? What's driving you? What will success look like?"
                rows={4}
                {...form.getInputProps('motivation_why')}
                required
              />
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="Preferences" description="Training style">
            <Stack gap="md" mt="xl">
              <Title order={3}>Training Preferences</Title>
              <Select
                label="Training Preference *"
                placeholder="Select preference"
                data={['In-Person', 'Online', 'Hybrid (Both)']}
                withinPortal
                {...form.getInputProps('training_preference')}
                required
              />
              <Select
                label="Communication Preference *"
                placeholder="Select preference"
                data={['Daily', 'Few Times a Week', 'Weekly', 'As Needed']}
                withinPortal
                {...form.getInputProps('communication_preference')}
                required
              />
              <Textarea
                label="What barriers have kept you from the gym?"
                placeholder="Time constraints, cost, intimidation, etc."
                rows={3}
                {...form.getInputProps('barriers')}
              />
            </Stack>
          </Stepper.Step>

          <Stepper.Completed>
            <Stack gap="md" mt="xl">
              <Title order={3}>Review Your Information</Title>
              <Text>Please review your information and click Complete Profile to finish.</Text>
            </Stack>
          </Stepper.Completed>
        </Stepper>

        <Group justify="flex-end" mt="xl">
          {step > 1 && (
            <Button variant="default" onClick={prevStep}>
              Back
            </Button>
          )}
          {step < totalSteps ? (
            <Button onClick={nextStep}>Next step</Button>
          ) : (
            <Button onClick={() => form.onSubmit(handleSubmit)()} loading={loading}>
              Complete Profile
            </Button>
          )}
        </Group>
      </Paper>
    </Container>
  )
}

export default ClientOnboarding

