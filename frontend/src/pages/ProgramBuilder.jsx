import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Container,
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
  Paper,
  ScrollArea,
  Accordion
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './ProgramBuilder.css'

function ProgramBuilder() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clientId = searchParams.get('clientId')

  const [templates, setTemplates] = useState([])
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [templateViewOpened, { open: openTemplateView, close: closeTemplateView }] = useDisclosure(false)
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false)

  useEffect(() => {
    fetchTemplates()
    fetchClients()
    if (clientId) {
      handleRecommendForClient(clientId)
    }
  }, [clientId])

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/programs/templates/all')
      setTemplates(response.data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
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

  const handleRecommendForClient = async (clientId) => {
    try {
      setLoading(true)
      const response = await api.post('/programs/recommend', { client_id: parseInt(clientId) })
      setRecommendations(response.data)
      const client = clients.find(c => c.user_id === parseInt(clientId))
      setSelectedClient(client)
    } catch (error) {
      console.error('Error getting recommendations:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to get recommendations',
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewTemplate = async (templateId) => {
    try {
      const response = await api.get(`/programs/templates/${templateId}`)
      setSelectedTemplate(response.data)
      openTemplateView()
    } catch (error) {
      console.error('Error fetching template:', error)
    }
  }

  const handleCreateFromTemplate = async (templateId, clientId) => {
    try {
      const response = await api.post(`/programs/from-template/${templateId}`, {
        client_id: clientId ? parseInt(clientId) : null
      })
      notifications.show({
        title: 'Success',
        message: 'Program created from template',
        color: 'green'
      })
      navigate(`/programs?id=${response.data.id}`)
    } catch (error) {
      console.error('Error creating program:', error)
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create program',
        color: 'red'
      })
    }
  }

  if (loading && !templates.length) {
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
      <Group justify="space-between" mb="xl">
        <Title order={1}>Program Builder</Title>
        <Button onClick={() => navigate('/programs')} variant="outline">
          Back to Programs
        </Button>
      </Group>

      <Tabs defaultValue="templates">
        <Tabs.List>
          <Tabs.Tab value="templates">Templates</Tabs.Tab>
          <Tabs.Tab value="recommend">Recommend for Client</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="templates" pt="xl">
          <Stack gap="md">
            <Text c="dimmed">
              Select a program template to customize for your client. Templates are science-based
              programs designed for different experience levels and goals.
            </Text>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              {templates.map((template) => (
                <Card key={template.id} shadow="sm" padding="lg" radius="sm" withBorder>
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Title order={4}>{template.name}</Title>
                      {template.is_system_template && (
                        <Badge color="blue" variant="light">System</Badge>
                      )}
                    </Group>
                    {template.description && (
                      <Text size="sm" c="dimmed" lineClamp={3}>
                        {template.description}
                      </Text>
                    )}
                    <Group gap="xs">
                      <Badge size="sm" variant="outline">{template.split_type}</Badge>
                      <Badge size="sm" variant="outline">{template.target_experience_level}</Badge>
                      <Badge size="sm" variant="outline">{template.target_days_per_week} days/week</Badge>
                    </Group>
                    <Group gap="xs" c="dimmed" size="xs">
                      <Text size="xs">Goal: {template.target_goal?.replace('_', ' ')}</Text>
                      <Text size="xs">•</Text>
                      <Text size="xs">{template.duration_weeks} weeks</Text>
                      <Text size="xs">•</Text>
                      <Text size="xs">{template.workout_count || 0} workouts</Text>
                    </Group>
                    <Group justify="space-between" mt="auto">
                      <Button
                        variant="light"
                        size="sm"
                        onClick={() => handleViewTemplate(template.id)}
                      >
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          openCreate()
                          setSelectedTemplate(template)
                        }}
                      >
                        Use Template
                      </Button>
                    </Group>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="recommend" pt="xl">
          <Stack gap="md">
            <Paper p="md" withBorder>
              <Stack gap="md">
                <Select
                  label="Select Client"
                  placeholder="Choose a client to get program recommendations"
                  data={clients.map(c => ({ value: c.user_id.toString(), label: c.name }))}
                  searchable
                  onChange={(value) => {
                    if (value) {
                      handleRecommendForClient(value)
                    }
                  }}
                />
                {selectedClient && (
                  <Alert color="blue">
                    <Text size="sm">
                      Getting recommendations for <strong>{selectedClient.name}</strong>
                    </Text>
                  </Alert>
                )}
              </Stack>
            </Paper>

            {recommendations && (
              <Stack gap="md">
                <Paper p="md" withBorder>
                  <Title order={3} mb="md">Client Profile</Title>
                  <SimpleGrid cols={2} spacing="md">
                    <div>
                      <Text size="xs" c="dimmed">Experience Level</Text>
                      <Text fw={500}>{recommendations.client_profile.experience_level}</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">Primary Goal</Text>
                      <Text fw={500}>{recommendations.client_profile.goal?.replace('_', ' ')}</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">Days Per Week</Text>
                      <Text fw={500}>{recommendations.client_profile.days_per_week}</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">Equipment</Text>
                      <Text fw={500}>{recommendations.client_profile.equipment?.replace('_', ' ')}</Text>
                    </div>
                  </SimpleGrid>
                </Paper>

                <Title order={3}>Recommended Programs</Title>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                  {recommendations.recommendations.map((rec, idx) => (
                    <Card key={rec.id} shadow="sm" padding="lg" radius="sm" withBorder>
                      <Stack gap="sm">
                        <Group justify="space-between">
                          <Title order={4}>{rec.name}</Title>
                          <Badge color={idx === 0 ? 'green' : idx === 1 ? 'blue' : 'gray'}>
                            {rec.match_score}% Match
                          </Badge>
                        </Group>
                        {rec.description && (
                          <Text size="sm" c="dimmed" lineClamp={2}>
                            {rec.description}
                          </Text>
                        )}
                        <Group gap="xs">
                          <Badge size="sm" variant="outline">{rec.split_type}</Badge>
                          <Badge size="sm" variant="outline">{rec.target_experience_level}</Badge>
                        </Group>
                        <Group justify="space-between" mt="auto">
                          <Button
                            variant="light"
                            size="sm"
                            onClick={() => handleViewTemplate(rec.id)}
                          >
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              openCreate()
                              setSelectedTemplate(rec)
                            }}
                          >
                            Use This Template
                          </Button>
                        </Group>
                      </Stack>
                    </Card>
                  ))}
                </SimpleGrid>
              </Stack>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          opened={templateViewOpened}
          onClose={closeTemplateView}
        />
      )}

      {/* Create Program from Template Modal */}
      {selectedTemplate && (
        <CreateFromTemplateModal
          template={selectedTemplate}
          clients={clients}
          opened={createOpened}
          onClose={closeCreate}
          onSuccess={(programId) => navigate(`/programs?id=${programId}`)}
        />
      )}
    </Container>
  )
}

// Template Preview Modal
function TemplatePreviewModal({ template, opened, onClose }) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={template.name}
      size="xl"
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack gap="md">
        {template.description && (
          <Text c="dimmed">{template.description}</Text>
        )}
        <Group gap="xs">
          <Badge>{template.split_type}</Badge>
          <Badge>{template.target_experience_level}</Badge>
          <Badge>{template.duration_weeks} weeks</Badge>
        </Group>

        <Divider label="Workouts" />

        <Accordion>
          {template.workouts?.map((workout, idx) => (
            <Accordion.Item key={workout.id || idx} value={workout.id?.toString() || idx.toString()}>
              <Accordion.Control>
                <Group>
                  <Text fw={500}>{workout.workout_name}</Text>
                  <Badge size="sm" variant="light">
                    Week {workout.week_number}, Day {workout.day_number}
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="xs">
                  {workout.exercises?.map((ex, exIdx) => (
                    <Paper key={exIdx} p="xs" withBorder>
                      <Group justify="space-between">
                        <Text fw={500}>{ex.exercise_name}</Text>
                        <Group gap="xs">
                          {ex.sets && <Badge size="xs">{ex.sets} sets</Badge>}
                          {ex.reps && <Badge size="xs">{ex.reps} reps</Badge>}
                          {ex.rest && <Badge size="xs" variant="outline">{ex.rest} rest</Badge>}
                        </Group>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Stack>
    </Modal>
  )
}

// Create From Template Modal
function CreateFromTemplateModal({ template, clients, opened, onClose, onSuccess }) {
  const form = useForm({
    initialValues: {
      name: template.name,
      description: template.description || '',
      client_id: ''
    }
  })

  const handleSubmit = async (values) => {
    try {
      const response = await api.post(`/programs/from-template/${template.id}`, {
        client_id: values.client_id ? parseInt(values.client_id) : null,
        name: values.name,
        description: values.description
      })
      notifications.show({
        title: 'Success',
        message: 'Program created successfully',
        color: 'green'
      })
      onSuccess(response.data.id)
      onClose()
    } catch (error) {
      console.error('Error creating program:', error)
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create program',
        color: 'red'
      })
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Create Program from Template" size="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Program Name"
            required
            {...form.getInputProps('name')}
          />
          <Textarea
            label="Description"
            {...form.getInputProps('description')}
          />
          <Select
            label="Assign to Client (Optional)"
            placeholder="Leave empty to create as template"
            data={clients.map(c => ({ value: c.user_id.toString(), label: c.name }))}
            searchable
            clearable
            {...form.getInputProps('client_id')}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" color="robinhoodGreen">Create Program</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

export default ProgramBuilder

