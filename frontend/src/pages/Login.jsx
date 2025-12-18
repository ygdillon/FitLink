import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Container, Paper, Title, TextInput, PasswordInput, Button, Text, Stack, Alert, Box, Anchor } from '@mantine/core'
import { useAuth } from '../contexts/AuthContext'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '2rem', backgroundColor: '#F5F9F0' }}>
      <Container size={420} my={40}>
        <Paper shadow="md" p={30} radius="md" withBorder>
          <Title order={1} ta="center" mb="xl">
            Login
          </Title>
          
          {error && (
            <Alert color="red" mb="md">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Email"
                placeholder="your@email.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                size="md"
              />
              
              <PasswordInput
                label="Password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </Stack>
          </form>

          <Text ta="center" mt="md" size="sm">
            Don't have an account? <Anchor component={Link} to="/register" c="robinhoodGreen.6" fw={500}>Register</Anchor>
          </Text>
        </Paper>
      </Container>
    </Box>
  )
}

export default Login

