import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Title, Text, Stack, Card, Badge, Button, Group, Modal, TextInput, Select, Textarea, SimpleGrid, Loader, Paper } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { useDisclosure } from '@mantine/hooks'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import api from '../services/api'
import './WorkoutLibrary.css'

function WorkoutLibrary() {
  const navigate = useNavigate()
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all') // all, templates, custom
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  const [opened, { open, close }] = useDisclosure(false)
  const [clients, setClients] = useState([])
  
  const assignForm = useForm({
    initialValues: {
      clientId: '',
      assignedDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: ''
    },
    validate: {
      clientId: (value) => (!value ? 'Client is required' : null),
      assignedDate: (value) => (!value ? 'Assigned date is required' : null),
    },
  })

  useEffect(() => {
    fetchWorkouts()
    fetchClients()
  }, [])

  const fetchWorkouts = async () => {
    try {
      const response = await api.get('/trainer/workouts')
      setWorkouts(response.data)
    } catch (error) {
      console.error('Error fetching workouts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const response = await api.get('/trainer/clients')
      setClients(response.data)
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const handleAssignWorkout = async (values) => {
    try {
      const assignedDate = values.assignedDate instanceof Date 
        ? values.assignedDate.toISOString().split('T')[0]
        : values.assignedDate
      const dueDate = values.dueDate instanceof Date
        ? values.dueDate.toISOString().split('T')[0]
        : values.dueDate
      
      await api.post(`/trainer/workouts/${selectedWorkout.id}/assign`, {
        clientId: values.clientId,
        assignedDate,
        dueDate,
        notes: values.notes
      })
      notifications.show({
        title: 'Workout Assigned',
        message: 'Workout has been successfully assigned!',
        color: 'green',
      })
      close()
      assignForm.reset()
      setSelectedWorkout(null)
    } catch (error) {
      console.error('Error assigning workout:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to assign workout',
        color: 'red',
      })
    }
  }

  const openAssignModal = (workout) => {
    setSelectedWorkout(workout)
    assignForm.setValues({
      clientId: '',
      assignedDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: ''
    })
    open()
  }

  const filteredWorkouts = workouts.filter(workout => {
    const matchesSearch = workout.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workout.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || 
                       (filterType === 'templates' && workout.is_template) ||
                       (filterType === 'custom' && !workout.is_template)
    return matchesSearch && matchesType
  })

  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader size="lg" />
      </Group>
    )
  }

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="lg">
        <Title order={1}>Workout Library</Title>
        <Button onClick={() => navigate('/workout/builder')}>
          + Create New Workout
        </Button>
      </Group>

      <Group mb="md">
        <TextInput
          placeholder="Search workouts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1 }}
        />
        <Select
          value={filterType}
          onChange={setFilterType}
          data={[
            { value: 'all', label: 'All Workouts' },
            { value: 'templates', label: 'Templates' },
            { value: 'custom', label: 'Custom' }
          ]}
        />
      </Group>

      {filteredWorkouts.length === 0 ? (
        <Paper p="xl" withBorder>
          <Stack gap="xs" align="center">
            <Text c="dimmed">No workouts found.</Text>
            {workouts.length === 0 ? (
              <>
                <Text size="sm" c="dimmed">Get started by creating your first workout!</Text>
                <Button onClick={() => navigate('/workout/builder')}>
                  Create Workout
                </Button>
              </>
            ) : (
              <Text size="sm" c="dimmed">Try adjusting your search or filter.</Text>
            )}
          </Stack>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {filteredWorkouts.map(workout => (
            <Card key={workout.id} shadow="sm" padding="lg" radius="md" withBorder>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Title order={4}>{workout.name}</Title>
                  {workout.is_template && (
                    <Badge variant="light">Template</Badge>
                  )}
                </Group>
                {workout.description && (
                  <Text size="sm" c="dimmed">{workout.description}</Text>
                )}
                <Group gap="xs">
                  <Text size="xs" c="dimmed">
                    Created: {new Date(workout.created_at).toLocaleDateString()}
                  </Text>
                  {workout.exercise_count > 0 && (
                    <Text size="xs" c="dimmed">
                      {workout.exercise_count} exercises
                    </Text>
                  )}
                </Group>
                <Group gap="xs">
                  <Button 
                    variant="light" 
                    size="sm"
                    onClick={() => navigate(`/workout/${workout.id}`)}
                  >
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/workout/builder?edit=${workout.id}`)}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="filled" 
                    size="sm"
                    onClick={() => openAssignModal(workout)}
                  >
                    Assign
                  </Button>
                </Group>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Modal opened={opened} onClose={close} title={`Assign Workout: ${selectedWorkout?.name}`} size="md">
        {selectedWorkout && (
          <form onSubmit={assignForm.onSubmit(handleAssignWorkout)}>
            <Stack gap="md">
              <Select
                label="Select Client *"
                placeholder="Choose a client..."
                data={clients.map(client => {
                  const clientUserId = client.user_id || client.id
                  return {
                    value: clientUserId.toString(),
                    label: `${client.name || 'Client'} (${client.email})`
                  }
                })}
                {...assignForm.getInputProps('clientId')}
                required
              />
              <DatePickerInput
                label="Assigned Date *"
                {...assignForm.getInputProps('assignedDate')}
                required
              />
              <DatePickerInput
                label="Due Date"
                {...assignForm.getInputProps('dueDate')}
              />
              <Textarea
                label="Notes (optional)"
                placeholder="Add any special instructions or notes for the client..."
                rows={3}
                {...assignForm.getInputProps('notes')}
              />
              <Group justify="flex-end">
                <Button variant="outline" onClick={close}>
                  Cancel
                </Button>
                <Button type="submit">
                  Assign Workout
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>
    </Container>
  )
}

export default WorkoutLibrary

