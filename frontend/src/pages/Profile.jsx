import { useState, useEffect } from 'react'
import { Container, Paper, Title, Text, Stack, TextInput, Textarea, Button, Loader, Alert } from '@mantine/core'
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
      specialties: ''
    },
    validate: {
      name: (value) => (!value ? 'Name is required' : null),
      email: (value) => (!value ? 'Email is required' : /^\S+@\S+$/.test(value) ? null : 'Invalid email'),
    },
  })

  useEffect(() => {
    if (user) {
      form.setValues({
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        certifications: user.certifications?.join(', ') || '',
        specialties: user.specialties?.join(', ') || ''
      })
    }
  }, [user])

  const handleSubmit = async (values) => {
    setLoading(true)

    try {
      const updateData = {
        ...values,
        certifications: values.certifications.split(',').map(s => s.trim()).filter(s => s),
        specialties: values.specialties.split(',').map(s => s.trim()).filter(s => s)
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
        message: 'Failed to update profile',
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
        <Title order={1} mb="xl">Profile Settings</Title>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Name"
              {...form.getInputProps('name')}
              required
            />
            <TextInput
              label="Email"
              type="email"
              {...form.getInputProps('email')}
              required
            />
            {user.role === 'trainer' && (
              <>
                <Textarea
                  label="Bio"
                  rows={4}
                  {...form.getInputProps('bio')}
                />
                <TextInput
                  label="Certifications (comma-separated)"
                  placeholder="NASM, ACE, etc."
                  {...form.getInputProps('certifications')}
                />
                <TextInput
                  label="Specialties (comma-separated)"
                  placeholder="Weight Loss, Strength Training, etc."
                  {...form.getInputProps('specialties')}
                />
              </>
            )}
            <Button type="submit" loading={loading}>
              Save Changes
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}

export default Profile

