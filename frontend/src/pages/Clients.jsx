import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Title, Text, Stack, Group, Button, TextInput, Select, Paper, Grid, Badge, Avatar, Loader, Alert, Card } from '@mantine/core'
import api from '../services/api'
import './Clients.css'

function Clients() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    fetchClients()
  }, [])


  const fetchClients = async () => {
    try {
      setError(null)
      const response = await api.get('/trainer/clients')
      setClients(response.data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
      setError(error.response?.data?.message || 'Failed to load clients')
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader size="lg" />
        </Group>
      </Container>
    )
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert color="red" title="Error loading clients" mb="md">
          {error}
        </Alert>
        <Button onClick={fetchClients}>Retry</Button>
      </Container>
    )
  }

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>My Clients</Title>
        <Group>
          <Button onClick={() => navigate('/trainer/add-client')}>
            + Add New Client
          </Button>
          <Button variant="outline" disabled>
            Find Clients
          </Button>
        </Group>
      </Group>

      {/* Add/Find Clients Section */}
      <Grid gutter="md" mb="xl">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={3} mb="xs">Add New Client</Title>
            <Text c="dimmed" mb="md">
              Invite a new client and complete their onboarding to get started with personalized training.
            </Text>
            <Button onClick={() => navigate('/trainer/add-client')} fullWidth>
              Add Client →
            </Button>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={3} mb="xs">Find Clients</Title>
            <Text c="dimmed" mb="md">
              Discover potential clients looking for trainers. Connect and grow your client base.
            </Text>
            <Button variant="outline" fullWidth disabled>
              Coming Soon
            </Button>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Clients List */}
      <Paper shadow="sm" p="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={3}>Current Clients ({filteredClients.length})</Title>
          <Group>
            <TextInput
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ minWidth: 200 }}
            />
            <Select
              value={filterStatus}
              onChange={(value) => setFilterStatus(value)}
              data={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
            />
          </Group>
        </Group>

        {filteredClients.length === 0 ? (
          <Stack align="center" py="xl">
            <Text c="dimmed" size="lg">No clients found.</Text>
            <Text c="dimmed" size="sm">
              {clients.length === 0 
                ? 'Get started by adding your first client!'
                : 'Try adjusting your search or filter.'}
            </Text>
          </Stack>
        ) : (
          <Grid gutter="md">
            {filteredClients.map(client => (
              <Grid.Col key={client.id} span={{ base: 12, sm: 6, md: 4 }}>
                <Card
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                  style={{ cursor: 'pointer', height: '100%' }}
                  onClick={() => navigate(`/trainer/clients/${client.id}`)}
                >
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Group gap="sm">
                        <Avatar color="green" radius="xl">
                          {client.name?.charAt(0).toUpperCase() || 'C'}
                        </Avatar>
                        <div>
                          <Text fw={500}>{client.name}</Text>
                          <Text size="sm" c="dimmed">{client.email}</Text>
                        </div>
                      </Group>
                      <Badge color={client.status === 'active' ? 'green' : 'gray'}>
                        {client.status || 'active'}
                      </Badge>
                    </Group>

                    {client.primary_goal ? (
                      <Stack gap={4}>
                        <Text size="sm">
                          <Text span fw={500}>Goal:</Text>{' '}
                          {client.primary_goal.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Text>
                        {client.goal_target && (
                          <Text size="sm">
                            <Text span fw={500}>Target:</Text> {client.goal_target}
                          </Text>
                        )}
                      </Stack>
                    ) : (
                      <Badge color="yellow" variant="light">⚠️ No Goal Set</Badge>
                    )}

                    {client.training_preference && (
                      <Text size="sm" c="dimmed">
                        <Text span fw={500}>Training:</Text> {client.training_preference}
                      </Text>
                    )}

                    <Group gap="xs" mt="auto">
                      {client.onboarding_completed && (
                        <Badge size="sm" color="green" variant="light">✓ Onboarded</Badge>
                      )}
                      {client.checked_in_today > 0 && (
                        <Badge size="sm" color="blue" variant="light">✓ Checked in today</Badge>
                      )}
                    </Group>
                    {client.start_date && (
                      <Text size="xs" c="dimmed">
                        Started: {new Date(client.start_date).toLocaleDateString()}
                      </Text>
                    )}
                  </Stack>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        )}
      </Paper>
    </Container>
  )
}

export default Clients

