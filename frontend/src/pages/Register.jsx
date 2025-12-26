import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Container, Paper, Title, TextInput, PasswordInput, Select, Button, Text, Stack, Alert, Box, Anchor } from '@mantine/core'
import { useAuth } from '../contexts/AuthContext'

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'client',
    phoneNumber: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    // Validate phone number for trainers
    if (formData.role === 'trainer' && !formData.phoneNumber.trim()) {
      setError('Phone number is required for trainers')
      return
    }

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        phoneNumber: formData.role === 'trainer' ? formData.phoneNumber : undefined
      })
      // Redirect based on role
      if (formData.role === 'client') {
        navigate('/client/onboarding')
      } else {
        navigate('/trainer')
      }
    } catch (err) {
      console.error('Registration error:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed'
      setError(errorMessage)
      console.error('Full error:', err.response?.data || err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '2rem', backgroundColor: '#F5F9F0' }}>
      <Container size={420} my={40}>
        <Paper shadow="md" p={30} radius="sm" withBorder>
          <Title order={1} ta="center" mb="xl">
            Register
          </Title>
          
          {error && (
            <Alert color="red" mb="md">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Name"
                placeholder="Your name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                size="md"
              />

              <TextInput
                label="Email"
                placeholder="your@email.com"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                size="md"
              />

              <Select
                label="Role"
                name="role"
                value={formData.role}
                onChange={(value) => setFormData({ ...formData, role: value })}
                data={[
                  { value: 'client', label: 'Client' },
                  { value: 'trainer', label: 'Trainer' }
                ]}
                withinPortal
                required
                size="md"
              />

              {formData.role === 'trainer' && (
                <TextInput
                  label="Phone Number"
                  placeholder="(555) 123-4567"
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  required
                  size="md"
                  description="Required for trainers so clients can contact you"
                />
              )}

              <PasswordInput
                label="Password"
                placeholder="Your password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                size="md"
              />

              <PasswordInput
                label="Confirm Password"
                placeholder="Confirm your password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                size="md"
              />

              <Button 
                type="submit" 
                fullWidth 
                loading={loading}
                size="md"
                mt="md"
                color="robinhoodGreen"
              >
                {loading ? 'Registering...' : 'Register'}
              </Button>
            </Stack>
          </form>

          <Text ta="center" mt="md" size="sm">
            Already have an account? <Anchor component={Link} to="/login" c="robinhoodGreen.6" fw={500}>Login</Anchor>
          </Text>
        </Paper>
      </Container>
    </Box>
  )
}

export default Register

