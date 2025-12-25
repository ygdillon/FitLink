import { useState, useEffect } from 'react'
import { Container, Paper, Title, Text, Stack, TextInput, Textarea, Button, Loader, Alert, Divider, NumberInput, Group } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './Profile.css'

function Profile() {
  const { user, fetchUser } = useAuth()
  const [loading, setLoading] = useState(false)

  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      bio: '',
      certifications: '',
      specialties: '',
      hourly_rate: '',
      phone_number: ''
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
        phone_number: user.phone_number || ''
      })
    }
  }, [user])

  const handleSubmit = async (values) => {
    setLoading(true)

    try {
      const updateData = {
        ...values,
        certifications: values.certifications ? values.certifications.split(',').map(s => s.trim()).filter(s => s) : [],
        specialties: values.specialties ? values.specialties.split(',').map(s => s.trim()).filter(s => s) : [],
        hourly_rate: values.hourly_rate ? parseFloat(values.hourly_rate) : null,
        phone_number: values.phone_number || null
      }
      await api.put('/profile', updateData)
      await fetchUser()
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
            {/* Basic Information */}
            <div>
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
            </div>

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

