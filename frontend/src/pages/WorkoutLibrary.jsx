import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Container, Title, Text, Stack, Card, Badge, Button, Group, Modal, TextInput, Select, Textarea, SimpleGrid, Loader, Paper, Tabs, MultiSelect, Checkbox, Box, ScrollArea } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { useDisclosure } from '@mantine/hooks'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import api from '../services/api'
import WorkoutBuilder from './WorkoutBuilder'
import './WorkoutLibrary.css'

function WorkoutLibrary() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all') // all, templates, custom
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  const [opened, { open, close }] = useDisclosure(false)
  const [clients, setClients] = useState([])
  
  // Get active tab from URL params, default to 'manage'
  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'manage') // 'create', 'manage'
  
  // Check if we're coming from dropdown navigation (has tab param)
  // If tab param exists, hide tabs and show only that section
  const isDirectNavigation = !!tabFromUrl
  
  // Update active tab when URL param changes
  useEffect(() => {
    const tab = searchParams.get('tab') || 'manage'
    // Map old 'assign' and 'library' to 'manage'
    if (tab === 'assign' || tab === 'library') {
      setActiveTab('manage')
      setSearchParams({ tab: 'manage' })
    } else {
      setActiveTab(tab)
    }
  }, [searchParams])
  
  // Update URL when tab changes
  const handleTabChange = (value) => {
    setActiveTab(value)
    setSearchParams({ tab: value })
  }
  
  const assignForm = useForm({
    initialValues: {
      clientIds: [],
      workoutId: '',
      assignedDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: '',
      isRecurring: false,
      recurringFrequency: 'weekly'
    },
    validate: {
      clientIds: (value) => (value.length === 0 ? 'Select at least one client' : null),
      workoutId: (value) => (!value ? 'Select a workout' : null),
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
      
      const workoutId = values.workoutId || selectedWorkout?.id
      
      // Assign to multiple clients
      const assignments = await Promise.all(
        values.clientIds.map(async (clientId) => {
          return api.post(`/trainer/workouts/${workoutId}/assign`, {
            clientId,
            assignedDate,
            dueDate,
            notes: values.notes
          })
        })
      )
      
      notifications.show({
        title: 'Workouts Assigned',
        message: `Successfully assigned to ${values.clientIds.length} client(s)!`,
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
      clientIds: [],
      workoutId: workout.id.toString(),
      assignedDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: '',
      isRecurring: false,
      recurringFrequency: 'weekly'
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
    <Box style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Container size="xl" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
        <Title order={1} mb="xl" style={{ flexShrink: 0 }}>Workouts</Title>

        <Tabs value={activeTab} onChange={handleTabChange} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!isDirectNavigation && (
            <Tabs.List mb="xl" style={{ flexShrink: 0 }}>
              <Tabs.Tab value="create">Create Workout</Tabs.Tab>
              <Tabs.Tab value="manage">Manage Workouts</Tabs.Tab>
            </Tabs.List>
          )}

          {/* Create Workout Tab */}
          <Tabs.Panel value="create" style={{ flex: 1, overflow: 'auto' }}>
            <WorkoutBuilder />
          </Tabs.Panel>

          {/* Manage Workouts Tab - Combines Assign and Library */}
          <Tabs.Panel value="manage" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <ScrollArea style={{ flex: 1 }}>
              <Stack gap="md">
                {/* Assign Workouts Section */}
          <Stack gap="md">
            <Paper p="md" withBorder>
                  <Title order={3} mb="md">Assign Workouts to Clients</Title>
                  <form onSubmit={assignForm.onSubmit(handleAssignWorkout)}>
                    <Stack gap="md">
                      <Select
                        label="Select Workout *"
                        placeholder="Choose a workout to assign..."
                        data={workouts.map(workout => ({
                          value: workout.id.toString(),
                          label: workout.name
                        }))}
                        searchable
                        {...assignForm.getInputProps('workoutId')}
                        required
                      />
                      <MultiSelect
                        label="Select Clients *"
                        placeholder="Choose one or more clients..."
                        data={clients.map(client => {
                          const clientUserId = client.user_id || client.id
                          return {
                            value: clientUserId.toString(),
                            label: `${client.name || 'Client'} (${client.email})`
                          }
                        })}
                        searchable
                        {...assignForm.getInputProps('clientIds')}
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
                        placeholder="Add any special instructions or notes for the clients..."
                        rows={3}
                        {...assignForm.getInputProps('notes')}
                      />
                      <Group justify="flex-end">
                        <Button type="submit" color="robinhoodGreen">
                          Assign to Selected Clients
                        </Button>
                      </Group>
                    </Stack>
                  </form>
                </Paper>

                {/* Quick Assign from Library */}
                <Paper p="md" withBorder>
                  <Title order={4} mb="md">Quick Assign from Library</Title>
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
                    <Text c="dimmed" ta="center" py="md">No workouts found</Text>
                  ) : (
                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                      {filteredWorkouts.map(workout => (
                        <Card key={workout.id} shadow="sm" padding="md" radius="md" withBorder>
                          <Stack gap="sm">
                            <Group justify="space-between">
                              <Title order={5}>{workout.name}</Title>
                              {workout.is_template && (
                                <Badge variant="light" size="sm">Template</Badge>
                              )}
                            </Group>
                            {workout.description && (
                              <Text size="sm" c="dimmed" lineClamp={2}>{workout.description}</Text>
                            )}
                            <Button 
                              variant="filled" 
                              size="sm"
                              fullWidth
                              onClick={() => {
                                assignForm.setFieldValue('workoutId', workout.id.toString())
                                // Scroll to top of assign form
                                const assignSection = document.getElementById('assign-section')
                                if (assignSection) {
                                  assignSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                }
                              }}
                            >
                              Select to Assign
                            </Button>
                          </Stack>
                        </Card>
                      ))}
                    </SimpleGrid>
                  )}
                </Paper>

                {/* Workout Library Section */}
                <Paper p="md" withBorder>
                  <Title order={3} mb="md">Workout Library</Title>
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
                            <Button onClick={() => setActiveTab('create')}>
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
                </Paper>
              </Stack>
            </ScrollArea>
          </Tabs.Panel>
      </Tabs>

      {/* Legacy Modal for backward compatibility */}
      <Modal opened={opened} onClose={close} title={`Assign Workout: ${selectedWorkout?.name}`} size="md">
        {selectedWorkout && (
          <form onSubmit={assignForm.onSubmit(handleAssignWorkout)}>
            <Stack gap="md">
              <MultiSelect
                label="Select Clients *"
                placeholder="Choose one or more clients..."
                data={clients.map(client => {
                  const clientUserId = client.user_id || client.id
                  return {
                    value: clientUserId.toString(),
                    label: `${client.name || 'Client'} (${client.email})`
                  }
                })}
                searchable
                {...assignForm.getInputProps('clientIds')}
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
                placeholder="Add any special instructions or notes for the clients..."
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
    </Box>
  )
}

export default WorkoutLibrary

