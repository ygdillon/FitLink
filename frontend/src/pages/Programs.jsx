import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Container, 
  Paper, 
  Title, 
  Text, 
  Stack, 
  Group, 
  Button, 
  Card, 
  Badge, 
  Modal, 
  TextInput, 
  Textarea, 
  Select, 
  NumberInput,
  SimpleGrid,
  Divider,
  ActionIcon,
  Loader,
  Alert,
  Tabs
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './Programs.css'

function Programs() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'manage'
  
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [programViewOpened, { open: openProgramView, close: closeProgramView }] = useDisclosure(false)
  const [clients, setClients] = useState([])

  useEffect(() => {
    if (user?.role === 'trainer') {
      fetchPrograms()
      fetchClients()
    } else if (user?.role === 'client') {
      fetchClientPrograms()
    }
  }, [user])

  const fetchPrograms = async () => {
    try {
      setLoading(true)
      const response = await api.get('/programs/trainer')
      setPrograms(response.data || [])
    } catch (error) {
      console.error('Error fetching programs:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load programs',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchClientPrograms = async () => {
    try {
      setLoading(true)
      const response = await api.get('/programs/client/assigned')
      setPrograms(response.data || [])
    } catch (error) {
      console.error('Error fetching client programs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const response = await api.get('/trainer/clients')
      setClients(response.data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const handleViewProgram = async (programId) => {
    try {
      const response = await api.get(`/programs/${programId}`)
      setSelectedProgram(response.data)
      openProgramView()
    } catch (error) {
      console.error('Error fetching program:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load program details',
        color: 'red',
      })
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

  if (user?.role === 'trainer') {
    return <TrainerProgramsView 
      programs={programs}
      clients={clients}
      onViewProgram={handleViewProgram}
      onRefresh={fetchPrograms}
      selectedProgram={selectedProgram}
      programViewOpened={programViewOpened}
      closeProgramView={closeProgramView}
    />
  } else {
    return <ClientProgramsView 
      programs={programs}
      onViewProgram={handleViewProgram}
      selectedProgram={selectedProgram}
      programViewOpened={programViewOpened}
      closeProgramView={closeProgramView}
    />
  }
}

// Trainer Programs View
function TrainerProgramsView({ programs, clients, onViewProgram, onRefresh, selectedProgram, programViewOpened, closeProgramView }) {
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false)
  const [assignOpened, { open: openAssign, close: closeAssign }] = useDisclosure(false)
  const [programToAssign, setProgramToAssign] = useState(null)

  const form = useForm({
    initialValues: {
      name: '',
      description: '',
      split_type: '',
      duration_weeks: 4,
      is_template: false
    }
  })

  const handleCreateProgram = async (values) => {
    try {
      await api.post('/programs', values)
      notifications.show({
        title: 'Success',
        message: 'Program created successfully',
        color: 'green',
      })
      closeCreate()
      form.reset()
      onRefresh()
    } catch (error) {
      console.error('Error creating program:', error)
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create program',
        color: 'red',
      })
    }
  }

  const handleAssignProgram = async (values) => {
    try {
      await api.post(`/programs/${programToAssign.id}/assign`, {
        client_id: values.client_id,
        start_date: values.start_date
      })
      notifications.show({
        title: 'Success',
        message: 'Program assigned successfully',
        color: 'green',
      })
      closeAssign()
      onRefresh()
    } catch (error) {
      console.error('Error assigning program:', error)
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to assign program',
        color: 'red',
      })
    }
  }

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Programs</Title>
        <Button onClick={openCreate} color="robinhoodGreen">
          Create New Program
        </Button>
      </Group>

      {programs.length === 0 ? (
        <Paper p="xl" withBorder>
          <Stack align="center" gap="md">
            <Text c="dimmed">No programs yet. Create your first program to get started!</Text>
            <Button onClick={openCreate} color="robinhoodGreen">
              Create Program
            </Button>
          </Stack>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {programs.map((program) => (
            <Card key={program.id} shadow="sm" padding="lg" radius="md" withBorder>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Title order={4}>{program.name}</Title>
                  {program.is_template && (
                    <Badge color="blue" variant="light">Template</Badge>
                  )}
                </Group>
                {program.description && (
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {program.description}
                  </Text>
                )}
                <Group gap="xs">
                  {program.split_type && (
                    <Badge size="sm" variant="outline">{program.split_type}</Badge>
                  )}
                  <Text size="xs" c="dimmed">
                    {program.workout_count || 0} workouts
                  </Text>
                </Group>
                <Group justify="space-between" mt="auto">
                  <Button 
                    variant="light" 
                    size="sm"
                    onClick={() => onViewProgram(program.id)}
                  >
                    View
                  </Button>
                  {program.is_template && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setProgramToAssign(program)
                        openAssign()
                      }}
                    >
                      Assign
                    </Button>
                  )}
                </Group>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* Create Program Modal */}
      <Modal opened={createOpened} onClose={closeCreate} title="Create New Program" size="lg">
        <form onSubmit={form.onSubmit(handleCreateProgram)}>
          <Stack gap="md">
            <TextInput
              label="Program Name"
              placeholder="e.g., Push/Pull/Legs Split"
              required
              {...form.getInputProps('name')}
            />
            <Textarea
              label="Description"
              placeholder="Describe the program..."
              {...form.getInputProps('description')}
            />
            <Select
              label="Split Type"
              placeholder="Select split type"
              data={[
                { value: 'PPL', label: 'Push/Pull/Legs (PPL)' },
                { value: 'Upper/Lower', label: 'Upper/Lower' },
                { value: 'Full Body', label: 'Full Body' },
                { value: 'Custom', label: 'Custom' }
              ]}
              {...form.getInputProps('split_type')}
            />
            <NumberInput
              label="Duration (weeks)"
              min={1}
              max={52}
              {...form.getInputProps('duration_weeks')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="outline" onClick={closeCreate}>Cancel</Button>
              <Button type="submit" color="robinhoodGreen">Create Program</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Assign Program Modal */}
      <Modal opened={assignOpened} onClose={closeAssign} title="Assign Program to Client" size="md">
        <form onSubmit={assignForm.onSubmit(handleAssignProgram)}>
          <Stack gap="md">
            <Select
              label="Select Client"
              placeholder="Choose a client"
              data={clients.map(c => ({ value: c.user_id.toString(), label: c.name }))}
              required
              searchable
              {...assignForm.getInputProps('client_id')}
            />
            <TextInput
              label="Start Date"
              type="date"
              required
              {...assignForm.getInputProps('start_date')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="outline" onClick={closeAssign}>Cancel</Button>
              <Button type="submit" color="robinhoodGreen">Assign Program</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Program View Modal */}
      {selectedProgram && (
        <ProgramCalendarView
          program={selectedProgram}
          opened={programViewOpened}
          onClose={closeProgramView}
          isTrainer={true}
          onProgramUpdate={(updatedProgram) => {
            setSelectedProgram(updatedProgram)
            onRefresh()
          }}
        />
      )}
    </Container>
  )
}

// Client Programs View
function ClientProgramsView({ programs, onViewProgram, selectedProgram, programViewOpened, closeProgramView }) {
  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">My Programs</Title>

      {programs.length === 0 ? (
        <Paper p="xl" withBorder>
          <Stack align="center" gap="md">
            <Text c="dimmed">No programs assigned yet.</Text>
            <Text size="sm" c="dimmed">Your trainer will assign programs to you.</Text>
          </Stack>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {programs.map((program) => (
            <Card key={program.id} shadow="sm" padding="lg" radius="md" withBorder>
              <Stack gap="sm">
                <Title order={4}>{program.name}</Title>
                {program.description && (
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {program.description}
                  </Text>
                )}
                <Group gap="xs">
                  {program.split_type && (
                    <Badge size="sm" variant="outline">{program.split_type}</Badge>
                  )}
                </Group>
                <Button 
                  variant="light" 
                  size="sm"
                  onClick={() => onViewProgram(program.id)}
                  mt="auto"
                >
                  View Program
                </Button>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* Program View Modal */}
      {selectedProgram && (
        <ProgramCalendarView
          program={selectedProgram}
          opened={programViewOpened}
          onClose={closeProgramView}
          isTrainer={false}
        />
      )}
    </Container>
  )
}

// Program Calendar View Component (similar to the design shown)
function ProgramCalendarView({ program, opened, onClose, isTrainer, onProgramUpdate }) {
  const [selectedDay, setSelectedDay] = useState(null)
  const [workoutModalOpened, { open: openWorkoutModal, close: closeWorkoutModal }] = useDisclosure(false)
  const [currentWeek, setCurrentWeek] = useState(1)
  const [editingWorkout, setEditingWorkout] = useState(null)
  const [currentProgram, setCurrentProgram] = useState(program)

  // Update current program when program prop changes
  useEffect(() => {
    setCurrentProgram(program)
  }, [program])

  // Calculate total days in program
  const totalDays = currentProgram.duration_weeks * 7
  const daysPerWeek = 7

  // Get workouts for current week
  const weekWorkouts = currentProgram.workouts?.filter(w => w.week_number === currentWeek) || []

  // Group workouts by day
  const workoutsByDay = {}
  weekWorkouts.forEach(workout => {
    if (!workoutsByDay[workout.day_number]) {
      workoutsByDay[workout.day_number] = []
    }
    workoutsByDay[workout.day_number].push(workout)
  })

  const handleDayClick = (dayNumber) => {
    setSelectedDay(dayNumber)
    const existingWorkout = workoutsByDay[dayNumber]?.[0]
    if (existingWorkout) {
      setEditingWorkout(existingWorkout)
    } else {
      setEditingWorkout(null)
    }
    openWorkoutModal()
  }

  const handleSaveWorkout = async (values) => {
    try {
      // Build workouts array with the new/updated workout
      const existingWorkouts = currentProgram.workouts || []
      const dayNumber = selectedDay
      const weekNumber = currentWeek

      // Remove existing workout for this day/week if editing
      const filteredWorkouts = editingWorkout 
        ? existingWorkouts.filter(w => !(w.day_number === dayNumber && w.week_number === weekNumber && w.id === editingWorkout.id))
        : existingWorkouts

      // Add new workout
      const newWorkout = {
        workout_name: values.workout_name,
        day_number: dayNumber,
        week_number: weekNumber,
        exercises: values.exercises.map((ex, idx) => ({
          ...ex,
          order_index: idx
        }))
      }

      const updatedWorkouts = [...filteredWorkouts, newWorkout]

      // Update program via API
      await api.put(`/programs/${currentProgram.id}`, {
        name: currentProgram.name,
        description: currentProgram.description,
        split_type: currentProgram.split_type,
        duration_weeks: currentProgram.duration_weeks,
        workouts: updatedWorkouts
      })

      // Refresh program data
      const response = await api.get(`/programs/${currentProgram.id}`)
      setCurrentProgram(response.data)
      
      if (onProgramUpdate) {
        onProgramUpdate(response.data)
      }

      closeWorkoutModal()
      notifications.show({
        title: 'Success',
        message: 'Workout saved successfully',
        color: 'green',
      })
    } catch (error) {
      console.error('Error saving workout:', error)
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to save workout',
        color: 'red',
      })
    }
  }

  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      title={program.name}
      size="xl"
      fullScreen
    >
      <Stack gap="md">
        {/* Week Selector */}
        <Group justify="space-between">
          <Group>
            <Button 
              variant="subtle" 
              onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
              disabled={currentWeek === 1}
            >
              ← Previous Week
            </Button>
            <Text fw={500}>Week {currentWeek}</Text>
            <Button 
              variant="subtle"
              onClick={() => setCurrentWeek(Math.min(program.duration_weeks, currentWeek + 1))}
              disabled={currentWeek >= program.duration_weeks}
            >
              Next Week →
            </Button>
          </Group>
          {program.split_type && (
            <Badge size="lg" variant="light">{program.split_type}</Badge>
          )}
        </Group>

        <Divider />

        {/* Calendar Grid */}
        <SimpleGrid cols={7} spacing="xs">
          {Array.from({ length: daysPerWeek }, (_, i) => {
            const dayNumber = (currentWeek - 1) * 7 + i + 1
            const dayWorkouts = workoutsByDay[i + 1] || []
            
            return (
              <Paper
                key={dayNumber}
                p="sm"
                withBorder
                style={{
                  minHeight: '150px',
                  cursor: isTrainer ? 'pointer' : 'default',
                  position: 'relative'
                }}
                onClick={() => isTrainer && handleDayClick(i + 1)}
              >
                <Stack gap="xs">
                  <Text fw={600} size="sm">DAY {dayNumber}</Text>
                  {dayWorkouts.map((workout, idx) => (
                    <Card
                      key={workout.id || idx}
                      p="xs"
                      style={{
                        backgroundColor: 'var(--mantine-color-blue-0)',
                        border: '1px solid var(--mantine-color-blue-3)'
                      }}
                    >
                      <Text size="xs" fw={600} lineClamp={1}>
                        {workout.workout_name}
                      </Text>
                      {workout.exercises && workout.exercises.length > 0 && (
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {workout.exercises.length} exercises
                        </Text>
                      )}
                    </Card>
                  ))}
                  {dayWorkouts.length === 0 && isTrainer && (
                    <Text size="xs" c="dimmed" ta="center" mt="md">
                      Click to add workout
                    </Text>
                  )}
                </Stack>
              </Paper>
            )
          })}
        </SimpleGrid>
      </Stack>

      {/* Workout Editor Modal */}
      {isTrainer && (
        <WorkoutEditorModal
          opened={workoutModalOpened}
          onClose={closeWorkoutModal}
          dayNumber={selectedDay}
          weekNumber={currentWeek}
          workout={editingWorkout}
          onSave={handleSaveWorkout}
        />
      )}
    </Modal>
  )
}

// Workout Editor Modal Component
function WorkoutEditorModal({ opened, onClose, dayNumber, weekNumber, workout, onSave }) {
  const form = useForm({
    initialValues: {
      workout_name: workout?.workout_name || '',
      exercises: workout?.exercises || []
    }
  })

  const addExercise = () => {
    form.insertListItem('exercises', {
      exercise_name: '',
      exercise_type: 'REGULAR',
      sets: null,
      reps: '',
      weight: '',
      duration: '',
      rest: '',
      tempo: ''
    })
  }

  return (
    <Modal opened={opened} onClose={onClose} title={`Day ${dayNumber} - Week ${weekNumber}`} size="lg">
      <form onSubmit={form.onSubmit(onSave)}>
        <Stack gap="md">
          <TextInput
            label="Workout Name"
            placeholder="e.g., HIIT - TABATA"
            required
            {...form.getInputProps('workout_name')}
          />
          
          <Divider label="Exercises" />
          
          {form.values.exercises.map((exercise, index) => (
            <Card key={index} p="md" withBorder>
              <Stack gap="sm">
                <Group grow>
                  <TextInput
                    label="Exercise Name"
                    placeholder="exercise"
                    required
                    {...form.getInputProps(`exercises.${index}.exercise_name`)}
                  />
                  <Select
                    label="Type"
                    data={[
                      { value: 'AMRAP', label: 'AMRAP' },
                      { value: 'INTERVAL', label: 'INTERVAL' },
                      { value: 'REGULAR', label: 'REGULAR' },
                      { value: 'TABATA', label: 'TABATA' },
                      { value: 'ENOM', label: 'ENOM' }
                    ]}
                    {...form.getInputProps(`exercises.${index}.exercise_type`)}
                  />
                </Group>
                <Group grow>
                  <NumberInput
                    label="Sets"
                    min={0}
                    {...form.getInputProps(`exercises.${index}.sets`)}
                  />
                  <TextInput
                    label="Reps"
                    placeholder="5 or 5-8"
                    {...form.getInputProps(`exercises.${index}.reps`)}
                  />
                  <TextInput
                    label="Weight"
                    placeholder="100 lb"
                    {...form.getInputProps(`exercises.${index}.weight`)}
                  />
                </Group>
                <Group grow>
                  <TextInput
                    label="Duration"
                    placeholder="10:00"
                    {...form.getInputProps(`exercises.${index}.duration`)}
                  />
                  <TextInput
                    label="Rest"
                    {...form.getInputProps(`exercises.${index}.rest`)}
                  />
                  <TextInput
                    label="Tempo"
                    {...form.getInputProps(`exercises.${index}.tempo`)}
                  />
                </Group>
              </Stack>
            </Card>
          ))}

          <Button variant="light" onClick={addExercise}>
            + Add Exercise
          </Button>

          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" color="robinhoodGreen">Save Workout</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

export default Programs

