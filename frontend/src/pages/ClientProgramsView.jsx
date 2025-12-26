import { useState, useEffect } from 'react'
import { Container, Title, Text, Stack, Card, Badge, Button, Group, Loader, Paper, SimpleGrid } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

function ClientProgramsView({ clientId, clientName }) {
  const navigate = useNavigate()
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Determine if this is trainer view (has clientId prop) or client view
  const isTrainerView = !!clientId

  useEffect(() => {
    fetchPrograms()
  }, [clientId])

  const fetchPrograms = async () => {
    try {
      let response
      if (isTrainerView) {
        // Trainer viewing a specific client's programs
        // Use the endpoint that queries program_assignments table
        console.log(`[DEBUG] Fetching programs for client table id: ${clientId}`)
        response = await api.get(`/programs/client/${clientId}/assigned`)
        console.log(`[DEBUG] Received ${response.data?.length || 0} programs`)
      } else {
        // Client viewing their own programs
        response = await api.get('/programs/client/assigned')
      }
      setPrograms(response.data || [])
    } catch (error) {
      console.error('Error fetching programs:', error)
      console.error('Error details:', error.response?.data)
      setPrograms([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader size="lg" />
        </Group>
      </Container>
    )
  }

  return (
    <Container size="xl" py="xl">
      {!isTrainerView && <Title order={1} mb="xl">My Programs</Title>}
      {isTrainerView && clientName && (
        <Title order={1} mb="xl">{clientName}'s Programs</Title>
      )}

      {programs.length === 0 ? (
        <Paper p="xl" withBorder>
          <Stack gap="xs" align="center">
            <Text c="dimmed">No programs assigned yet</Text>
            {isTrainerView ? (
              <Text size="sm" c="dimmed">Assign programs to this client from the Programs section</Text>
            ) : (
              <Text size="sm" c="dimmed">Your trainer will assign programs to you</Text>
            )}
          </Stack>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {programs.map(program => (
            <Card key={program.id} shadow="sm" padding="lg" radius="md" withBorder>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Title order={4}>{program.name}</Title>
                  {program.split_type && (
                    <Badge variant="outline">{program.split_type}</Badge>
                  )}
                </Group>
                {program.description && (
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {program.description}
                  </Text>
                )}
                <Group gap="xs">
                  <Text size="xs" c="dimmed">
                    {program.duration_weeks} weeks
                  </Text>
                  {program.workout_count && (
                    <>
                      <Text size="xs" c="dimmed">•</Text>
                      <Text size="xs" c="dimmed">
                        {program.workout_count} workouts
                      </Text>
                    </>
                  )}
                </Group>
                <Button 
                  variant="light" 
                  fullWidth
                  onClick={() => navigate(`/programs?id=${program.id}`)}
                >
                  View Program →
                </Button>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Container>
  )
}

export default ClientProgramsView

