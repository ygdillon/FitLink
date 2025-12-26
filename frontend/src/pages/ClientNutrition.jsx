import { useState, useEffect } from 'react'
import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Grid,
  Progress,
  Loader,
  Paper,
  Group,
  Button,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Tabs,
  Table,
  Badge,
  ActionIcon,
  SimpleGrid,
  Divider
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './ClientNutrition.css'

function ClientNutrition({ clientId, clientName }) {
  const { user } = useAuth()
  const [nutritionPlan, setNutritionPlan] = useState(null)
  const [nutritionLogs, setNutritionLogs] = useState([])
  const [foods, setFoods] = useState([])
  const [loading, setLoading] = useState(true)
  const [logModalOpened, { open: openLogModal, close: closeLogModal }] = useDisclosure(false)
  const [searchFood, setSearchFood] = useState('')
  
  // Determine if this is trainer view (has clientId prop) or client view
  const isTrainerView = !!clientId
  const targetUserId = clientId || user?.id

  const logForm = useForm({
    initialValues: {
      log_date: new Date().toISOString().split('T')[0],
      meal_type: 'breakfast',
      food_name: '',
      quantity: '',
      unit: 'g',
      calories: '',
      protein: '',
      carbs: '',
      fats: ''
    }
  })

  useEffect(() => {
    if (targetUserId) {
      fetchNutritionData()
    }
  }, [targetUserId])

  const fetchNutritionData = async () => {
    try {
      setLoading(true)
      
      // Fetch active nutrition plan
      if (isTrainerView && clientId) {
        // For trainer view, fetch client's plans and get the active one
        // clientId here is the client table id, we need to get user_id first
        try {
          // First get the client to find their user_id
          const clientRes = await api.get(`/trainer/clients/${clientId}`).catch(() => ({ data: null }))
          console.log('Client data for nutrition plan:', clientRes.data)
          
          if (clientRes.data?.user_id) {
            const userId = clientRes.data.user_id
            console.log('Fetching nutrition plans for user_id:', userId)
            
            // Fetch all plans for this client and find the active one
            const plansRes = await api.get(`/nutrition/plans/client/${userId}`).catch(() => ({ data: [] }))
            console.log('Nutrition plans response:', plansRes.data)
            
            // Find active plan, or use the most recent one if no active plan
            const activePlan = plansRes.data?.find(p => p.is_active) || plansRes.data?.[0] || null
            console.log('Selected nutrition plan:', activePlan)
            setNutritionPlan(activePlan)
          } else {
            console.warn('No user_id found for client:', clientId)
            setNutritionPlan(null)
          }
        } catch (error) {
          console.error('Error fetching client nutrition plan:', error)
          setNutritionPlan(null)
        }
      } else {
        // For client view, use the active endpoint
        const planRes = await api.get('/nutrition/plans/active').catch(() => ({ data: null }))
        setNutritionPlan(planRes.data)
      }

      // Fetch nutrition logs
      const logsRes = await api.get('/nutrition/logs').catch(() => ({ data: [] }))
      setNutritionLogs(logsRes.data || [])
    } catch (error) {
      console.error('Error fetching nutrition data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchFoods = async (searchTerm) => {
    if (searchTerm.length < 2) {
      setFoods([])
      return
    }

    try {
      const response = await api.get('/nutrition/foods/search', {
        params: { search: searchTerm }
      })
      setFoods(response.data || [])
    } catch (error) {
      console.error('Error searching foods:', error)
    }
  }

  const handleSelectFood = (food) => {
    logForm.setValues({
      ...logForm.values,
      food_name: food.name,
      quantity: food.serving_size,
      unit: food.serving_unit,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fats: food.fats
    })
    setFoods([])
    setSearchFood('')
  }

  const handleSubmitLog = async () => {
    try {
      await api.post('/nutrition/logs', logForm.values)
      
      notifications.show({
        title: 'Success',
        message: 'Food logged successfully',
        color: 'green'
      })

      closeLogModal()
      logForm.reset()
      fetchNutritionData()
    } catch (error) {
      console.error('Error logging food:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to log food',
        color: 'red'
      })
    }
  }

  const handleDeleteLog = async (logId) => {
    try {
      await api.delete(`/nutrition/logs/${logId}`)
      notifications.show({
        title: 'Success',
        message: 'Log deleted',
        color: 'green'
      })
      fetchNutritionData()
    } catch (error) {
      console.error('Error deleting log:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to delete log',
        color: 'red'
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

  // Calculate today's totals from logs
  const today = new Date().toISOString().split('T')[0]
  const todayLogs = nutritionLogs.filter(log => log.log_date === today)
  const todayTotals = todayLogs.reduce((acc, log) => ({
    calories: acc.calories + (parseFloat(log.calories) || 0),
    protein: acc.protein + (parseFloat(log.protein) || 0),
    carbs: acc.carbs + (parseFloat(log.carbs) || 0),
    fats: acc.fats + (parseFloat(log.fats) || 0)
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 })

  // Get targets from nutrition plan or fallback to goals
  const targets = nutritionPlan ? {
    calories: nutritionPlan.daily_calories,
    protein: nutritionPlan.daily_protein,
    carbs: nutritionPlan.daily_carbs,
    fats: nutritionPlan.daily_fats
  } : null

  // Group logs by meal type
  const logsByMeal = todayLogs.reduce((acc, log) => {
    const meal = log.meal_type || 'other'
    if (!acc[meal]) acc[meal] = []
    acc[meal].push(log)
    return acc
  }, {})

  return (
    <Container size="xl" py="xl">
      {!isTrainerView && <Title order={1} mb="xl">My Nutrition</Title>}

      {targets ? (
        <Tabs defaultValue="overview">
          <Tabs.List>
            <Tabs.Tab value="overview">Overview</Tabs.Tab>
            <Tabs.Tab value="meal-plan">Meal Plan</Tabs.Tab>
            <Tabs.Tab value="log">Food Log</Tabs.Tab>
            <Tabs.Tab value="history">History</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" pt="xl">
            <Stack gap="xl">
              {/* Daily Goals */}
              <Paper p="md" withBorder>
                <Title order={3} mb="md">Daily Goals</Title>
                <SimpleGrid cols={4} spacing="md">
                  <Card withBorder>
                    <Text size="sm" c="dimmed" mb="xs">Calories</Text>
                    <Text size="xl" fw={700}>{targets.calories} kcal</Text>
                  </Card>
                  <Card withBorder>
                    <Text size="sm" c="dimmed" mb="xs">Protein</Text>
                    <Text size="xl" fw={700}>{targets.protein} g</Text>
                  </Card>
                  <Card withBorder>
                    <Text size="sm" c="dimmed" mb="xs">Carbs</Text>
                    <Text size="xl" fw={700}>{targets.carbs} g</Text>
                  </Card>
                  <Card withBorder>
                    <Text size="sm" c="dimmed" mb="xs">Fats</Text>
                    <Text size="xl" fw={700}>{targets.fats} g</Text>
                  </Card>
                </SimpleGrid>
              </Paper>

              {/* Today's Progress */}
              <Paper p="md" withBorder>
                <Group justify="space-between" mb="md">
                  <Title order={3}>Today's Progress</Title>
                  {!isTrainerView && (
                    <Button leftSection={<IconPlus size={16} />} onClick={openLogModal}>
                      Log Food
                    </Button>
                  )}
                </Group>
                <Stack gap="md">
                  <div>
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={500}>Calories</Text>
                      <Text size="sm">
                        {todayTotals.calories.toFixed(0)} / {targets.calories} kcal
                        ({((todayTotals.calories / targets.calories) * 100).toFixed(0)}%)
                      </Text>
                    </Group>
                    <Progress 
                      value={Math.min(100, (todayTotals.calories / targets.calories) * 100)} 
                      color="green"
                      size="lg"
                    />
                  </div>
                  <div>
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={500}>Protein</Text>
                      <Text size="sm">
                        {todayTotals.protein.toFixed(1)} / {targets.protein} g
                        ({((todayTotals.protein / targets.protein) * 100).toFixed(0)}%)
                      </Text>
                    </Group>
                    <Progress 
                      value={Math.min(100, (todayTotals.protein / targets.protein) * 100)} 
                      color="blue"
                      size="lg"
                    />
                  </div>
                  <div>
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={500}>Carbs</Text>
                      <Text size="sm">
                        {todayTotals.carbs.toFixed(1)} / {targets.carbs} g
                        ({((todayTotals.carbs / targets.carbs) * 100).toFixed(0)}%)
                      </Text>
                    </Group>
                    <Progress 
                      value={Math.min(100, (todayTotals.carbs / targets.carbs) * 100)} 
                      color="orange"
                      size="lg"
                    />
                  </div>
                  <div>
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={500}>Fats</Text>
                      <Text size="sm">
                        {todayTotals.fats.toFixed(1)} / {targets.fats} g
                        ({((todayTotals.fats / targets.fats) * 100).toFixed(0)}%)
                      </Text>
                    </Group>
                    <Progress 
                      value={Math.min(100, (todayTotals.fats / targets.fats) * 100)} 
                      color="yellow"
                      size="lg"
                    />
                  </div>
                </Stack>
              </Paper>

              {/* Today's Meals */}
              {Object.keys(logsByMeal).length > 0 && (
                <Paper p="md" withBorder>
                  <Title order={3} mb="md">Today's Meals</Title>
                  <Stack gap="md">
                    {Object.entries(logsByMeal).map(([mealType, logs]) => (
                      <div key={mealType}>
                        <Text fw={600} mb="xs" tt="capitalize">{mealType}</Text>
                        <Table>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Food</Table.Th>
                              <Table.Th>Amount</Table.Th>
                              <Table.Th>Calories</Table.Th>
                              <Table.Th>Protein</Table.Th>
                              <Table.Th>Carbs</Table.Th>
                              <Table.Th>Fats</Table.Th>
                              {!isTrainerView && <Table.Th>Actions</Table.Th>}
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {logs.map(log => (
                              <Table.Tr key={log.id}>
                                <Table.Td>{log.food_name}</Table.Td>
                                <Table.Td>{log.quantity} {log.unit}</Table.Td>
                                <Table.Td>{log.calories}</Table.Td>
                                <Table.Td>{log.protein}g</Table.Td>
                                <Table.Td>{log.carbs}g</Table.Td>
                                <Table.Td>{log.fats}g</Table.Td>
                                {!isTrainerView && (
                                  <Table.Td>
                                    <ActionIcon
                                      color="red"
                                      variant="light"
                                      onClick={() => handleDeleteLog(log.id)}
                                    >
                                      <IconTrash size={16} />
                                    </ActionIcon>
                                  </Table.Td>
                                )}
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      </div>
                    ))}
                  </Stack>
                </Paper>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="meal-plan" pt="xl">
            {nutritionPlan?.meals && nutritionPlan.meals.length > 0 ? (
              <Paper p="md" withBorder>
                <Title order={3} mb="md">Weekly Meal Plan</Title>
                <Text size="sm" c="dimmed" mb="md">
                  Approach: {nutritionPlan.nutrition_approach?.replace('_', ' ').toUpperCase()}
                </Text>
                
                <Stack gap="lg">
                  {[1, 2, 3, 4, 5, 6, 7].map(dayNum => {
                    const dayMeals = nutritionPlan.meals.filter(m => m.day_number === dayNum)
                    if (dayMeals.length === 0) return null

                    return (
                      <div key={dayNum}>
                        <Text fw={600} mb="sm">
                          Day {dayNum} - {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayNum - 1]}
                        </Text>
                        <Stack gap="sm">
                          {dayMeals.map(meal => (
                            <Card key={meal.id} withBorder p="sm">
                              <Group justify="space-between" mb="xs">
                                <Text fw={500}>{meal.meal_name} {meal.meal_time && `(${meal.meal_time})`}</Text>
                                <Badge>
                                  {meal.target_calories} kcal | P:{meal.target_protein}g C:{meal.target_carbs}g F:{meal.target_fats}g
                                </Badge>
                              </Group>
                              {meal.foods && meal.foods.length > 0 && (
                                <Text size="sm" c="dimmed">
                                  {meal.foods.map(f => `${f.food_name} (${f.quantity}${f.unit})`).join(', ')}
                                </Text>
                              )}
                            </Card>
                          ))}
                        </Stack>
                      </div>
                    )
                  })}
                </Stack>
              </Paper>
            ) : (
              <Paper p="xl" withBorder>
                <Stack gap="xs" align="center">
                  <Text c="dimmed">No meal plan structure available</Text>
                  <Text size="sm" c="dimmed">
                    Your plan uses {nutritionPlan.nutrition_approach?.replace('_', ' ')} approach
                  </Text>
                </Stack>
              </Paper>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="log" pt="xl">
            <Paper p="md" withBorder>
              <Group justify="space-between" mb="md">
                <Title order={3}>Food Log</Title>
                {!isTrainerView && (
                  <Button leftSection={<IconPlus size={16} />} onClick={openLogModal}>
                    Add Food
                  </Button>
                )}
              </Group>
              {todayLogs.length === 0 ? (
                <Text c="dimmed" ta="center" py="xl">
                  No foods logged today. Start logging to track your nutrition!
                </Text>
              ) : (
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Time</Table.Th>
                      <Table.Th>Meal</Table.Th>
                      <Table.Th>Food</Table.Th>
                      <Table.Th>Amount</Table.Th>
                      <Table.Th>Calories</Table.Th>
                      <Table.Th>Protein</Table.Th>
                      <Table.Th>Carbs</Table.Th>
                      <Table.Th>Fats</Table.Th>
                      {!isTrainerView && <Table.Th>Actions</Table.Th>}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {todayLogs.map(log => (
                      <Table.Tr key={log.id}>
                        <Table.Td>
                          {new Date(log.created_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </Table.Td>
                        <Table.Td>
                          <Badge size="sm" tt="capitalize">
                            {log.meal_type || 'other'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{log.food_name}</Table.Td>
                        <Table.Td>{log.quantity} {log.unit}</Table.Td>
                        <Table.Td>{log.calories}</Table.Td>
                        <Table.Td>{log.protein}g</Table.Td>
                        <Table.Td>{log.carbs}g</Table.Td>
                        <Table.Td>{log.fats}g</Table.Td>
                        {!isTrainerView && (
                          <Table.Td>
                            <ActionIcon
                              color="red"
                              variant="light"
                              onClick={() => handleDeleteLog(log.id)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Table.Td>
                        )}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="history" pt="xl">
            <Paper p="md" withBorder>
              <Title order={3} mb="md">Nutrition History</Title>
              <Text size="sm" c="dimmed" mb="md">
                View your nutrition logs over time
              </Text>
              {/* History view can be expanded with charts/graphs */}
              <Text c="dimmed" ta="center" py="xl">
                History view coming soon
              </Text>
            </Paper>
          </Tabs.Panel>
        </Tabs>
      ) : (
        <Paper p="xl" withBorder>
          <Stack gap="xs" align="center">
            <Text c="dimmed">No active nutrition plan</Text>
            {isTrainerView ? (
              <Text size="sm" c="dimmed">
                Create a nutrition plan for this client using the Nutrition Builder
              </Text>
            ) : (
              <Text size="sm" c="dimmed">
                Your trainer will create a nutrition plan for you
              </Text>
            )}
          </Stack>
        </Paper>
      )}

      {/* Log Food Modal */}
      <Modal
        opened={logModalOpened}
        onClose={closeLogModal}
        title="Log Food"
        size="lg"
      >
        <Stack gap="md">
          <Select
            label="Meal Type"
            data={[
              { value: 'breakfast', label: 'Breakfast' },
              { value: 'lunch', label: 'Lunch' },
              { value: 'dinner', label: 'Dinner' },
              { value: 'snack', label: 'Snack' }
            ]}
            {...logForm.getInputProps('meal_type')}
          />

          <div>
            <TextInput
              label="Search Food"
              placeholder="Type to search..."
              value={searchFood}
              onChange={(e) => {
                setSearchFood(e.target.value)
                handleSearchFoods(e.target.value)
              }}
            />
            {foods.length > 0 && (
              <Paper p="xs" withBorder mt="xs" style={{ maxHeight: 200, overflow: 'auto' }}>
                <Stack gap="xs">
                  {foods.slice(0, 10).map(food => (
                    <Card
                      key={food.id}
                      p="xs"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSelectFood(food)}
                      withBorder
                    >
                      <Group justify="space-between">
                        <div>
                          <Text size="sm" fw={500}>{food.name}</Text>
                          <Text size="xs" c="dimmed">
                            {food.calories} kcal | P:{food.protein}g C:{food.carbs}g F:{food.fats}g
                          </Text>
                        </div>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              </Paper>
            )}
          </div>

          <TextInput
            label="Food Name"
            {...logForm.getInputProps('food_name')}
            required
          />

          <Group grow>
            <NumberInput
              label="Quantity"
              {...logForm.getInputProps('quantity')}
              min={0}
              required
            />
            <Select
              label="Unit"
              data={[
                { value: 'g', label: 'g' },
                { value: 'oz', label: 'oz' },
                { value: 'cup', label: 'cup' },
                { value: 'piece', label: 'piece' },
                { value: 'tbsp', label: 'tbsp' }
              ]}
              {...logForm.getInputProps('unit')}
            />
          </Group>

          <SimpleGrid cols={4}>
            <NumberInput
              label="Calories"
              {...logForm.getInputProps('calories')}
              min={0}
            />
            <NumberInput
              label="Protein (g)"
              {...logForm.getInputProps('protein')}
              min={0}
            />
            <NumberInput
              label="Carbs (g)"
              {...logForm.getInputProps('carbs')}
              min={0}
            />
            <NumberInput
              label="Fats (g)"
              {...logForm.getInputProps('fats')}
              min={0}
            />
          </SimpleGrid>

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={closeLogModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmitLog}>
              Log Food
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}

export default ClientNutrition
