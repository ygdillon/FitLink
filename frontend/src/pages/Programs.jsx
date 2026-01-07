import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
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
  Tabs,
  ScrollArea,
  Switch,
  Checkbox,
  MultiSelect
} from '@mantine/core'
import { TimeInput, DatePickerInput, DateInput } from '@mantine/dates'
import { useDisclosure } from '@mantine/hooks'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { IconEdit, IconTrash, IconCopy } from '@tabler/icons-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './Programs.css'

function Programs() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'workouts'
  
  const [programs, setPrograms] = useState([])
  const [nutritionPlans, setNutritionPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [programViewOpened, { open: openProgramView, close: closeProgramView }] = useDisclosure(false)
  const [clients, setClients] = useState([])

  useEffect(() => {
    if (user?.role === 'trainer') {
      fetchPrograms()
      fetchClients()
      fetchNutritionPlans()
    } else if (user?.role === 'client') {
      fetchClientPrograms()
      fetchClientNutritionPlans()
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

  const fetchNutritionPlans = async () => {
    try {
      // This will fetch all nutrition plans for trainer's clients
      // For now, we'll fetch them per client when needed
      setNutritionPlans([])
    } catch (error) {
      console.error('Error fetching nutrition plans:', error)
    }
  }

  const fetchClientNutritionPlans = async () => {
    try {
      const response = await api.get('/nutrition/plans/active').catch(() => ({ data: null }))
      if (response.data) {
        setNutritionPlans([response.data])
      } else {
        setNutritionPlans([])
      }
    } catch (error) {
      console.error('Error fetching client nutrition plans:', error)
      setNutritionPlans([])
    }
  }

  const handleViewProgram = async (programId) => {
    try {
      const response = await api.get(`/programs/${programId}`)
      const program = response.data
      
      // If client view, get start_date from assignment
      if (user?.role === 'client') {
        const assignedProgramsRes = await api.get('/programs/client/assigned').catch(() => ({ data: [] }))
        const assignedProgram = assignedProgramsRes.data?.find(p => p.id === programId)
        if (assignedProgram?.start_date) {
          program.start_date = assignedProgram.start_date
        }
      }
      
      setSelectedProgram(program)
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
    return (
      <Container size="xl" py="xl">
        <Title order={1} mb="xl">Programs</Title>
        <Tabs value={activeTab} onChange={(value) => navigate(`/programs?tab=${value}`)}>
          <Tabs.List>
            <Tabs.Tab value="workouts">Workout Programs</Tabs.Tab>
            <Tabs.Tab value="nutrition">Nutrition Programs</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="workouts" pt="xl">
            <TrainerProgramsView 
              programs={programs}
              clients={clients}
              onViewProgram={handleViewProgram}
              onRefresh={fetchPrograms}
              selectedProgram={selectedProgram}
              setSelectedProgram={setSelectedProgram}
              programViewOpened={programViewOpened}
              closeProgramView={closeProgramView}
            />
          </Tabs.Panel>

          <Tabs.Panel value="nutrition" pt="xl">
            <TrainerNutritionView
              clients={clients}
              onRefresh={fetchNutritionPlans}
            />
          </Tabs.Panel>
        </Tabs>
      </Container>
    )
  } else {
    return (
      <Container size="xl" py="xl">
        <Title order={1} mb="xl">Programs</Title>
        <Tabs value={activeTab} onChange={(value) => navigate(`/programs?tab=${value}`)}>
          <Tabs.List>
            <Tabs.Tab value="workouts">Workout Programs</Tabs.Tab>
            <Tabs.Tab value="nutrition">Nutrition Programs</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="workouts" pt="xl">
            <ClientProgramsView 
              programs={programs}
              onViewProgram={handleViewProgram}
              selectedProgram={selectedProgram}
              programViewOpened={programViewOpened}
              closeProgramView={closeProgramView}
            />
          </Tabs.Panel>

          <Tabs.Panel value="nutrition" pt="xl">
            <ClientNutritionView />
          </Tabs.Panel>
        </Tabs>
      </Container>
    )
  }
}

// Trainer Programs View
function TrainerProgramsView({ programs, clients, onViewProgram, onRefresh, selectedProgram, setSelectedProgram, programViewOpened, closeProgramView }) {
  const navigate = useNavigate()
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false)
  const [assignOpened, { open: openAssign, close: closeAssign }] = useDisclosure(false)
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false)
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false)
  const [programToAssign, setProgramToAssign] = useState(null)
  const [programToEdit, setProgramToEdit] = useState(null)
  const [programToDelete, setProgramToDelete] = useState(null)

  // Remove the Container and Title from here since they're now in the parent

  const form = useForm({
    initialValues: {
      name: '',
      description: '',
      split_type: '',
      duration_weeks: 4,
      start_date: null,
      end_date: null,
      is_template: false
    }
  })

  // Auto-calculate end_date when start_date or duration_weeks changes
  useEffect(() => {
    if (form.values.start_date && form.values.duration_weeks && !form.values.end_date) {
      const start = new Date(form.values.start_date)
      const end = new Date(start)
      end.setDate(start.getDate() + (form.values.duration_weeks * 7) - 1) // -1 because start date is day 1
      form.setFieldValue('end_date', end)
    }
  }, [form.values.start_date, form.values.duration_weeks])

  const assignForm = useForm({
    initialValues: {
      client_id: '',
      start_date: ''
    }
  })

  const editForm = useForm({
    initialValues: {
      name: '',
      description: '',
      split_type: '',
      duration_weeks: 4,
      start_date: null,
      end_date: null
    }
  })

  // Auto-calculate end_date for edit form
  useEffect(() => {
    if (editForm.values.start_date && editForm.values.duration_weeks) {
      const start = new Date(editForm.values.start_date)
      const end = new Date(start)
      end.setDate(start.getDate() + (editForm.values.duration_weeks * 7) - 1)
      editForm.setFieldValue('end_date', end)
    } else if (!editForm.values.start_date) {
      editForm.setFieldValue('end_date', null)
    }
  }, [editForm.values.start_date, editForm.values.duration_weeks])

  const handleCreateProgram = async (values) => {
    try {
      // Calculate end_date if not provided
      let endDate = values.end_date
      if (!endDate && values.start_date && values.duration_weeks) {
        const start = new Date(values.start_date)
        const end = new Date(start)
        end.setDate(start.getDate() + (values.duration_weeks * 7) - 1) // -1 because start date is day 1
        endDate = end.toISOString().split('T')[0]
      }

      const programData = {
        ...values,
        start_date: values.start_date ? new Date(values.start_date).toISOString().split('T')[0] : null,
        end_date: endDate || null
      }

      await api.post('/programs', programData)
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
      const response = await api.post(`/programs/${programToAssign.id}/assign`, {
        client_id: values.client_id,
        start_date: values.start_date
      })
      console.log('[DEBUG] Assignment response:', response.data)
      notifications.show({
        title: 'Success',
        message: 'Program assigned successfully',
        color: 'green',
      })
      closeAssign()
      assignForm.reset()
      onRefresh()
      // Dispatch event to refresh client profiles if they're open
      window.dispatchEvent(new CustomEvent('programAssigned', { 
        detail: { client_id: values.client_id, program_id: programToAssign.id }
      }))
    } catch (error) {
      console.error('Error assigning program:', error)
      console.error('Error response:', error.response?.data)
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to assign program',
        color: 'red',
      })
    }
  }

  const handleEditProgram = (program) => {
    setProgramToEdit(program)
    editForm.setValues({
      name: program.name || '',
      description: program.description || '',
      split_type: program.split_type || '',
      duration_weeks: program.duration_weeks || 4,
      start_date: program.start_date ? new Date(program.start_date) : null,
      end_date: program.end_date ? new Date(program.end_date) : null
    })
    openEdit()
  }

  const handleUpdateProgram = async (values) => {
    try {
      // Calculate end_date if not provided
      let endDate = values.end_date
      if (!endDate && values.start_date && values.duration_weeks) {
        const start = new Date(values.start_date)
        const end = new Date(start)
        end.setDate(start.getDate() + (values.duration_weeks * 7) - 1)
        endDate = end.toISOString().split('T')[0]
      }

      const programData = {
        name: values.name,
        description: values.description,
        split_type: values.split_type,
        duration_weeks: values.duration_weeks,
        start_date: values.start_date ? new Date(values.start_date).toISOString().split('T')[0] : null,
        end_date: endDate ? (endDate instanceof Date ? endDate.toISOString().split('T')[0] : endDate) : null
      }

      console.log('[DEBUG] Updating program with data:', programData)
      const response = await api.put(`/programs/${programToEdit.id}`, programData)
      console.log('[DEBUG] Update response:', response.data)
      notifications.show({
        title: 'Success',
        message: 'Program updated successfully',
        color: 'green',
      })
      closeEdit()
      editForm.reset()
      onRefresh()
      // Refresh the program view if it's open
      if (selectedProgram?.id === programToEdit.id) {
        const response = await api.get(`/programs/${programToEdit.id}`)
        setSelectedProgram(response.data)
      }
    } catch (error) {
      console.error('Error updating program:', error)
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update program',
        color: 'red',
      })
    }
  }

  const handleDeleteProgram = (program) => {
    setProgramToDelete(program)
    openDelete()
  }

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/programs/${programToDelete.id}`)
      notifications.show({
        title: 'Success',
        message: 'Program deleted successfully. All client assignments have been removed.',
        color: 'green',
      })
      closeDelete()
      setProgramToDelete(null)
      onRefresh()
      // Close program view if it was open
      if (selectedProgram?.id === programToDelete.id) {
        closeProgramView()
        setSelectedProgram(null)
      }
    } catch (error) {
      console.error('Error deleting program:', error)
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to delete program',
        color: 'red',
      })
    }
  }

  return (
    <>
      <Group justify="space-between" mb="xl">
        <Title order={2}>Workout Programs</Title>
        <Group>
          <Button 
            onClick={() => navigate('/programs/builder')} 
            variant="light"
            color="robinhoodGreen"
          >
            Build from Template
          </Button>
          <Button onClick={openCreate} color="robinhoodGreen">
            Create New Program
          </Button>
        </Group>
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
            <Card key={program.id} shadow="sm" padding="md" radius="sm" withBorder style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Stack gap="xs" style={{ flex: 1 }}>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Title order={4} lineClamp={2} style={{ flex: 1, margin: 0 }}>
                    {program.name}
                  </Title>
                  {program.is_template ? (
                    <Badge color="blue" variant="light" size="sm" style={{ flexShrink: 0 }}>
                      Template
                    </Badge>
                  ) : (
                    <Badge color="gray" variant="outline" size="sm" style={{ flexShrink: 0 }}>
                      CUSTOM
                    </Badge>
                  )}
                </Group>
                <div style={{ minHeight: '2.5rem', display: 'flex', alignItems: 'flex-start' }}>
                  {program.description ? (
                    <Text size="sm" c="dimmed" lineClamp={2} style={{ width: '100%' }}>
                      {program.description}
                    </Text>
                  ) : null}
                </div>
                <Group gap="xs" mt="xs" align="center" style={{ minHeight: '1.5rem' }}>
                  {program.split_type && (
                    <Badge size="sm" variant="outline" color="gray" style={{ flexShrink: 0 }}>
                      {program.split_type}
                    </Badge>
                  )}
                  <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                    {program.workout_count || 0} workouts
                  </Text>
                </Group>
                <Group justify="space-between" mt="auto" pt="sm" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
                  <Button 
                    variant="light" 
                    size="sm"
                    color="robinhoodGreen"
                    onClick={() => onViewProgram(program.id)}
                    style={{ flex: 1 }}
                  >
                    View
                  </Button>
                  <Group gap={4} ml="xs">
                    <ActionIcon
                      variant="light"
                      color="blue"
                      size="md"
                      onClick={() => handleEditProgram(program)}
                    >
                      <IconEdit size={18} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="red"
                      size="md"
                      onClick={() => handleDeleteProgram(program)}
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Group>
                  <Button
                    variant="outline"
                    size="sm"
                    color="robinhoodGreen"
                    onClick={() => {
                      setProgramToAssign(program)
                      openAssign()
                    }}
                    ml="xs"
                  >
                    Assign
                  </Button>
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
            <DateInput
              label="Start Date"
              placeholder="Select program start date"
              required
              {...form.getInputProps('start_date')}
            />
            <DateInput
              label="End Date"
              placeholder="Auto-calculated from start date + duration"
              minDate={form.values.start_date ? new Date(form.values.start_date) : undefined}
              description="Automatically calculated from start date and duration"
              readOnly
              {...form.getInputProps('end_date')}
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

      {/* Edit Program Modal */}
      <Modal opened={editOpened} onClose={closeEdit} title="Edit Program" size="lg">
        <form onSubmit={editForm.onSubmit(handleUpdateProgram)}>
          <Stack gap="md">
            <TextInput
              label="Program Name"
              placeholder="e.g., Push/Pull/Legs Split"
              required
              {...editForm.getInputProps('name')}
            />
            <Textarea
              label="Description"
              placeholder="Describe the program..."
              {...editForm.getInputProps('description')}
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
              {...editForm.getInputProps('split_type')}
            />
            <NumberInput
              label="Duration (weeks)"
              min={1}
              max={52}
              {...editForm.getInputProps('duration_weeks')}
            />
            <DateInput
              label="Start Date"
              placeholder="Select program start date"
              required
              {...editForm.getInputProps('start_date')}
            />
            <DateInput
              label="End Date"
              placeholder="Auto-calculated from start date + duration"
              minDate={editForm.values.start_date ? new Date(editForm.values.start_date) : undefined}
              description="Automatically calculated from start date and duration"
              readOnly
              {...editForm.getInputProps('end_date')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="outline" onClick={closeEdit}>Cancel</Button>
              <Button type="submit" color="robinhoodGreen">Update Program</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete Program Confirmation Modal */}
      <Modal opened={deleteOpened} onClose={closeDelete} title="Delete Program">
        <Stack gap="md">
          <Text>
            Are you sure you want to delete the program "{programToDelete?.name}"?
          </Text>
          <Text size="sm" c="dimmed">
            This will permanently delete the program and remove it from all clients who have it assigned. 
            All associated workouts and sessions will also be removed. This action cannot be undone.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={closeDelete}>
              Cancel
            </Button>
            <Button color="red" onClick={handleConfirmDelete}>
              Delete Program
            </Button>
          </Group>
        </Stack>
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
    </>
  )
}

// Trainer Nutrition View
function TrainerNutritionView({ clients, onRefresh }) {
  const navigate = useNavigate()
  const [nutritionPlans, setNutritionPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [planViewOpened, { open: openPlanView, close: closePlanView }] = useDisclosure(false)
  const [planEditOpened, { open: openPlanEdit, close: closePlanEdit }] = useDisclosure(false)
  const [deleteConfirmOpened, { open: openDeleteConfirm, close: closeDeleteConfirm }] = useDisclosure(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [planToDelete, setPlanToDelete] = useState(null)

  const editForm = useForm({
    initialValues: {
      plan_name: '',
      daily_calories: '',
      daily_protein: '',
      daily_carbs: '',
      daily_fats: '',
      nutrition_approach: '',
      meal_frequency: '',
      notes: '',
      is_active: true
    }
  })

  useEffect(() => {
    fetchAllPlans()
  }, [])

  const fetchAllPlans = async () => {
    try {
      setLoading(true)
      const response = await api.get('/nutrition/plans/trainer')
      setNutritionPlans(response.data || [])
    } catch (error) {
      console.error('Error fetching nutrition plans:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load nutrition plans',
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewPlan = async (planId) => {
    try {
      const response = await api.get(`/nutrition/plans/${planId}`)
      setSelectedPlan(response.data)
      openPlanView()
    } catch (error) {
      console.error('Error fetching plan:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load plan details',
        color: 'red'
      })
    }
  }

  const handleEditPlan = async (planId) => {
    try {
      const response = await api.get(`/nutrition/plans/${planId}`)
      const plan = response.data
      setSelectedPlan(plan)
      editForm.setValues({
        plan_name: plan.plan_name || '',
        daily_calories: plan.daily_calories || '',
        daily_protein: plan.daily_protein || '',
        daily_carbs: plan.daily_carbs || '',
        daily_fats: plan.daily_fats || '',
        nutrition_approach: plan.nutrition_approach || '',
        meal_frequency: plan.meal_frequency || '',
        notes: plan.notes || '',
        is_active: plan.is_active !== false
      })
      openPlanEdit()
    } catch (error) {
      console.error('Error fetching plan for edit:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load plan for editing',
        color: 'red'
      })
    }
  }

  const handleSaveEdit = async () => {
    try {
      const values = editForm.values
      await api.put(`/nutrition/plans/${selectedPlan.id}`, values)
      notifications.show({
        title: 'Success',
        message: 'Nutrition plan updated successfully',
        color: 'green'
      })
      closePlanEdit()
      fetchAllPlans()
      if (onRefresh) onRefresh()
    } catch (error) {
      console.error('Error updating plan:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to update nutrition plan',
        color: 'red'
      })
    }
  }

  const handleDeleteClick = (plan) => {
    setPlanToDelete(plan)
    openDeleteConfirm()
  }

  const handleConfirmDelete = async () => {
    if (!planToDelete) return
    
    try {
      await api.delete(`/nutrition/plans/${planToDelete.id}`)
      notifications.show({
        title: 'Success',
        message: 'Nutrition plan deleted successfully',
        color: 'green'
      })
      closeDeleteConfirm()
      setPlanToDelete(null)
      fetchAllPlans()
      if (onRefresh) onRefresh()
    } catch (error) {
      console.error('Error deleting plan:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to delete nutrition plan',
        color: 'red'
      })
    }
  }

  return (
    <>
      <Group justify="space-between" mb="xl">
        <Title order={2}>Nutrition Programs</Title>
        <Button 
          onClick={() => navigate('/nutrition/builder')} 
          color="robinhoodGreen"
        >
          Create Nutrition Plan
        </Button>
      </Group>

      {loading ? (
        <Group justify="center" py="xl">
          <Loader size="lg" />
        </Group>
      ) : nutritionPlans.length === 0 ? (
        <Paper p="xl" withBorder>
          <Stack align="center" gap="md">
            <Text c="dimmed">No nutrition plans created yet.</Text>
            <Button 
              onClick={() => navigate('/nutrition/builder')}
              color="robinhoodGreen"
            >
              Create Nutrition Plan
            </Button>
          </Stack>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {nutritionPlans.map((plan) => (
            <Card key={plan.id} shadow="sm" padding="lg" radius="sm" withBorder>
              <Stack gap="sm">
                <Group justify="space-between">
                  <div style={{ flex: 1 }}>
                    <Title order={4}>{plan.plan_name}</Title>
                    <Text size="xs" c="dimmed" mt={4}>
                      Client: {plan.client_name || 'Unknown'}
                    </Text>
                  </div>
                  {plan.is_active && (
                    <Badge color="green" variant="light">Active</Badge>
                  )}
                </Group>
                <Group gap="xs">
                  <Badge size="sm" variant="outline">
                    {plan.nutrition_approach?.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {plan.meal_frequency} meals/day
                  </Text>
                </Group>
                <Divider />
                <SimpleGrid cols={2} spacing="xs">
                  <div>
                    <Text size="xs" c="dimmed">Calories</Text>
                    <Text size="sm" fw={600}>{plan.daily_calories} cal</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">Protein</Text>
                    <Text size="sm" fw={600}>{plan.daily_protein}g</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">Carbs</Text>
                    <Text size="sm" fw={600}>{plan.daily_carbs}g</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">Fats</Text>
                    <Text size="sm" fw={600}>{plan.daily_fats}g</Text>
                  </div>
                </SimpleGrid>
                <Group gap="xs" mt="auto">
                  <Button 
                    variant="light" 
                    size="sm"
                    onClick={() => handleViewPlan(plan.id)}
                    style={{ flex: 1 }}
                  >
                    View
                  </Button>
                  <ActionIcon
                    variant="light"
                    color="blue"
                    onClick={() => handleEditPlan(plan.id)}
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() => handleDeleteClick(plan)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* Nutrition Plan View Modal */}
      {selectedPlan && (
        <Modal
          opened={planViewOpened}
          onClose={closePlanView}
          title={selectedPlan.plan_name}
          size="lg"
        >
          <Stack gap="md">
            <SimpleGrid cols={4} spacing="md">
              <Card withBorder p="sm">
                <Text size="xs" c="dimmed">Calories</Text>
                <Text size="lg" fw={700}>{selectedPlan.daily_calories} cal</Text>
              </Card>
              <Card withBorder p="sm">
                <Text size="xs" c="dimmed">Protein</Text>
                <Text size="lg" fw={700}>{selectedPlan.daily_protein}g</Text>
              </Card>
              <Card withBorder p="sm">
                <Text size="xs" c="dimmed">Carbs</Text>
                <Text size="lg" fw={700}>{selectedPlan.daily_carbs}g</Text>
              </Card>
              <Card withBorder p="sm">
                <Text size="xs" c="dimmed">Fats</Text>
                <Text size="lg" fw={700}>{selectedPlan.daily_fats}g</Text>
              </Card>
            </SimpleGrid>

            <Divider />

            <div>
              <Text fw={500} mb="sm">Plan Details</Text>
              <Group gap="md">
                <Badge>Approach: {selectedPlan.nutrition_approach?.replace('_', ' ')}</Badge>
                <Badge>Meals: {selectedPlan.meal_frequency}/day</Badge>
                <Badge>Type: {selectedPlan.plan_type?.replace('_', ' ')}</Badge>
              </Group>
            </div>

            {selectedPlan.notes && (
              <div>
                <Text fw={500} mb="xs">Notes</Text>
                <Text size="sm" c="dimmed">{selectedPlan.notes}</Text>
              </div>
            )}

            {selectedPlan.meals && selectedPlan.meals.length > 0 && (
              <div>
                <Text fw={500} mb="sm">Meal Plan Structure</Text>
                <Stack gap="sm">
                  {selectedPlan.meals.slice(0, 7).map((meal, idx) => (
                    <Card key={idx} p="sm" withBorder>
                      <Group justify="space-between">
                        <Text size="sm" fw={500}>
                          Day {meal.day_number} - {meal.meal_name}
                        </Text>
                        <Badge size="sm">
                          {meal.target_calories} cal
                        </Badge>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              </div>
            )}
          </Stack>
        </Modal>
      )}

      {/* Nutrition Plan Edit Modal */}
      <Modal
        opened={planEditOpened}
        onClose={closePlanEdit}
        title="Edit Nutrition Plan"
        size="lg"
      >
        <form onSubmit={editForm.onSubmit(handleSaveEdit)}>
          <Stack gap="md">
            <TextInput
              label="Plan Name"
              {...editForm.getInputProps('plan_name')}
              required
            />

            <SimpleGrid cols={2} spacing="md">
              <NumberInput
                label="Daily Calories"
                {...editForm.getInputProps('daily_calories')}
                min={0}
                required
              />
              <NumberInput
                label="Daily Protein (g)"
                {...editForm.getInputProps('daily_protein')}
                min={0}
                required
              />
              <NumberInput
                label="Daily Carbs (g)"
                {...editForm.getInputProps('daily_carbs')}
                min={0}
                required
              />
              <NumberInput
                label="Daily Fats (g)"
                {...editForm.getInputProps('daily_fats')}
                min={0}
                required
              />
            </SimpleGrid>

            <Select
              label="Nutrition Approach"
              data={[
                { value: 'macro_tracking', label: 'Macro Tracking' },
                { value: 'meal_plan', label: 'Meal Plan' },
                { value: 'portion_control', label: 'Portion Control' },
                { value: 'hybrid', label: 'Hybrid' }
              ]}
              {...editForm.getInputProps('nutrition_approach')}
              required
            />

            <NumberInput
              label="Meal Frequency (per day)"
              {...editForm.getInputProps('meal_frequency')}
              min={1}
              max={7}
              required
            />

            <Textarea
              label="Notes"
              {...editForm.getInputProps('notes')}
              rows={3}
            />

            <Switch
              label="Active Plan"
              description="Active plans are visible to clients"
              {...editForm.getInputProps('is_active', { type: 'checkbox' })}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={closePlanEdit}>
                Cancel
              </Button>
              <Button type="submit" color="robinhoodGreen">
                Save Changes
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteConfirmOpened}
        onClose={closeDeleteConfirm}
        title="Delete Nutrition Plan"
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to delete the nutrition plan "{planToDelete?.plan_name}"?
          </Text>
          <Text size="sm" c="dimmed">
            This will permanently remove the plan and it will no longer be assigned to the client. This action cannot be undone.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={closeDeleteConfirm}>
              Cancel
            </Button>
            <Button color="red" onClick={handleConfirmDelete}>
              Delete Plan
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}

// Client Nutrition View
function ClientNutritionView() {
  const [nutritionPlan, setNutritionPlan] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNutritionPlan()
  }, [])

  const fetchNutritionPlan = async () => {
    try {
      const response = await api.get('/nutrition/plans/active').catch(() => ({ data: null }))
      setNutritionPlan(response.data)
    } catch (error) {
      console.error('Error fetching nutrition plan:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader size="lg" />
      </Group>
    )
  }

  if (!nutritionPlan) {
    return (
      <Paper p="xl" withBorder>
        <Stack align="center" gap="md">
          <Text c="dimmed">No active nutrition plan.</Text>
          <Text size="sm" c="dimmed">Your trainer will create a nutrition plan for you.</Text>
        </Stack>
      </Paper>
    )
  }

  return (
    <>
      <Title order={2} mb="xl">My Nutrition Plan</Title>
      <Card shadow="sm" padding="lg" radius="sm" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={3}>{nutritionPlan.plan_name}</Title>
            <Badge color="green" variant="light">Active</Badge>
          </Group>
          
          <SimpleGrid cols={4} spacing="md">
            <Card withBorder p="sm">
              <Text size="xs" c="dimmed">Calories</Text>
              <Text size="xl" fw={700}>{nutritionPlan.daily_calories} kcal</Text>
            </Card>
            <Card withBorder p="sm">
              <Text size="xs" c="dimmed">Protein</Text>
              <Text size="xl" fw={700}>{nutritionPlan.daily_protein}g</Text>
            </Card>
            <Card withBorder p="sm">
              <Text size="xs" c="dimmed">Carbs</Text>
              <Text size="xl" fw={700}>{nutritionPlan.daily_carbs}g</Text>
            </Card>
            <Card withBorder p="sm">
              <Text size="xs" c="dimmed">Fats</Text>
              <Text size="xl" fw={700}>{nutritionPlan.daily_fats}g</Text>
            </Card>
          </SimpleGrid>

          <Divider />

          <Group>
            <Badge>Approach: {nutritionPlan.nutrition_approach?.replace('_', ' ')}</Badge>
            <Badge>Meals: {nutritionPlan.meal_frequency}/day</Badge>
            <Badge>Type: {nutritionPlan.plan_type?.replace('_', ' ')}</Badge>
          </Group>

          {nutritionPlan.notes && (
            <div>
              <Text fw={500} mb="xs">Notes</Text>
              <Text size="sm" c="dimmed">{nutritionPlan.notes}</Text>
            </div>
          )}

          <Button 
            component="a"
            href="/client/nutrition"
            variant="light"
            color="robinhoodGreen"
            fullWidth
            mt="md"
          >
            View Full Nutrition Dashboard
          </Button>
        </Stack>
      </Card>
    </>
  )
}

// Client Programs View
function ClientProgramsView({ programs, onViewProgram, selectedProgram, programViewOpened, closeProgramView }) {
  return (
    <>
      <Title order={2} mb="xl">My Workout Programs</Title>

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
            <Card key={program.id} shadow="sm" padding="lg" radius="sm" withBorder>
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
    </>
  )
}

// Program Calendar View Component (similar to the design shown)
function ProgramCalendarView({ program, opened, onClose, isTrainer, onProgramUpdate }) {
  const navigate = useNavigate()
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [workoutModalOpened, { open: openWorkoutModal, close: closeWorkoutModal }] = useDisclosure(false)
  const [editingWorkout, setEditingWorkout] = useState(null)
  const [currentProgram, setCurrentProgram] = useState(program)
  const [editingWeekName, setEditingWeekName] = useState(null)
  const [weekNameValue, setWeekNameValue] = useState('')
  const [sessionSchedulingOpened, { open: openSessionScheduling, close: closeSessionScheduling }] = useDisclosure(false)
  const [savedWorkoutId, setSavedWorkoutId] = useState(null)
  const [savedWorkout, setSavedWorkout] = useState(null)
  const savedWorkoutRef = useRef(null) // Use ref to store workout for immediate access
  const [assignedClients, setAssignedClients] = useState([])
  const [workoutActionsOpened, setWorkoutActionsOpened] = useState(false)
  const openWorkoutActions = () => {
    console.log('[DEBUG] openWorkoutActions called, setting state to true')
    setWorkoutActionsOpened(true)
  }
  const closeWorkoutActions = () => {
    console.log('[DEBUG] closeWorkoutActions called, setting state to false')
    setWorkoutActionsOpened(false)
  }
  const [copyWorkoutOpened, { open: openCopyWorkout, close: closeCopyWorkout }] = useDisclosure(false)
  const [repeatWorkoutOpened, { open: openRepeatWorkout, close: closeRepeatWorkout }] = useDisclosure(false)

  // Track workoutActionsOpened state changes
  useEffect(() => {
    console.log('[DEBUG] workoutActionsOpened state changed to:', workoutActionsOpened)
  }, [workoutActionsOpened])

  // Update current program when program prop changes
  useEffect(() => {
    setCurrentProgram(program)
    
    // If client view and start_date is missing, fetch it from assignment
    if (!isTrainer && program?.id && !program.start_date) {
      api.get('/programs/client/assigned')
        .then(res => {
          const assignedProgram = res.data?.find(p => p.id === program.id)
          if (assignedProgram?.start_date) {
            setCurrentProgram(prev => ({ ...prev, start_date: assignedProgram.start_date }))
          }
        })
        .catch(err => console.error('Error fetching assignment start_date:', err))
    }
  }, [program, isTrainer])

  // Helper function to calculate actual date from program start date, week, and day
  // dayNumber: 1=Monday, 2=Tuesday, ..., 7=Sunday
  // The start_date is always Week 1, Day 1 (regardless of what day of week it actually is)
  const calculateDateForDay = (startDate, weekNumber, dayNumber) => {
    if (!startDate) return null
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0) // Normalize to start of day
    
    // Get the day of week for start date (0=Sunday, 1=Monday, ..., 6=Saturday)
    const startDayOfWeek = start.getDay()
    // Convert to Monday=1, Sunday=7 format
    const startDay = startDayOfWeek === 0 ? 7 : startDayOfWeek
    
    // Calculate days to add:
    // Start date is Week 1, Day 1 (regardless of actual day of week)
    // So Day 1 = start date, Day 2 = start date + 1, etc.
    // For Week 2, Day 1 = start date + 7, etc.
    const daysToAdd = (weekNumber - 1) * 7 + (dayNumber - 1)
    
    const date = new Date(start)
    date.setDate(start.getDate() + daysToAdd)
    return date
  }

  // Format date for display
  const formatDateDisplay = (date) => {
    if (!date) return null
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    })
  }

  // Calculate total days in program
  const totalDays = currentProgram.duration_weeks * 7
  const daysPerWeek = 7

  // Organize all workouts by week and day
  const workoutsByWeekAndDay = {}
  currentProgram.workouts?.forEach(workout => {
    if (!workoutsByWeekAndDay[workout.week_number]) {
      workoutsByWeekAndDay[workout.week_number] = {}
    }
    if (!workoutsByWeekAndDay[workout.week_number][workout.day_number]) {
      workoutsByWeekAndDay[workout.week_number][workout.day_number] = []
    }
    workoutsByWeekAndDay[workout.week_number][workout.day_number].push(workout)
  })

  const handleClientWorkoutClick = (workout) => {
    // Navigate to active workout page for better UX
    if (workout.id) {
      navigate(`/client/workout/${workout.id}`)
    } else {
      // Fallback to log modal if workout doesn't have ID
      setEditingWorkout(workout)
      openWorkoutModal()
    }
  }

  const handleWeekNameEdit = (weekNum) => {
    const currentName = currentProgram.week_names?.[weekNum] || ''
    setEditingWeekName(weekNum)
    setWeekNameValue(currentName)
  }

  const handleWeekNameSave = async (weekNum) => {
    if (!isTrainer) return
    
    try {
      await api.put(`/programs/${currentProgram.id}/week/${weekNum}/name`, {
        week_name: weekNameValue.trim() || null
      })
      
      // Update local state
      setCurrentProgram(prev => ({
        ...prev,
        week_names: {
          ...prev.week_names,
          [weekNum]: weekNameValue.trim() || null
        }
      }))
      
      if (onProgramUpdate) {
        const response = await api.get(`/programs/${currentProgram.id}`)
        onProgramUpdate(response.data)
      }
      
      setEditingWeekName(null)
      setWeekNameValue('')
      
      notifications.show({
        title: 'Success',
        message: 'Week name updated',
        color: 'green',
      })
    } catch (error) {
      console.error('Error saving week name:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to save week name',
        color: 'red',
      })
    }
  }

  const handleWeekNameCancel = () => {
    setEditingWeekName(null)
    setWeekNameValue('')
  }

  const handleSaveWorkout = async (values) => {
    try {
      // Validate required fields
      if (!values.workout_name || values.workout_name.trim() === '') {
        notifications.show({
          title: 'Validation Error',
          message: 'Workout name is required',
          color: 'red',
        })
        return
      }

      if (!values.exercises || values.exercises.length === 0) {
        notifications.show({
          title: 'Validation Error',
          message: 'At least one exercise is required',
          color: 'red',
        })
        return
      }

      // Build workouts array with the new/updated workout
      const existingWorkouts = currentProgram.workouts || []
      const dayNumber = selectedDay
      const weekNumber = selectedWeek

      // Remove existing workout for this day/week if editing
      const filteredWorkouts = editingWorkout 
        ? existingWorkouts.filter(w => {
            // If editingWorkout has an id, filter by id; otherwise filter by day/week
            if (editingWorkout.id) {
              return !(w.id === editingWorkout.id)
            } else {
              return !(w.day_number === dayNumber && w.week_number === weekNumber)
            }
          })
        : existingWorkouts

      // Prepare exercises array
      const cleanedExercises = values.exercises
        .filter(ex => ex.exercise_name && ex.exercise_name.trim() !== '') // Filter out empty exercises
        .map((ex, idx) => ({
          exercise_name: ex.exercise_name.trim(),
          exercise_type: ex.exercise_type || 'REGULAR',
          sets: ex.sets || null,
          reps: ex.reps || null,
          weight: ex.weight || null,
          duration: ex.duration || null,
          rest: ex.rest || null,
          tempo: ex.tempo || null,
          notes: ex.notes || null,
          order_index: idx
        }))

      // Ensure we have at least one exercise
      if (cleanedExercises.length === 0) {
        notifications.show({
          title: 'Validation Error',
          message: 'At least one exercise with a name is required',
          color: 'red',
        })
        return
      }

      // Handle repeat workout option
      const workoutsToAdd = []
      
      if (values.repeatWorkout && !editingWorkout) {
        // Create workout for each week on the specified day
        const startWeek = values.repeatStartWeek || selectedWeek
        const endWeek = values.repeatEndWeek || selectedWeek
        const targetDay = values.repeatDayOfWeek || selectedDay
        
        for (let week = startWeek; week <= endWeek; week++) {
          // Skip if workout already exists for this week/day
          const exists = filteredWorkouts.some(w => 
            w.week_number === week && w.day_number === targetDay
          )
          
          if (!exists) {
            workoutsToAdd.push({
              workout_name: values.workout_name.trim(),
              day_number: targetDay,
              week_number: week,
              exercises: cleanedExercises
            })
          }
        }
        
        if (workoutsToAdd.length === 0) {
          notifications.show({
            title: 'Info',
            message: 'All selected weeks already have workouts on this day',
            color: 'blue',
          })
          return
        }
      } else {
        // Single workout (normal case or editing)
        workoutsToAdd.push({
          workout_name: values.workout_name.trim(),
          day_number: selectedDay,
          week_number: selectedWeek,
          exercises: cleanedExercises
        })
      }

      const updatedWorkouts = [...filteredWorkouts, ...workoutsToAdd]

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

      // Find the saved workout ID (it should be in the response)
      // Try multiple ways to find it since the workout might be newly created
      const workoutName = values.workout_name.trim()
      let savedWorkout = response.data.workouts?.find(w => 
        w.id && w.week_number === weekNumber && w.day_number === dayNumber
      )
      
      // If not found by ID, try by name and position
      if (!savedWorkout) {
        savedWorkout = response.data.workouts?.find(w => 
          w.week_number === weekNumber && 
          w.day_number === dayNumber && 
          w.workout_name === workoutName
        )
      }
      
      // If still not found, get the last workout for this day/week
      if (!savedWorkout) {
        const dayWorkouts = response.data.workouts?.filter(w => 
          w.week_number === weekNumber && w.day_number === dayNumber
        )
        if (dayWorkouts && dayWorkouts.length > 0) {
          savedWorkout = dayWorkouts[dayWorkouts.length - 1]
        }
      }

      // Handle session creation/update
      if (savedWorkout?.id) {
        // If editing a workout and session details were provided, update sessions
        if (editingWorkout?.id && (values.sessionTime || values.location !== undefined || values.sessionType || values.meetingLink !== undefined)) {
          try {
            await api.put(`/schedule/trainer/workout/${savedWorkout.id}/sessions`, {
              sessionTime: values.sessionTime,
              location: values.location,
              sessionType: values.sessionType,
              meetingLink: values.meetingLink
            })
          } catch (error) {
            console.error('Error updating sessions:', error)
            // Don't fail the whole operation if session update fails
            notifications.show({
              title: 'Warning',
              message: 'Workout saved but session update failed',
              color: 'yellow',
            })
          }
        }
        // If creating a new workout with session details, create sessions for assigned clients
        else if (!editingWorkout && values.sessionTime && currentProgram.start_date) {
          try {
            // Get assigned clients
            const clientsRes = await api.get(`/programs/${currentProgram.id}/assigned-clients`)
            const assignedClients = clientsRes.data || []
            
            if (assignedClients.length > 0) {
              // Calculate session date
              const calculateSessionDate = (startDate, weekNum, dayNum) => {
                const start = new Date(startDate)
                start.setHours(0, 0, 0, 0)
                const daysToAdd = (weekNum - 1) * 7 + (dayNum - 1)
                const date = new Date(start)
                date.setDate(start.getDate() + daysToAdd)
                return date.toISOString().split('T')[0]
              }
              
              const sessionDate = calculateSessionDate(currentProgram.start_date, weekNumber, dayNumber)
              const clientIds = assignedClients.map(c => c.client_id || c.id).filter(Boolean)
              
              // Calculate duration from exercises
              const calculateDuration = () => {
                const exercises = values.exercises || []
                if (exercises.length === 0) return 60

                let totalMinutes = 0
                const validExercises = exercises.filter(ex => ex.exercise_name && ex.exercise_name.trim() !== '')

                validExercises.forEach((exercise, index) => {
                  // Parse duration per set
                  let durationPerSet = 0
                  if (exercise.duration) {
                    if (typeof exercise.duration === 'string') {
                      const timeParts = exercise.duration.split(':')
                      if (timeParts.length === 2) {
                        durationPerSet = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1])
                      } else {
                        durationPerSet = parseFloat(exercise.duration) * 60
                      }
                    } else {
                      durationPerSet = parseFloat(exercise.duration) * 60
                    }
                  }

                  // Parse rest time
                  let restMinutes = 0
                  if (exercise.rest) {
                    if (typeof exercise.rest === 'string') {
                      const restMatch = exercise.rest.match(/(\d+\.?\d*)/)
                      if (restMatch) {
                        restMinutes = parseFloat(restMatch[1])
                      }
                    } else {
                      restMinutes = parseFloat(exercise.rest)
                    }
                  }

                  const sets = exercise.sets ? parseInt(exercise.sets) : 1
                  const exerciseDuration = (durationPerSet + (restMinutes * 60)) * sets
                  totalMinutes += exerciseDuration

                  // Add 2 minute buffer between exercises
                  if (index < validExercises.length - 1) {
                    totalMinutes += 2 * 60
                  }
                })

                return Math.ceil(totalMinutes / 60) || 60
              }

              const calculatedDuration = calculateDuration()

              // Create sessions for all assigned clients
              await api.post(`/programs/${currentProgram.id}/workout/${savedWorkout.id}/create-sessions`, {
                sessionDate,
                sessionTime: values.sessionTime,
                duration: calculatedDuration,
                sessionType: values.sessionType || 'in_person',
                location: values.location || null,
                meetingLink: values.meetingLink || null,
                clientIds
              })
              
              notifications.show({
                title: 'Success',
                message: `Workout and ${assignedClients.length} session(s) created successfully!`,
                color: 'green',
              })
            }
          } catch (error) {
            console.error('Error creating sessions:', error)
            // Don't fail the whole operation if session creation fails
            notifications.show({
              title: 'Warning',
              message: 'Workout saved but session creation failed. You can create sessions manually.',
              color: 'yellow',
            })
          }
        }
      }
      
      // If trainer and workout was saved, show workout actions modal
      if (isTrainer) {
        // Set saved workout data - ensure we have the full workout object
        const firstWorkout = workoutsToAdd[0] || {}
        const workoutToSave = savedWorkout ? {
          ...savedWorkout,
          workout_name: savedWorkout.workout_name || firstWorkout.workout_name,
          exercises: savedWorkout.exercises || firstWorkout.exercises
        } : {
          ...firstWorkout,
          workout_name: firstWorkout.workout_name,
          exercises: firstWorkout.exercises
        }
        
        console.log('[DEBUG] Setting saved workout:', workoutToSave)
        
        // Fetch assigned clients for this program and then open modal
        const fetchClientsAndOpenModal = async () => {
          try {
            const clientsRes = await api.get(`/programs/${currentProgram.id}/assigned-clients`)
            console.log('[DEBUG] Assigned clients:', clientsRes.data)
            setAssignedClients(clientsRes.data || [])
          } catch (error) {
            console.error('Error fetching assigned clients:', error)
            setAssignedClients([])
          }
          
          // Set both state and ref for immediate access
          setSavedWorkout(workoutToSave)
          savedWorkoutRef.current = workoutToSave
          setSavedWorkoutId(savedWorkout?.id || null)
          
          // Close workout modal first
          closeWorkoutModal()
          
          // Use requestAnimationFrame to ensure state has updated, then setTimeout for modal transition
          requestAnimationFrame(() => {
            setTimeout(() => {
              console.log('[DEBUG] Opening workout actions modal, savedWorkout:', workoutToSave, 'ref:', savedWorkoutRef.current)
              // Ensure state is set one more time right before opening
              setSavedWorkout(workoutToSave)
              savedWorkoutRef.current = workoutToSave
              
              // Force state update - use functional update to ensure we get latest state
              console.log('[DEBUG] About to set workoutActionsOpened to true')
              setWorkoutActionsOpened(prev => {
                console.log('[DEBUG] setWorkoutActionsOpened functional update, prev:', prev, 'returning true')
                return true
              })
              
              // Also set workout state one more time
              setSavedWorkout(workoutToSave)
              
              // Double-check state after opening
              setTimeout(() => {
                console.log('[DEBUG] After state update, workoutActionsOpened should be true')
              }, 50)
            }, 300)
          })
        }
        
        fetchClientsAndOpenModal()
      } else {
        const successMessage = values.repeatWorkout && workoutsToAdd.length > 1
          ? `Workout repeated successfully! Created ${workoutsToAdd.length} workouts.`
          : 'Workout saved successfully!'
        
        notifications.show({
          title: 'Success',
          message: successMessage,
          color: 'green',
        })
      }
    } catch (error) {
      console.error('Error saving workout:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      })
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to save workout'
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      })
    }
  }

  const handleDayClick = (weekNum, dayOfWeek) => {
    setSelectedWeek(weekNum)
    setSelectedDay(dayOfWeek)
    const existingWorkout = workoutsByWeekAndDay[weekNum]?.[dayOfWeek]?.[0]
    if (existingWorkout) {
      setEditingWorkout(existingWorkout)
    } else {
      setEditingWorkout(null)
    }
    openWorkoutModal()
  }

  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      title={
        <Group justify="space-between" style={{ width: '100%' }}>
          <Text fw={600} size="lg">{program.name}</Text>
          {program.split_type && (
            <Badge size="lg" variant="light">{program.split_type}</Badge>
          )}
        </Group>
      }
      size="95%"
      centered
      styles={{
        body: {
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: '1.5rem'
        },
        content: {
          maxWidth: '98vw'
        }
      }}
    >
      <Stack gap="lg">
        {/* All Weeks Grid - Show multiple weeks */}
        <ScrollArea h="75vh">
          <Stack gap="xl">
            {Array.from({ length: currentProgram.duration_weeks || 1 }, (_, weekIdx) => {
              const weekNum = weekIdx + 1
              const weekWorkouts = workoutsByWeekAndDay[weekNum] || {}
              
              const weekName = currentProgram.week_names?.[weekNum]
              const displayWeekName = weekName || `WEEK ${weekNum}`
              
              return (
                <Stack key={weekNum} gap="sm">
                  <Group>
                    {editingWeekName === weekNum && isTrainer ? (
                      <Group gap="xs" style={{ flex: 1 }}>
                        <TextInput
                          value={weekNameValue}
                          onChange={(e) => setWeekNameValue(e.target.value)}
                          placeholder={`Week ${weekNum} name (e.g., Push Pull Legs)`}
                          size="sm"
                          style={{ flex: 1, maxWidth: '300px' }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleWeekNameSave(weekNum)
                            } else if (e.key === 'Escape') {
                              handleWeekNameCancel()
                            }
                          }}
                          autoFocus
                        />
                        <Button 
                          size="xs" 
                          color="green"
                          onClick={() => handleWeekNameSave(weekNum)}
                        >
                          Save
                        </Button>
                        <Button 
                          size="xs" 
                          variant="subtle"
                          onClick={handleWeekNameCancel}
                        >
                          Cancel
                        </Button>
                      </Group>
                    ) : (
                      <>
                        <Group gap="xs">
                          <Text 
                            fw={700} 
                            size="lg" 
                            c="gray.2"
                            style={{ cursor: isTrainer ? 'pointer' : 'default' }}
                            onClick={() => isTrainer && handleWeekNameEdit(weekNum)}
                          >
                            {displayWeekName}
                          </Text>
                          {isTrainer && (
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="gray"
                              onClick={() => handleWeekNameEdit(weekNum)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          )}
                        </Group>
                        <Divider style={{ flex: 1 }} color="dark.4" />
                      </>
                    )}
                  </Group>
                  
                  <SimpleGrid cols={7} spacing="md">
                    {Array.from({ length: 7 }, (_, dayIdx) => {
                      const dayNum = dayIdx + 1
                      const dayNumber = (weekNum - 1) * 7 + dayNum
                      const dayWorkouts = weekWorkouts[dayNum] || []
                      
                      // Calculate actual date for this day
                      // Always try to calculate date - if no start_date, use today as fallback for relative dates
                      let dayDate = null
                      if (currentProgram.start_date) {
                        dayDate = calculateDateForDay(currentProgram.start_date, weekNum, dayNum)
                      } else {
                        // Fallback: calculate relative to today (for display purposes)
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const daysToAdd = (weekNum - 1) * 7 + (dayNum - 1)
                        dayDate = new Date(today)
                        dayDate.setDate(today.getDate() + daysToAdd)
                      }
                      
                      const dateDisplay = dayDate ? formatDateDisplay(dayDate) : null
                      const dayName = dayDate ? dayDate.toLocaleDateString('en-US', { weekday: 'short' }) : null
                      const fullDate = dayDate ? dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null
                      
                      return (
                        <Paper
                          key={`week-${weekNum}-day-${dayNum}`}
                          p="md"
                          withBorder
                          style={{
                            minHeight: '200px',
                            cursor: isTrainer ? 'pointer' : 'default',
                            position: 'relative',
                            backgroundColor: dayWorkouts.length > 0 
                              ? 'var(--mantine-color-dark-6)' 
                              : 'var(--mantine-color-dark-7)',
                            borderColor: 'var(--mantine-color-dark-4)',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => isTrainer && handleDayClick(weekNum, dayNum)}
                          onMouseEnter={(e) => {
                            if (isTrainer) {
                              e.currentTarget.style.backgroundColor = 'var(--mantine-color-dark-5)'
                              e.currentTarget.style.borderColor = 'var(--mantine-color-blue-6)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (isTrainer) {
                              e.currentTarget.style.backgroundColor = dayWorkouts.length > 0 
                                ? 'var(--mantine-color-dark-6)' 
                                : 'var(--mantine-color-dark-7)'
                              e.currentTarget.style.borderColor = 'var(--mantine-color-dark-4)'
                            }
                          }}
                        >
                          <Stack gap="xs">
                            <Group justify="space-between">
                              {dayDate ? (
                                <Stack gap={0}>
                                  <Text fw={700} size="sm" c="gray.3">{dayName?.toUpperCase()}</Text>
                                  <Text fw={500} size="xs" c="gray.5">{dateDisplay}</Text>
                                  {!currentProgram.start_date && (
                                    <Text fw={400} size="xs" c="gray.6" style={{ fontStyle: 'italic' }}>
                                      (Est.)
                                    </Text>
                                  )}
                                </Stack>
                              ) : (
                                <Text fw={700} size="sm" c="gray.3">DAY {dayNum}</Text>
                              )}
                              {isTrainer && dayWorkouts.length === 0 && (
                                <Text size="xs" c="gray.5">+</Text>
                              )}
                            </Group>
                            
                            {dayWorkouts.map((workout, idx) => (
                              <Card
                                key={workout.id || idx}
                                p="sm"
                                withBorder
                                style={{
                                  backgroundColor: 'var(--mantine-color-dark-5)',
                                  border: '1px solid var(--mantine-color-blue-7)',
                                  cursor: !isTrainer ? 'pointer' : 'default',
                                  transition: 'all 0.2s ease',
                                  position: 'relative'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!isTrainer) {
                                    handleClientWorkoutClick(workout)
                                  } else {
                                    // Set the workout to edit before opening modal
                                    setEditingWorkout(workout)
                                    setSelectedWeek(weekNum)
                                    setSelectedDay(dayNum)
                                    openWorkoutModal()
                                  }
                                }}
                                onMouseEnter={(e) => {
                                  if (!isTrainer) {
                                    e.currentTarget.style.backgroundColor = 'var(--mantine-color-dark-4)'
                                    e.currentTarget.style.borderColor = 'var(--mantine-color-blue-5)'
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isTrainer) {
                                    e.currentTarget.style.backgroundColor = 'var(--mantine-color-dark-5)'
                                    e.currentTarget.style.borderColor = 'var(--mantine-color-blue-7)'
                                  }
                                }}
                              >
                                {isTrainer && (
                                  <ActionIcon
                                    variant="subtle"
                                    color="blue"
                                    size="sm"
                                    style={{
                                      position: 'absolute',
                                      top: 4,
                                      right: 4,
                                      zIndex: 10
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      // Set workout to copy
                                      savedWorkoutRef.current = workout
                                      setSavedWorkout(workout)
                                      setSavedWorkoutId(workout.id)
                                      openCopyWorkout()
                                    }}
                                    title="Copy workout to another day"
                                  >
                                    <IconCopy size={16} />
                                  </ActionIcon>
                                )}
                                <Stack gap="xs">
                                  <Text size="sm" fw={600} lineClamp={1} c="gray.1">
                                    {workout.workout_name}
                                  </Text>
                                  {workout.exercises && workout.exercises.length > 0 && (
                                    <Stack gap={4}>
                                      {workout.exercises.slice(0, 3).map((ex, exIdx) => (
                                        <Group key={exIdx} gap={4} wrap="nowrap">
                                          <Badge size="xs" variant="filled" color="blue">
                                            {ex.exercise_type || 'REGULAR'}
                                          </Badge>
                                          <Text size="xs" c="gray.4" lineClamp={1} style={{ flex: 1 }}>
                                            {ex.exercise_name}
                                          </Text>
                                        </Group>
                                      ))}
                                      {workout.exercises.length > 3 && (
                                        <Text size="xs" c="gray.5">
                                          +{workout.exercises.length - 3} more
                                        </Text>
                                      )}
                                    </Stack>
                                  )}
                                </Stack>
                              </Card>
                            ))}
                            
                            {dayWorkouts.length === 0 && isTrainer && (
                              <Text size="xs" c="gray.5" ta="center" mt="auto" pt="md">
                                Click to add workout
                              </Text>
                            )}
                          </Stack>
                        </Paper>
                      )
                    })}
                  </SimpleGrid>
                </Stack>
              )
            })}
          </Stack>
        </ScrollArea>
      </Stack>

      {/* Workout Editor Modal */}
      {isTrainer && (
        <WorkoutEditorModal
          opened={workoutModalOpened}
          onClose={closeWorkoutModal}
          dayNumber={selectedDay}
          weekNumber={selectedWeek}
          workout={editingWorkout}
          onSave={handleSaveWorkout}
          program={currentProgram}
        />
      )}

      {/* Client Workout Logging Modal */}
      {!isTrainer && (
        <ClientWorkoutLogModal
          opened={workoutModalOpened}
          onClose={closeWorkoutModal}
          workout={editingWorkout}
          programId={currentProgram.id}
        />
      )}

      {/* Workout Actions Modal */}
      {isTrainer && (
        <WorkoutActionsModal
          key={`workout-actions-${workoutActionsOpened}-${savedWorkout?.id || savedWorkoutRef.current?.id || 'new'}`}
          opened={workoutActionsOpened}
          onClose={() => {
            console.log('[DEBUG] WorkoutActionsModal onClose called')
            closeWorkoutActions()
          }}
          program={currentProgram}
          workout={savedWorkout || savedWorkoutRef.current}
          workoutId={savedWorkoutId}
          weekNumber={selectedWeek}
          dayNumber={selectedDay}
          assignedClients={assignedClients}
          onEdit={() => {
            closeWorkoutActions()
            setEditingWorkout(savedWorkout)
            openWorkoutModal()
          }}
          onCopy={() => {
            closeWorkoutActions()
            openCopyWorkout()
          }}
          onRepeat={() => {
            closeWorkoutActions()
            openRepeatWorkout()
          }}
          onSchedule={() => {
            closeWorkoutActions()
            openSessionScheduling()
          }}
          onProgramUpdate={onProgramUpdate}
          setCurrentProgram={setCurrentProgram}
        />
      )}

      {/* Copy Workout Modal */}
      {isTrainer && (
        <CopyWorkoutModal
          opened={copyWorkoutOpened}
          onClose={closeCopyWorkout}
          program={currentProgram}
          workout={savedWorkout}
          onProgramUpdate={onProgramUpdate}
          setCurrentProgram={setCurrentProgram}
        />
      )}

      {/* Repeat Workout Modal */}
      {isTrainer && (
        <RepeatWorkoutModal
          opened={repeatWorkoutOpened}
          onClose={closeRepeatWorkout}
          program={currentProgram}
          workout={savedWorkout}
          onProgramUpdate={onProgramUpdate}
          setCurrentProgram={setCurrentProgram}
        />
      )}

      {/* Session Scheduling Modal */}
      {isTrainer && (
        <SessionSchedulingModal
          opened={sessionSchedulingOpened}
          onClose={closeSessionScheduling}
          program={currentProgram}
          workoutId={savedWorkoutId}
          weekNumber={selectedWeek}
          dayNumber={selectedDay}
          assignedClients={assignedClients}
        />
      )}
    </Modal>
  )
}

// Workout Editor Modal Component
function WorkoutEditorModal({ opened, onClose, dayNumber, weekNumber, workout, onSave, program }) {
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [existingSessions, setExistingSessions] = useState([])
  
  const form = useForm({
    initialValues: {
      workout_name: workout?.workout_name || '',
      exercises: workout?.exercises || [],
      repeatWorkout: false,
      repeatPattern: 'weekly',
      repeatStartWeek: weekNumber || 1,
      repeatEndWeek: weekNumber || 1,
      repeatDayOfWeek: dayNumber || 1,
      sessionTime: '18:00',
      location: '',
      sessionType: 'in_person',
      meetingLink: ''
    }
  })

  // Fetch existing sessions when editing a workout
  useEffect(() => {
    if (opened && workout?.id && program?.id) {
      setLoadingSessions(true)
      // Fetch sessions for this workout
      api.get(`/schedule/trainer/workout/${workout.id}/sessions`)
        .then(res => {
          const sessions = res.data || []
          setExistingSessions(sessions)
          
          // If sessions exist, use the first one's time/location as default
          if (sessions.length > 0) {
            const firstSession = sessions[0]
            form.setFieldValue('sessionTime', firstSession.session_time?.substring(0, 5) || '18:00')
            form.setFieldValue('location', firstSession.location || '')
            form.setFieldValue('sessionType', firstSession.session_type || 'in_person')
            form.setFieldValue('meetingLink', firstSession.meeting_link || '')
          }
        })
        .catch(err => {
          console.error('Error fetching sessions:', err)
          setExistingSessions([])
        })
        .finally(() => {
          setLoadingSessions(false)
        })
    } else {
      setExistingSessions([])
    }
  }, [opened, workout?.id, program?.id])

  // Update form when workout changes (for editing)
  useEffect(() => {
    if (workout) {
      form.setValues({
        workout_name: workout.workout_name || '',
        exercises: workout.exercises || [],
        repeatWorkout: false,
        repeatPattern: 'weekly',
        repeatStartWeek: weekNumber || 1,
        repeatEndWeek: weekNumber || 1,
        repeatDayOfWeek: dayNumber || 1,
        sessionTime: form.values.sessionTime || '18:00',
        location: form.values.location || '',
        sessionType: form.values.sessionType || 'in_person',
        meetingLink: form.values.meetingLink || ''
      })
    } else {
      // Reset form for new workout
      form.setValues({
        workout_name: '',
        exercises: [],
        repeatWorkout: false,
        repeatPattern: 'weekly',
        repeatStartWeek: weekNumber || 1,
        repeatEndWeek: weekNumber || 1,
        repeatDayOfWeek: dayNumber || 1,
        sessionTime: '18:00',
        location: '',
        sessionType: 'in_person',
        meetingLink: ''
      })
    }
  }, [workout, opened, weekNumber, dayNumber])

  const addExercise = () => {
    try {
      // Ensure exercises array exists
      const currentExercises = form.values.exercises || []
      form.setFieldValue('exercises', [
        ...currentExercises,
        {
          exercise_name: '',
          exercise_type: 'REGULAR',
          sets: null,
          reps: '',
          weight: '',
          duration: '',
          rest: '',
          tempo: ''
        }
      ])
    } catch (error) {
      console.error('Error adding exercise:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to add exercise. Please try again.',
        color: 'red',
      })
    }
  }

  // Calculate total session duration from exercises (memoized for performance)
  const estimatedDuration = useMemo(() => {
    const exercises = form.values.exercises || []
    if (exercises.length === 0) return 0

    let totalMinutes = 0
    const validExercises = exercises.filter(ex => ex.exercise_name && ex.exercise_name.trim() !== '')

    validExercises.forEach((exercise, index) => {
      // Parse duration (format: "MM:SS" or just minutes as number)
      let durationPerSet = 0
      if (exercise.duration) {
        if (typeof exercise.duration === 'string') {
          // Try to parse as MM:SS format
          const timeParts = exercise.duration.split(':')
          if (timeParts.length === 2) {
            durationPerSet = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1])
          } else {
            // Try to parse as just a number (minutes)
            durationPerSet = parseFloat(exercise.duration) * 60
          }
        } else {
          durationPerSet = parseFloat(exercise.duration) * 60
        }
      }

      // Parse rest time (format: "X Minute" or just a number)
      let restMinutes = 0
      if (exercise.rest) {
        if (typeof exercise.rest === 'string') {
          // Extract number from strings like "1 Minute between sets" or "1 min"
          const restMatch = exercise.rest.match(/(\d+\.?\d*)/)
          if (restMatch) {
            restMinutes = parseFloat(restMatch[1])
          }
        } else {
          restMinutes = parseFloat(exercise.rest)
        }
      }

      // Get number of sets
      const sets = exercise.sets ? parseInt(exercise.sets) : 1

      // Calculate: (duration_per_set + rest) * sets
      const exerciseDuration = (durationPerSet + (restMinutes * 60)) * sets
      totalMinutes += exerciseDuration

      // Add 2 minute buffer between exercises (except after the last one)
      if (index < validExercises.length - 1) {
        totalMinutes += 2 * 60 // 2 minutes in seconds
      }
    })

    return Math.ceil(totalMinutes / 60) // Return in minutes, rounded up
  }, [form.values.exercises])

  // Calculate estimated end time (memoized)
  const estimatedEndTime = useMemo(() => {
    const startTime = form.values.sessionTime
    if (!startTime || estimatedDuration === 0) return null

    try {
      // Parse start time (format: "HH:MM")
      const [hours, minutes] = startTime.split(':').map(Number)
      const startDate = new Date()
      startDate.setHours(hours, minutes, 0, 0)

      // Add duration
      const endDate = new Date(startDate.getTime() + estimatedDuration * 60 * 1000)

      // Format as HH:MM
      const endHours = String(endDate.getHours()).padStart(2, '0')
      const endMinutes = String(endDate.getMinutes()).padStart(2, '0')
      return `${endHours}:${endMinutes}`
    } catch (error) {
      return null
    }
  }, [form.values.sessionTime, estimatedDuration])

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
          
          {(form.values.exercises || []).map((exercise, index) => (
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

          <Button 
            type="button" 
            variant="light" 
            onClick={addExercise}
            fullWidth
            color="robinhoodGreen"
          >
            + Add Exercise
          </Button>

          <Divider label="Session Details" labelPosition="left" mt="md" />
          <Stack gap="sm">
            {workout && existingSessions.length > 0 && loadingSessions ? (
              <Loader size="sm" />
            ) : (
              <>
                {workout && existingSessions.length > 0 && (
                  <Text size="sm" c="dimmed" mb="xs">
                    This workout has {existingSessions.length} scheduled session(s). Update session details below.
                  </Text>
                )}
                {!workout && (
                  <Text size="sm" c="dimmed" mb="xs">
                    Set session time and location to automatically create sessions when this workout is saved.
                  </Text>
                )}
                <Group grow>
                  <TimeInput
                    label="Session Start Time"
                    {...form.getInputProps('sessionTime')}
                  />
                  <Select
                    label="Session Type"
                    data={[
                      { value: 'in_person', label: 'In-Person' },
                      { value: 'online', label: 'Online' },
                      { value: 'hybrid', label: 'Hybrid' }
                    ]}
                    {...form.getInputProps('sessionType')}
                  />
                </Group>
                {form.values.sessionTime && estimatedDuration > 0 && (
                  <Paper p="sm" withBorder style={{ backgroundColor: 'var(--mantine-color-dark-6)' }}>
                    <Group justify="space-between">
                      <Stack gap={2}>
                        <Text size="sm" fw={500}>Estimated Duration:</Text>
                        <Text size="xs" c="dimmed">Based on exercises</Text>
                      </Stack>
                      <Text size="lg" fw={600} c="blue">
                        {estimatedDuration} min
                      </Text>
                    </Group>
                    {estimatedEndTime && (
                      <Group justify="space-between" mt="xs" pt="xs" style={{ borderTop: '1px solid var(--mantine-color-dark-4)' }}>
                        <Stack gap={2}>
                          <Text size="sm" fw={500}>Estimated End Time:</Text>
                          <Text size="xs" c="dimmed">Start: {form.values.sessionTime}</Text>
                        </Stack>
                        <Text size="lg" fw={600} c="green">
                          {estimatedEndTime}
                        </Text>
                      </Group>
                    )}
                  </Paper>
                )}
                {form.values.sessionType === 'in_person' && (
                  <TextInput
                    label="Location"
                    placeholder="Gym address or location"
                    {...form.getInputProps('location')}
                  />
                )}
                {form.values.sessionType === 'online' && (
                  <TextInput
                    label="Meeting Link"
                    placeholder="Zoom, Google Meet, or other meeting link"
                    type="url"
                    {...form.getInputProps('meetingLink')}
                  />
                )}
              </>
            )}
          </Stack>

          {!workout && (
            <>
              <Divider label="Repeat Workout" labelPosition="left" mt="md" />
              <Switch
                label="Repeat this workout on multiple days"
                description="Create this workout on the same day each week"
                {...form.getInputProps('repeatWorkout', { type: 'checkbox' })}
              />
              {form.values.repeatWorkout && (
                <Stack gap="sm" ml="md">
                  <Select
                    label="Repeat Pattern"
                    data={[
                      { value: 'weekly', label: 'Same day each week' }
                    ]}
                    {...form.getInputProps('repeatPattern')}
                  />
                  <Group grow>
                    <NumberInput
                      label="Start Week"
                      min={1}
                      {...form.getInputProps('repeatStartWeek')}
                    />
                    <NumberInput
                      label="End Week"
                      min={form.values.repeatStartWeek || 1}
                      {...form.getInputProps('repeatEndWeek')}
                    />
                  </Group>
                  <NumberInput
                    label="Day of Week"
                    description="1=Monday, 7=Sunday"
                    min={1}
                    max={7}
                    {...form.getInputProps('repeatDayOfWeek')}
                  />
                </Stack>
              )}
            </>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" color="robinhoodGreen">Save Workout</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

// Client Workout Logging Modal
function ClientWorkoutLogModal({ opened, onClose, workout, programId }) {
  const [logging, setLogging] = useState(false)
  const form = useForm({
    initialValues: {
      exercises_completed: {},
      notes: '',
      duration: null
    }
  })

  useEffect(() => {
    if (workout && workout.exercises) {
      // Initialize exercise log with default values
      const initialExercises = {}
      workout.exercises.forEach((ex, idx) => {
        initialExercises[ex.id || idx] = {
          sets_completed: ex.sets || 0,
          reps_completed: ex.reps || '',
          weight_used: ex.weight || '',
          completed: false
        }
      })
      form.setFieldValue('exercises_completed', initialExercises)
    }
  }, [workout])

  const handleSubmit = async (values) => {
    try {
      setLogging(true)
      await api.post(`/programs/workout/${workout.id}/complete`, {
        exercises_completed: values.exercises_completed,
        notes: values.notes,
        duration: values.duration
      })
      notifications.show({
        title: 'Success',
        message: 'Workout logged successfully!',
        color: 'green'
      })
      onClose()
      form.reset()
    } catch (error) {
      console.error('Error logging workout:', error)
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to log workout',
        color: 'red'
      })
    } finally {
      setLogging(false)
    }
  }

  if (!workout) return null

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={workout.workout_name}
      size="lg"
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Text fw={500} size="lg">Exercises</Text>
          
          {workout.exercises?.map((exercise, idx) => {
            const exerciseKey = exercise.id || idx
            return (
              <Card key={exerciseKey} p="md" withBorder>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text fw={600}>{exercise.exercise_name}</Text>
                    <Badge variant="light">
                      {exercise.sets} × {exercise.reps}
                      {exercise.weight && ` @ ${exercise.weight}`}
                    </Badge>
                  </Group>
                  
                  {exercise.notes && (
                    <Text size="sm" c="dimmed">{exercise.notes}</Text>
                  )}

                  <Group grow>
                    <NumberInput
                      label="Sets Completed"
                      min={0}
                      max={exercise.sets || 10}
                      {...form.getInputProps(`exercises_completed.${exerciseKey}.sets_completed`)}
                    />
                    <TextInput
                      label="Reps Completed"
                      placeholder={exercise.reps}
                      {...form.getInputProps(`exercises_completed.${exerciseKey}.reps_completed`)}
                    />
                    <TextInput
                      label="Weight Used"
                      placeholder={exercise.weight || 'N/A'}
                      {...form.getInputProps(`exercises_completed.${exerciseKey}.weight_used`)}
                    />
                  </Group>
                </Stack>
              </Card>
            )
          })}

          <Divider />

          <NumberInput
            label="Workout Duration (minutes)"
            min={0}
            {...form.getInputProps('duration')}
          />

          <Textarea
            label="Notes (optional)"
            placeholder="How did the workout feel? Any issues?"
            {...form.getInputProps('notes')}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={onClose} disabled={logging}>
              Cancel
            </Button>
            <Button type="submit" color="robinhoodGreen" loading={logging}>
              Complete Workout
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

// Session Scheduling Modal Component
function SessionSchedulingModal({ opened, onClose, program, workoutId, weekNumber, dayNumber, assignedClients }) {
  const [loading, setLoading] = useState(false)
  
  // Calculate actual session date from program start date
  const calculateSessionDate = (startDate, weekNum, dayNum) => {
    if (!startDate) return null
    const start = new Date(startDate)
    const startDayOfWeek = start.getDay()
    const startDay = startDayOfWeek === 0 ? 7 : startDayOfWeek
    const daysToAdd = (weekNum - 1) * 7 + (dayNum - startDay)
    const sessionDate = new Date(start)
    sessionDate.setDate(start.getDate() + daysToAdd)
    return sessionDate.toISOString().split('T')[0]
  }

  // Get start date from program or fetch from API if not available
  const [programStartDate, setProgramStartDate] = useState(program?.start_date || null)
  
  useEffect(() => {
    if (opened && program?.id && !programStartDate) {
      // Fetch program to get start_date if not in prop
      api.get(`/programs/${program.id}`)
        .then(res => {
          if (res.data?.start_date) {
            setProgramStartDate(res.data.start_date)
          }
        })
        .catch(() => {})
    }
  }, [opened, program?.id])

  const sessionDate = programStartDate ? calculateSessionDate(programStartDate, weekNumber, dayNumber) : null
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayName = dayNumber ? dayNames[(dayNumber - 1) % 7] : ''

  const form = useForm({
    initialValues: {
      scheduleAsSession: false,
      sessionTime: '18:00',
      duration: 60,
      sessionType: 'in_person',
      location: '',
      meetingLink: '',
      repeat: false,
      repeatPattern: 'weekly',
      repeatEndDate: null,
      clientIds: assignedClients.map(c => c.client_id?.toString() || c.id?.toString()).filter(Boolean)
    }
  })

  useEffect(() => {
    if (opened && assignedClients.length > 0) {
      form.setFieldValue('clientIds', assignedClients.map(c => c.client_id?.toString() || c.id?.toString()).filter(Boolean))
    }
  }, [opened, assignedClients])

  const handleSubmit = async (values) => {
    if (!values.scheduleAsSession) {
      onClose()
      notifications.show({
        title: 'Success',
        message: 'Workout saved successfully',
        color: 'green',
      })
      return
    }

    // If no workoutId, we can still create sessions but need to find the workout
    if (!workoutId) {
      // Try to find the workout from the program
      try {
        const programRes = await api.get(`/programs/${program.id}`)
        const workout = programRes.data.workouts?.find(w => 
          w.week_number === weekNumber && w.day_number === dayNumber
        )
        if (workout?.id) {
          // Use the found workout ID
          const sessionData = {
            workoutId: workout.id,
            sessionDate,
            sessionTime: values.sessionTime,
            duration: values.duration,
            sessionType: values.sessionType,
            location: values.location || null,
            meetingLink: values.meetingLink || null,
            repeat: values.repeat,
            repeatPattern: values.repeatPattern,
            repeatEndDate: values.repeatEndDate,
            clientIds: values.clientIds.length > 0 ? values.clientIds : assignedClients.map(c => c.client_id || c.id).filter(Boolean)
          }

          await api.post(`/programs/${program.id}/workout/${workout.id}/create-sessions`, sessionData)
          
          notifications.show({
            title: 'Success',
            message: values.repeat 
              ? `Sessions created and scheduled to repeat ${values.repeatPattern}` 
              : 'Session created successfully',
            color: 'green',
          })
          
          onClose()
          return
        }
      } catch (error) {
        console.error('Error finding workout:', error)
      }
      
      notifications.show({
        title: 'Error',
        message: 'Workout not found. Please try again.',
        color: 'red',
      })
      return
    }

    if (values.repeat && !values.repeatEndDate) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select an end date for repeating sessions',
        color: 'red',
      })
      return
    }

    if (values.clientIds.length === 0 && assignedClients.length > 0) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select at least one client',
        color: 'red',
      })
      return
    }

    try {
      setLoading(true)
      
      const sessionData = {
        workoutId,
        sessionDate,
        sessionTime: values.sessionTime,
        duration: values.duration,
        sessionType: values.sessionType,
        location: values.location || null,
        meetingLink: values.meetingLink || null,
        repeat: values.repeat,
        repeatPattern: values.repeatPattern,
        repeatEndDate: values.repeatEndDate,
        clientIds: values.clientIds.length > 0 ? values.clientIds : assignedClients.map(c => c.client_id || c.id).filter(Boolean)
      }

      await api.post(`/programs/${program.id}/workout/${workoutId}/create-sessions`, sessionData)
      
      notifications.show({
        title: 'Success',
        message: values.repeat 
          ? `Sessions created and scheduled to repeat ${values.repeatPattern}` 
          : 'Session created successfully',
        color: 'green',
      })
      
      onClose()
    } catch (error) {
      console.error('Error creating sessions:', error)
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create sessions',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!sessionDate) {
    return (
      <Modal opened={opened} onClose={onClose} title="Schedule Session" size="md">
        <Stack gap="md">
          <Alert color="yellow">
            <Text size="sm">Program start date is required to schedule sessions. Please set a start date for this program first.</Text>
          </Alert>
          <Group justify="flex-end">
            <Button onClick={onClose}>Close</Button>
          </Group>
        </Stack>
      </Modal>
    )
  }

  // Check if there are assigned clients
  const hasAssignedClients = assignedClients && assignedClients.length > 0

  if (!hasAssignedClients) {
    return (
      <Modal opened={opened} onClose={onClose} title="Schedule Session" size="md">
        <Stack gap="md">
          <Alert color="yellow">
            <Text size="sm">
              This program is not assigned to any clients yet. Please assign the program to clients first before scheduling sessions.
            </Text>
          </Alert>
          <Group justify="flex-end">
            <Button onClick={onClose}>Close</Button>
          </Group>
        </Stack>
      </Modal>
    )
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Schedule Session" size="lg">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Alert color="blue">
            <Text size="sm">
              <strong>Workout Date:</strong> {new Date(sessionDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })} ({dayName})
            </Text>
          </Alert>

          <Checkbox
            label="Schedule this workout as a training session"
            description="Create a scheduled session for this workout"
            {...form.getInputProps('scheduleAsSession', { type: 'checkbox' })}
          />

          {form.values.scheduleAsSession && (
            <>
              <Divider />
              
              <Group grow>
                <TimeInput
                  label="Session Time"
                  required
                  {...form.getInputProps('sessionTime')}
                />
                <NumberInput
                  label="Duration (minutes)"
                  min={15}
                  max={180}
                  step={15}
                  required
                  {...form.getInputProps('duration')}
                />
              </Group>

              <Select
                label="Session Type"
                data={[
                  { value: 'in_person', label: 'In-Person' },
                  { value: 'online', label: 'Online' },
                  { value: 'hybrid', label: 'Hybrid' }
                ]}
                required
                {...form.getInputProps('sessionType')}
              />

              {form.values.sessionType === 'in_person' && (
                <TextInput
                  label="Location"
                  placeholder="Gym address or location"
                  {...form.getInputProps('location')}
                />
              )}

              {form.values.sessionType === 'online' && (
                <TextInput
                  label="Meeting Link"
                  placeholder="Zoom, Google Meet, or other meeting link"
                  type="url"
                  {...form.getInputProps('meetingLink')}
                />
              )}

              {assignedClients.length > 0 && (
                <MultiSelect
                  label="Select Clients"
                  description="Choose which clients to schedule this session for"
                  data={assignedClients.map(c => ({
                    value: (c.client_id || c.id).toString(),
                    label: c.name || c.client_name || `Client ${c.client_id || c.id}`
                  }))}
                  {...form.getInputProps('clientIds')}
                  required
                />
              )}

              <Divider />

              <Checkbox
                label="Repeat this session"
                description="Schedule this session to repeat on the same day each week"
                {...form.getInputProps('repeat', { type: 'checkbox' })}
              />

              {form.values.repeat && (
                <Stack gap="sm">
                  <Select
                    label="Repeat Pattern"
                    data={[
                      { value: 'weekly', label: 'Weekly' },
                      { value: 'biweekly', label: 'Bi-weekly (Every 2 weeks)' },
                      { value: 'monthly', label: 'Monthly' }
                    ]}
                    {...form.getInputProps('repeatPattern')}
                  />
                  <DatePickerInput
                    label="Repeat Until"
                    placeholder="Select end date"
                    minDate={new Date(sessionDate)}
                    required
                    {...form.getInputProps('repeatEndDate')}
                  />
                </Stack>
              )}

              <Divider />
            </>
          )}

          <Group justify="flex-end" mt="md">
            <Button 
              variant="outline" 
              onClick={() => {
                onClose()
                notifications.show({
                  title: 'Success',
                  message: 'Workout saved successfully',
                  color: 'green',
                })
              }} 
              disabled={loading}
            >
              {form.values.scheduleAsSession ? 'Skip Scheduling' : 'Close'}
            </Button>
            {form.values.scheduleAsSession ? (
              <Button type="submit" color="robinhoodGreen" loading={loading}>
                Create Session
              </Button>
            ) : (
              <Button 
                onClick={() => {
                  onClose()
                  notifications.show({
                    title: 'Success',
                    message: 'Workout saved successfully',
                    color: 'green',
                  })
                }}
                color="robinhoodGreen"
                disabled={loading}
              >
                Done
              </Button>
            )}
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

// Workout Actions Modal Component
function WorkoutActionsModal({ opened, onClose, program, workout, workoutId, weekNumber, dayNumber, assignedClients, onEdit, onCopy, onRepeat, onSchedule }) {
  // Store workout in local state to handle async state updates
  const [localWorkout, setLocalWorkout] = useState(workout)
  
  useEffect(() => {
    // Update local workout when prop changes
    if (workout) {
      console.log('[DEBUG] WorkoutActionsModal received workout prop:', workout)
      setLocalWorkout(workout)
    }
  }, [workout])
  
  useEffect(() => {
    console.log('[DEBUG] WorkoutActionsModal state changed - opened:', opened, 'workout:', workout, 'localWorkout:', localWorkout, 'assignedClients:', assignedClients)
  }, [opened, workout, localWorkout, assignedClients])

  // Use local workout if available, otherwise fall back to prop
  const displayWorkout = localWorkout || workout
  const workoutName = displayWorkout?.workout_name || displayWorkout?.workoutName || 'Untitled'
  const hasAssignedClients = assignedClients && assignedClients.length > 0
  
  console.log('[DEBUG] WorkoutActionsModal render - opened:', opened, 'workoutName:', workoutName, 'displayWorkout:', displayWorkout)
  
  return (
    <Modal opened={opened} onClose={onClose} title="What would you like to do?" size="md" centered>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Workout "{workoutName}" has been saved successfully.
        </Text>
        
        {!hasAssignedClients && (
          <Alert color="yellow">
            <Text size="sm">
              This program is not assigned to any clients yet. Assign the program to clients to schedule sessions.
            </Text>
          </Alert>
        )}
        
        <Divider />
        
        <Stack gap="xs">
          <Button
            variant="light"
            color="robinhoodGreen"
            fullWidth
            onClick={onSchedule}
            disabled={!hasAssignedClients}
            leftSection={<Text size="lg">📅</Text>}
            style={{ justifyContent: 'flex-start', height: 'auto', padding: '1rem' }}
          >
            <Stack gap={2} align="flex-start" style={{ width: '100%' }}>
              <Text fw={500}>Schedule as Session</Text>
              <Text size="xs" c="dimmed">
                {hasAssignedClients 
                  ? `Create training sessions for ${assignedClients.length} client(s)`
                  : 'Assign program to clients first'}
              </Text>
            </Stack>
          </Button>
          
          <Button
            variant="light"
            color="blue"
            fullWidth
            onClick={onCopy}
            leftSection={<Text size="lg">📋</Text>}
            style={{ justifyContent: 'flex-start', height: 'auto', padding: '1rem' }}
          >
            <Stack gap={2} align="flex-start" style={{ width: '100%' }}>
              <Text fw={500}>Copy to Another Day</Text>
              <Text size="xs" c="dimmed">Duplicate this workout to a different day/week</Text>
            </Stack>
          </Button>
          
          <Button
            variant="light"
            color="violet"
            fullWidth
            onClick={onRepeat}
            leftSection={<Text size="lg">🔄</Text>}
            style={{ justifyContent: 'flex-start', height: 'auto', padding: '1rem' }}
          >
            <Stack gap={2} align="flex-start" style={{ width: '100%' }}>
              <Text fw={500}>Repeat Workout</Text>
              <Text size="xs" c="dimmed">Repeat this workout across multiple days</Text>
            </Stack>
          </Button>
          
          <Button
            variant="light"
            color="orange"
            fullWidth
            onClick={onEdit}
            leftSection={<Text size="lg">✏️</Text>}
            style={{ justifyContent: 'flex-start', height: 'auto', padding: '1rem' }}
          >
            <Stack gap={2} align="flex-start" style={{ width: '100%' }}>
              <Text fw={500}>Edit Workout</Text>
              <Text size="xs" c="dimmed">Make changes to this workout</Text>
            </Stack>
          </Button>
        </Stack>
        
        <Divider />
        
        <Group justify="flex-end">
          <Button variant="outline" onClick={onClose}>
            Skip
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

// Copy Workout Modal Component
function CopyWorkoutModal({ opened, onClose, program, workout, onProgramUpdate, setCurrentProgram }) {
  const [loading, setLoading] = useState(false)
  const [calculatedDate, setCalculatedDate] = useState(null)
  const form = useForm({
    initialValues: {
      targetWeek: 1,
      targetDay: 1
    }
  })

  // Calculate date when week or day changes
  useEffect(() => {
    if (opened && program?.start_date && form.values.targetWeek && form.values.targetDay) {
      // Convert targetDay to number if it's a string
      const dayNum = typeof form.values.targetDay === 'string' ? parseInt(form.values.targetDay) : form.values.targetDay
      const date = calculateDateForDay(program.start_date, form.values.targetWeek, dayNum)
      setCalculatedDate(date)
    } else {
      setCalculatedDate(null)
    }
  }, [opened, program?.start_date, form.values.targetWeek, form.values.targetDay])

  // Helper function to calculate date (same as in ProgramCalendarView)
  const calculateDateForDay = (startDate, weekNumber, dayNumber) => {
    if (!startDate) return null
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    // Calculate days to add: Week 1 Day 1 = start date, Week 1 Day 2 = start + 1, etc.
    const daysToAdd = (weekNumber - 1) * 7 + (dayNumber - 1)
    const date = new Date(start)
    date.setDate(start.getDate() + daysToAdd)
    return date
  }

  const handleCopy = async (values) => {
    if (!workout || !program) return

    try {
      setLoading(true)

      // Get existing workouts
      const existingWorkouts = program.workouts || []

      // Convert targetDay to number if it's a string
      const targetDay = typeof values.targetDay === 'string' ? parseInt(values.targetDay) : values.targetDay

      // Create new workout based on the saved one
      const newWorkout = {
        workout_name: workout.workout_name || workout.workoutName || 'Copy of Workout',
        day_number: targetDay,
        week_number: values.targetWeek,
        exercises: (workout.exercises || []).map((ex, idx) => ({
          exercise_name: ex.exercise_name || ex.exerciseName || '',
          exercise_type: ex.exercise_type || ex.exerciseType || 'REGULAR',
          sets: ex.sets || null,
          reps: ex.reps || null,
          weight: ex.weight || null,
          duration: ex.duration || null,
          rest: ex.rest || null,
          tempo: ex.tempo || null,
          notes: ex.notes || null,
          order_index: idx
        }))
      }

      const updatedWorkouts = [...existingWorkouts, newWorkout]

      // Update program via API
      await api.put(`/programs/${program.id}`, {
        name: program.name,
        description: program.description,
        split_type: program.split_type,
        duration_weeks: program.duration_weeks,
        workouts: updatedWorkouts
      })

      // Refresh program data
      const response = await api.get(`/programs/${program.id}`)
      setCurrentProgram(response.data)
      
      if (onProgramUpdate) {
        onProgramUpdate(response.data)
      }

      notifications.show({
        title: 'Success',
        message: `Workout copied to Week ${values.targetWeek}, Day ${values.targetDay}`,
        color: 'green',
      })

      onClose()
    } catch (error) {
      console.error('Error copying workout:', error)
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to copy workout',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Copy Workout to Another Day" size="md">
      <form onSubmit={form.onSubmit(handleCopy)}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Select the week and day where you want to copy this workout.
          </Text>

          <NumberInput
            label="Target Week"
            description="Which week should this workout be copied to?"
            min={1}
            max={program?.duration_weeks || 12}
            required
            {...form.getInputProps('targetWeek')}
          />

          <Select
            label="Target Day"
            description="Which day of the week?"
            data={[
              { value: '1', label: 'Monday' },
              { value: '2', label: 'Tuesday' },
              { value: '3', label: 'Wednesday' },
              { value: '4', label: 'Thursday' },
              { value: '5', label: 'Friday' },
              { value: '6', label: 'Saturday' },
              { value: '7', label: 'Sunday' }
            ]}
            required
            {...form.getInputProps('targetDay')}
          />

          {calculatedDate && (
            <Paper p="sm" withBorder style={{ backgroundColor: 'var(--mantine-color-dark-6)' }}>
              <Text size="sm" fw={500} mb={4}>Calculated Date:</Text>
              <Text size="lg" c="blue">
                {calculatedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
            </Paper>
          )}

          {!program?.start_date && (
            <Alert color="yellow" size="sm">
              <Text size="xs">Program start date not set. Date calculation unavailable.</Text>
            </Alert>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" color="robinhoodGreen" loading={loading}>
              Copy Workout
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

// Repeat Workout Modal Component
function RepeatWorkoutModal({ opened, onClose, program, workout, onProgramUpdate, setCurrentProgram }) {
  const [loading, setLoading] = useState(false)
  const form = useForm({
    initialValues: {
      repeatPattern: 'weekly', // weekly, same_day_each_week
      startWeek: 1,
      endWeek: program?.duration_weeks || 4,
      dayOfWeek: workout?.day_number || 1
    }
  })

  const handleRepeat = async (values) => {
    if (!workout || !program) return

    try {
      setLoading(true)

      const existingWorkouts = program.workouts || []
      const newWorkouts = []

      if (values.repeatPattern === 'weekly') {
        // Repeat on the same day each week
        for (let week = values.startWeek; week <= values.endWeek; week++) {
          // Skip if workout already exists for this week/day
          const exists = existingWorkouts.some(w => 
            w.week_number === week && w.day_number === values.dayOfWeek
          )
          
          if (!exists) {
            newWorkouts.push({
              workout_name: workout.workout_name || workout.workoutName || 'Workout',
              day_number: values.dayOfWeek,
              week_number: week,
              exercises: (workout.exercises || []).map((ex, idx) => ({
                exercise_name: ex.exercise_name || ex.exerciseName || '',
                exercise_type: ex.exercise_type || ex.exerciseType || 'REGULAR',
                sets: ex.sets || null,
                reps: ex.reps || null,
                weight: ex.weight || null,
                duration: ex.duration || null,
                rest: ex.rest || null,
                tempo: ex.tempo || null,
                notes: ex.notes || null,
                order_index: idx
              }))
            })
          }
        }
      }

      if (newWorkouts.length === 0) {
        notifications.show({
          title: 'Info',
          message: 'No new workouts created. All selected days already have workouts.',
          color: 'blue',
        })
        onClose()
        return
      }

      const updatedWorkouts = [...existingWorkouts, ...newWorkouts]

      // Update program via API
      await api.put(`/programs/${program.id}`, {
        name: program.name,
        description: program.description,
        split_type: program.split_type,
        duration_weeks: program.duration_weeks,
        workouts: updatedWorkouts
      })

      // Refresh program data
      const response = await api.get(`/programs/${program.id}`)
      setCurrentProgram(response.data)
      
      if (onProgramUpdate) {
        onProgramUpdate(response.data)
      }

      notifications.show({
        title: 'Success',
        message: `Workout repeated ${newWorkouts.length} time(s)`,
        color: 'green',
      })

      onClose()
    } catch (error) {
      console.error('Error repeating workout:', error)
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to repeat workout',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Repeat Workout" size="md">
      <form onSubmit={form.onSubmit(handleRepeat)}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Repeat this workout across multiple weeks or days.
          </Text>

          <Select
            label="Repeat Pattern"
            description="How should this workout be repeated?"
            data={[
              { value: 'weekly', label: 'Same day each week (e.g., Every Monday)' }
            ]}
            required
            {...form.getInputProps('repeatPattern')}
          />

          <Select
            label="Day of Week"
            description="Which day should the workout repeat on?"
            data={[
              { value: '1', label: 'Monday' },
              { value: '2', label: 'Tuesday' },
              { value: '3', label: 'Wednesday' },
              { value: '4', label: 'Thursday' },
              { value: '5', label: 'Friday' },
              { value: '6', label: 'Saturday' },
              { value: '7', label: 'Sunday' }
            ]}
            required
            {...form.getInputProps('dayOfWeek')}
          />

          <Group grow>
            <NumberInput
              label="Start Week"
              min={1}
              max={program?.duration_weeks || 12}
              required
              {...form.getInputProps('startWeek')}
            />
            <NumberInput
              label="End Week"
              min={1}
              max={program?.duration_weeks || 12}
              required
              {...form.getInputProps('endWeek')}
            />
          </Group>

          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" color="robinhoodGreen" loading={loading}>
              Repeat Workout
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

export default Programs

