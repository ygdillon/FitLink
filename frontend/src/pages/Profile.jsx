import { useState, useEffect, useRef } from 'react'
import { Container, Paper, Title, Text, Stack, TextInput, Textarea, Button, Loader, Alert, Divider, NumberInput, Group, Avatar, Center, Grid, Checkbox, SimpleGrid } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './Profile.css'

function Profile() {
  const { user, fetchUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [profileImage, setProfileImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const fileInputRef = useRef(null)

  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      bio: '',
      certifications: '',
      specialties: '',
      hourly_rate: '',
      phone_number: '',
      fitness_goals: [],
      client_age_ranges: [],
      location: ''
    },
    validate: {
      name: (value) => (!value ? 'Name is required' : null),
      email: (value) => (!value ? 'Email is required' : /^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      hourly_rate: (value) => (value && (isNaN(value) || value < 0) ? 'Must be a valid positive number' : null),
    },
  })

  useEffect(() => {
    if (user) {
      form.setValues({
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        certifications: user.certifications?.join(', ') || '',
        specialties: user.specialties?.join(', ') || '',
        hourly_rate: user.hourly_rate || '',
        phone_number: user.phone_number || '',
        fitness_goals: user.fitness_goals || [],
        client_age_ranges: user.client_age_ranges || [],
        location: user.location || ''
      })
      setImagePreview(user.profile_image || null)
    }
  }, [user])

  const fitnessGoalsOptions = [
    'Lose weight',
    'Build muscle',
    'Boost endurance',
    'Get toned',
    'Gain flexibility'
  ]

  const clientAgeRanges = [
    'Younger than 18',
    '18 - 22 years old',
    '23 - 30 years old',
    '31 - 40 years old',
    '41 - 50 years old',
    '51 - 60 years old',
    '61+ years old'
  ]

  const handleFitnessGoalToggle = (goal) => {
    const current = form.values.fitness_goals || []
    if (current.includes(goal)) {
      form.setFieldValue('fitness_goals', current.filter(g => g !== goal))
    } else {
      form.setFieldValue('fitness_goals', [...current, goal])
    }
  }

  const handleAgeRangeToggle = (range) => {
    const current = form.values.client_age_ranges || []
    if (current.includes(range)) {
      form.setFieldValue('client_age_ranges', current.filter(r => r !== range))
    } else {
      form.setFieldValue('client_age_ranges', [...current, range])
    }
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        notifications.show({
          title: 'Invalid File',
          message: 'Please select an image file',
          color: 'red',
        })
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        notifications.show({
          title: 'File Too Large',
          message: 'Please select an image smaller than 5MB',
          color: 'red',
        })
        return
      }

      // Read file and convert to base64
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result
        setProfileImage(base64String)
        setImagePreview(base64String)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setProfileImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (values) => {
    setLoading(true)

    try {
      const updateData = {
        ...values,
        certifications: values.certifications ? values.certifications.split(',').map(s => s.trim()).filter(s => s) : [],
        specialties: values.specialties ? values.specialties.split(',').map(s => s.trim()).filter(s => s) : [],
        hourly_rate: values.hourly_rate ? parseFloat(values.hourly_rate) : null,
        phone_number: values.phone_number || null,
        profile_image: profileImage || null,
        fitness_goals: values.fitness_goals || [],
        client_age_ranges: values.client_age_ranges || [],
        location: values.location || null
      }
      await api.put('/profile', updateData)
      await fetchUser()
      setProfileImage(null) // Reset after successful update
      notifications.show({
        title: 'Profile Updated',
        message: 'Your profile has been successfully updated!',
        color: 'green',
      })
    } catch (error) {
      console.error('Error updating profile:', error)
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update profile',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <Group justify="center" py="xl">
        <Loader size="lg" />
      </Group>
    )
  }

  return (
    <Container size="md" py="xl">
      <Paper shadow="md" p="xl" radius="md" withBorder>
        <Title order={1} mb="md">Profile Settings</Title>
        <Text c="dimmed" mb="xl" size="sm">
          {user.role === 'trainer' 
            ? 'Update your profile information to help clients find and connect with you. A complete profile increases your visibility and helps clients make informed decisions.'
            : 'Update your account information and preferences.'}
        </Text>
        
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="lg">
            {/* Profile Picture and Basic Information Side by Side */}
            <Grid gutter="xl">
              {/* Left Side - Profile Picture */}
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <Stack gap="md" align="center">
                  <Title order={3} mb="xs" style={{ width: '100%' }}>Profile Picture</Title>
                  <Avatar
                    src={imagePreview}
                    size={120}
                    radius="50%"
                    style={{
                      border: '3px solid var(--mantine-color-gray-3)',
                      cursor: 'pointer'
                    }}
                  >
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </Avatar>
                  <Group gap="xs" justify="center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                      id="profile-image-input"
                    />
                    <label htmlFor="profile-image-input">
                      <Button
                        component="span"
                        variant="light"
                        size="sm"
                        color="robinhoodGreen"
                      >
                        {imagePreview ? 'Change Picture' : 'Add Picture'}
                      </Button>
                    </label>
                    {imagePreview && (
                      <Button
                        variant="light"
                        size="sm"
                        color="red"
                        onClick={handleRemoveImage}
                      >
                        Remove
                      </Button>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed" ta="center">
                    Upload a circular profile picture. Max size: 5MB
                  </Text>
                </Stack>
              </Grid.Col>

              {/* Right Side - Basic Information */}
              <Grid.Col span={{ base: 12, sm: 8 }}>
                <Title order={3} mb="md">Basic Information</Title>
                <Stack gap="md">
                  <TextInput
                    label="Full Name"
                    placeholder="Enter your full name"
                    {...form.getInputProps('name')}
                    required
                  />
                  <TextInput
                    label="Email Address"
                    type="email"
                    placeholder="your.email@example.com"
                    {...form.getInputProps('email')}
                    required
                  />
                </Stack>
              </Grid.Col>
            </Grid>

            {user.role === 'trainer' && (
              <>
                <Divider />
                
                {/* Professional Information */}
                <div>
                  <Title order={3} mb="md">Professional Information</Title>
                  <Text c="dimmed" size="sm" mb="md">
                    This information will be visible to clients when they search for trainers. Make it descriptive and engaging!
                  </Text>
                  <Stack gap="md">
                    <Textarea
                      label="Professional Bio"
                      placeholder="Tell clients about your experience, approach, and what makes you unique. This is your chance to make a great first impression!"
                      rows={6}
                      {...form.getInputProps('bio')}
                      description="Write a compelling bio that highlights your expertise, training philosophy, and what clients can expect when working with you."
                    />
                    <Group grow>
                      <NumberInput
                        label="Hourly Rate"
                        placeholder="75.00"
                        min={0}
                        step={5}
                        decimalScale={2}
                        prefix="$"
                        {...form.getInputProps('hourly_rate')}
                        description="Your hourly training rate (optional)"
                      />
                      <TextInput
                        label="Phone Number"
                        placeholder="(555) 123-4567"
                        {...form.getInputProps('phone_number')}
                        description="Contact number for clients (optional)"
                      />
                    </Group>
                    <TextInput
                      label="Location"
                      placeholder="e.g., New York, NY or Los Angeles, CA"
                      {...form.getInputProps('location')}
                      description="Your general location (city, state) to help clients find trainers nearby"
                    />
                    <TextInput
                      label="Specialties"
                      placeholder="Weight Loss, Strength Training, Athletic Performance, etc."
                      {...form.getInputProps('specialties')}
                      description="Comma-separated list of your training specialties (e.g., Weight Loss, Strength Training, Yoga)"
                    />
                    <TextInput
                      label="Certifications"
                      placeholder="NASM-CPT, ACE Certified, CSCS, etc."
                      {...form.getInputProps('certifications')}
                      description="Comma-separated list of your professional certifications"
                    />
                  </Stack>
                </div>

                <Divider />

                {/* Trainer Preferences */}
                <div>
                  <Title order={3} mb="md">Client Preferences</Title>
                  <Text c="dimmed" size="sm" mb="md">
                    Select the types of clients and goals you prefer to work with. This helps match you with the right clients.
                  </Text>
                  <Stack gap="lg">
                    {/* Fitness Goals */}
                    <div>
                      <Text fw={500} mb="sm">Fitness goals</Text>
                      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
                        {fitnessGoalsOptions.map((goal) => (
                          <Checkbox
                            key={goal}
                            label={goal}
                            checked={form.values.fitness_goals?.includes(goal) || false}
                            onChange={() => handleFitnessGoalToggle(goal)}
                            styles={{
                              label: {
                                cursor: 'pointer'
                              }
                            }}
                          />
                        ))}
                      </SimpleGrid>
                    </div>

                    {/* Client Age Ranges */}
                    <div>
                      <Text fw={500} mb="sm">Client age</Text>
                      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
                        {clientAgeRanges.map((range) => (
                          <Checkbox
                            key={range}
                            label={range}
                            checked={form.values.client_age_ranges?.includes(range) || false}
                            onChange={() => handleAgeRangeToggle(range)}
                            styles={{
                              label: {
                                cursor: 'pointer'
                              }
                            }}
                          />
                        ))}
                      </SimpleGrid>
                    </div>
                  </Stack>
                </div>
              </>
            )}
            
            <Divider />
            
            <Button type="submit" loading={loading} size="md" color="robinhoodGreen">
              Save Changes
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}

export default Profile

