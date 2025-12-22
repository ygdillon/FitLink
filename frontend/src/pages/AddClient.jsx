import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Paper, Title, Text, Stepper, Stack, TextInput, NumberInput, Select, Textarea, Button, Group, Badge, Alert, Progress } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import api from '../services/api'
import './AddClient.css'

function AddClient() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    email: '',
    password: '',
    
    // Physical Info
    height: '',
    weight: '',
    gender: '',
    age: '',
    
    // Experience & Lifestyle
    previous_experience: '',
    average_daily_eating: '',
    
    // Goals
    primary_goal: '',
    goal_target: '',
    goal_timeframe: '',
    secondary_goals: [],
    
    // Barriers & Preferences
    barriers: '',
    training_preference: 'online',
    communication_preference: 'daily'
  })

  const form = useForm({
    initialValues: formData,
    validate: {
      name: (value) => (!value ? 'Name is required' : null),
      email: (value) => (!value ? 'Email is required' : /^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      height: (value) => (!value ? 'Height is required' : null),
      weight: (value) => (!value ? 'Weight is required' : null),
      gender: (value) => (!value ? 'Gender is required' : null),
      primary_goal: (value) => (!value ? 'Primary goal is required' : null),
      goal_target: (value) => (!value ? 'Goal target is required' : null),
      goal_timeframe: (value) => (!value ? 'Goal timeframe is required' : null),
      barriers: (value) => (!value ? 'Barriers are required' : null),
      training_preference: (value) => (!value ? 'Training preference is required' : null),
      communication_preference: (value) => (!value ? 'Communication preference is required' : null),
    },
  })

  const handleSecondaryGoalAdd = () => {
    const goal = prompt('Enter secondary goal:')
    if (goal) {
      form.setFieldValue('secondary_goals', [...form.values.secondary_goals, goal])
    }
  }

  const handleSecondaryGoalRemove = (index) => {
    form.setFieldValue('secondary_goals', form.values.secondary_goals.filter((_, i) => i !== index))
  }

  const nextStep = () => {
    if (step === 1) {
      if (!form.validateField('name').hasError && !form.validateField('email').hasError) {
        setStep(step + 1)
        setError('')
      } else {
        setError('Please fill in all required fields')
      }
    } else if (step === 2) {
      if (!form.validateField('height').hasError && !form.validateField('weight').hasError && !form.validateField('gender').hasError) {
        setStep(step + 1)
        setError('')
      } else {
        setError('Please fill in all required fields')
      }
    } else if (step === 3) {
      if (!form.validateField('primary_goal').hasError && !form.validateField('goal_target').hasError && !form.validateField('goal_timeframe').hasError) {
        setStep(step + 1)
        setError('')
      } else {
        setError('Please fill in all required fields')
      }
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
      await api.post('/trainer/clients', {
        ...values,
        onboarding_data: values,
        onboarding_completed: true
      })
      notifications.show({
        title: 'Client Added',
        message: 'Client has been successfully added!',
        color: 'green',
      })
      navigate('/trainer/clients')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add client')
      notifications.show({
        title: 'Error',
        message: err.response?.data?.message || 'Failed to add client',
        color: 'red',
      })
      console.error('Error adding client:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container size={800} py="xl">
      <Paper shadow="md" p="xl" radius="md" withBorder>
        <Title order={1} mb="xs" ta="center">Add New Client</Title>
        <Text c="dimmed" ta="center" mb="xl">Create a new client account and complete their profile</Text>
        
        <Progress value={(step / 4) * 100} mb="xl" />

        {error && <Alert color="red" mb="md">{error}</Alert>}

        <Stepper active={step - 1} onStepClick={setStep} breakpoint="sm" allowNextStepsSelect={false}>
          <Stepper.Step label="Basic Info" description="Client details">
            <Stack gap="md" mt="xl">
              <Title order={3}>Basic Information</Title>
              <TextInput
                label="Client Name *"
                placeholder="John Doe"
                {...form.getInputProps('name')}
                required
              />
              <TextInput
                label="Email *"
                placeholder="john@example.com"
                type="email"
                {...form.getInputProps('email')}
                required
              />
              <TextInput
                label="Password (optional - will generate if not provided)"
                type="password"
                placeholder="Leave empty to auto-generate"
                {...form.getInputProps('password')}
              />
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="Physical Info" description="Body metrics">
            <Stack gap="md" mt="xl">
              <Title order={3}>Physical Information</Title>
              <Group grow>
                <NumberInput
                  label="Height (cm) *"
                  placeholder="175"
                  step={0.1}
                  {...form.getInputProps('height')}
                  required
                />
                <NumberInput
                  label="Weight (kg) *"
                  placeholder="70"
                  step={0.1}
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
                  label="Age"
                  placeholder="30"
                  {...form.getInputProps('age')}
                />
              </Group>
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="Goals" description="Fitness objectives">
            <Stack gap="md" mt="xl">
              <Title order={3}>Goals & Experience</Title>
              <Textarea
                label="Previous Gym Experience"
                placeholder="Describe their previous experience with fitness, gym, training..."
                rows={3}
                {...form.getInputProps('previous_experience')}
              />
              <Textarea
                label="Average Daily Eating Habits"
                placeholder="Describe their typical daily eating patterns..."
                rows={3}
                {...form.getInputProps('average_daily_eating')}
              />
              <Select
                label="Primary Goal *"
                placeholder="Select primary goal"
                data={[
                  'Weight Loss',
                  'Muscle Gain',
                  'Strength Training',
                  'Endurance',
                  'General Fitness',
                  'Athletic Performance',
                  'Rehabilitation',
                  'Other'
                ]}
                withinPortal
                {...form.getInputProps('primary_goal')}
                required
              />
              <TextInput
                label="Goal Target *"
                placeholder="e.g., Lose 20 lbs, Gain 10 lbs muscle, Bench 225 lbs"
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
                <Text fw={500} mb="xs">Secondary Goals</Text>
                <Group gap="xs" mb="xs">
                  {form.values.secondary_goals.map((goal, index) => (
                    <Badge
                      key={index}
                      variant="light"
                      rightSection={
                        <button
                          type="button"
                          onClick={() => handleSecondaryGoalRemove(index)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4 }}
                        >
                          ×
                        </button>
                      }
                    >
                      {goal}
                    </Badge>
                  ))}
                </Group>
                <Button variant="outline" size="sm" onClick={handleSecondaryGoalAdd}>
                  + Add Secondary Goal
                </Button>
              </div>
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="Preferences" description="Training style">
            <Stack gap="md" mt="xl">
              <Title order={3}>Barriers & Preferences</Title>
              <Textarea
                label="What has kept them from the gym until now? *"
                placeholder="Lack of time, motivation, feeling uncomfortable, etc."
                rows={3}
                {...form.getInputProps('barriers')}
                required
              />
              <Select
                label="Training Preference *"
                data={['Online', 'In-Person', 'Hybrid']}
                withinPortal
                {...form.getInputProps('training_preference')}
                required
              />
              <Select
                label="Communication Preference *"
                data={['Daily Check-ins', 'Weekly Check-ins', 'As Needed']}
                withinPortal
                {...form.getInputProps('communication_preference')}
                required
                description="For online training, daily contact is recommended for better accountability"
              />
            </Stack>
          </Stepper.Step>

          <Stepper.Completed>
            <Stack gap="md" mt="xl">
              <Title order={3}>Review Client Information</Title>
              <Text>Please review the information and click Add Client to finish.</Text>
            </Stack>
          </Stepper.Completed>
        </Stepper>

        <Group justify="flex-end" mt="xl">
          {step > 1 && (
            <Button variant="default" onClick={prevStep}>
              Previous
            </Button>
          )}
          {step < 4 ? (
            <Button onClick={nextStep}>Next step</Button>
          ) : (
            <Button onClick={() => form.onSubmit(handleSubmit)()} loading={loading}>
              Add Client
            </Button>
          )}
        </Group>
      </Paper>
    </Container>
  )
}

export default AddClient

