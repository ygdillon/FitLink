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
  Divider,
  RingProgress,
  Tooltip,
  Center,
  Box,
  Flex
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useDisclosure } from '@mantine/hooks'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { 
  IconPlus, 
  IconTrash, 
  IconFlame, 
  IconMeat, 
  IconBread, 
  IconCheese,
  IconTrendingUp,
  IconTrendingDown,
  IconCalendar,
  IconSearch,
  IconClock
} from '@tabler/icons-react'
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
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [historyData, setHistoryData] = useState([])
  const [weeklySummary, setWeeklySummary] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [logModalTab, setLogModalTab] = useState('search')
  const [recentFoods, setRecentFoods] = useState([])
  const [weeklyMealData, setWeeklyMealData] = useState(null)
  const [recommendedMeals, setRecommendedMeals] = useState({ assigned: [], flexible: {} })
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    return monday
  })
  
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
      fetchWeeklySummary()
    }
  }, [targetUserId])

  useEffect(() => {
    if (targetUserId && activeTab === 'history') {
      fetchHistoryData()
    }
    if (targetUserId && activeTab === 'meals') {
      fetchWeeklyMealData()
      fetchRecommendedMeals()
    }
  }, [targetUserId, activeTab, currentWeekStart])

  const fetchNutritionData = async () => {
    try {
      setLoading(true)
      
      // Fetch active nutrition plan
      if (isTrainerView && clientId) {
        try {
          const clientRes = await api.get(`/trainer/clients/${clientId}`).catch(() => ({ data: null }))
          
          if (clientRes.data?.user_id) {
            const userId = clientRes.data.user_id
            const plansRes = await api.get(`/nutrition/plans/client/${userId}`).catch(() => ({ data: [] }))
            const activePlan = plansRes.data?.find(p => p.is_active) || plansRes.data?.[0] || null
            setNutritionPlan(activePlan)
          } else {
            setNutritionPlan(null)
          }
        } catch (error) {
          console.error('Error fetching client nutrition plan:', error)
          setNutritionPlan(null)
        }
      } else {
        const planRes = await api.get('/nutrition/plans/active').catch(() => ({ data: null }))
        setNutritionPlan(planRes.data)
      }

      // Fetch nutrition logs
      const logsRes = await api.get('/nutrition/logs').catch(() => ({ data: [] }))
      setNutritionLogs(logsRes.data || [])
      
      // Fetch recent foods (last 10 unique foods logged)
      const recent = logsRes.data
        ?.map(log => log.food_name)
        .filter((name, index, self) => self.indexOf(name) === index)
        .slice(0, 10) || []
      setRecentFoods(recent)
    } catch (error) {
      console.error('Error fetching nutrition data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWeeklySummary = async () => {
    try {
      const today = new Date()
      const weekAgo = new Date(today)
      weekAgo.setDate(today.getDate() - 7)
      
      const totalsRes = await api.get('/nutrition/logs/totals', {
        params: {
          start_date: weekAgo.toISOString().split('T')[0],
          end_date: today.toISOString().split('T')[0]
        }
      }).catch(() => ({ data: [] }))
      
      if (totalsRes.data && totalsRes.data.length > 0) {
        const totals = totalsRes.data.reduce((acc, day) => ({
          calories: acc.calories + parseFloat(day.total_calories || 0),
          protein: acc.protein + parseFloat(day.total_protein || 0),
          carbs: acc.carbs + parseFloat(day.total_carbs || 0),
          fats: acc.fats + parseFloat(day.total_fats || 0),
          days: acc.days + 1
        }), { calories: 0, protein: 0, carbs: 0, fats: 0, days: 0 })
        
        setWeeklySummary({
          avgCalories: totals.days > 0 ? totals.calories / totals.days : 0,
          avgProtein: totals.days > 0 ? totals.protein / totals.days : 0,
          avgCarbs: totals.days > 0 ? totals.carbs / totals.days : 0,
          avgFats: totals.days > 0 ? totals.fats / totals.days : 0,
          daysLogged: totals.days
        })
      }
    } catch (error) {
      console.error('Error fetching weekly summary:', error)
    }
  }

  const fetchHistoryData = async () => {
    try {
      const today = new Date()
      const monthAgo = new Date(today)
      monthAgo.setDate(today.getDate() - 30)
      
      const totalsRes = await api.get('/nutrition/logs/totals', {
        params: {
          start_date: monthAgo.toISOString().split('T')[0],
          end_date: today.toISOString().split('T')[0]
        }
      }).catch(() => ({ data: [] }))
      
      setHistoryData(totalsRes.data || [])
    } catch (error) {
      console.error('Error fetching history data:', error)
    }
  }

  const fetchWeeklyMealData = async () => {
    try {
      const weekStartStr = currentWeekStart.toISOString().split('T')[0]
      const result = await api.get('/nutrition/meals/weekly', {
        params: { week_start: weekStartStr }
      }).catch(() => ({ data: null }))
      
      setWeeklyMealData(result.data)
    } catch (error) {
      console.error('Error fetching weekly meal data:', error)
    }
  }

  const fetchRecommendedMeals = async () => {
    try {
      const result = await api.get('/nutrition/meals/recommended').catch(() => ({ data: { assigned: [], flexible: {} } }))
      setRecommendedMeals(result.data)
    } catch (error) {
      console.error('Error fetching recommended meals:', error)
    }
  }

  const handleSelectMeal = async (meal, mealSlot) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      await api.post('/nutrition/meals/select', {
        recommendation_id: meal.id,
        recipe_id: meal.recipe_id,
        selected_date: today,
        meal_category: meal.meal_category,
        meal_slot: mealSlot,
        servings: 1.0
      })
      
      notifications.show({
        title: 'Success',
        message: 'Meal added to your plan',
        color: 'green'
      })
      
      fetchWeeklyMealData()
      fetchRecommendedMeals()
    } catch (error) {
      console.error('Error selecting meal:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to add meal',
        color: 'red'
      })
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
      food_name: food.name || food,
      quantity: food.serving_size || '',
      unit: food.serving_unit || 'g',
      calories: food.calories || '',
      protein: food.protein || '',
      carbs: food.carbs || '',
      fats: food.fats || ''
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
      setLogModalTab('search')
      fetchNutritionData()
      fetchWeeklySummary()
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
      fetchWeeklySummary()
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

  // Calculate selected date totals from logs
  const selectedDateStr = selectedDate.toISOString().split('T')[0]
  const selectedDateLogs = nutritionLogs.filter(log => log.log_date === selectedDateStr)
  const selectedDateTotals = selectedDateLogs.reduce((acc, log) => ({
    calories: acc.calories + (parseFloat(log.calories) || 0),
    protein: acc.protein + (parseFloat(log.protein) || 0),
    carbs: acc.carbs + (parseFloat(log.carbs) || 0),
    fats: acc.fats + (parseFloat(log.fats) || 0)
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 })

  // Use today's date for dashboard, selected date for log tab
  const today = new Date().toISOString().split('T')[0]
  const todayLogs = nutritionLogs.filter(log => log.log_date === today)
  const todayTotals = todayLogs.reduce((acc, log) => ({
    calories: acc.calories + (parseFloat(log.calories) || 0),
    protein: acc.protein + (parseFloat(log.protein) || 0),
    carbs: acc.carbs + (parseFloat(log.carbs) || 0),
    fats: acc.fats + (parseFloat(log.fats) || 0)
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 })

  // Get targets from nutrition plan
  const targets = nutritionPlan ? {
    calories: nutritionPlan.daily_calories,
    protein: nutritionPlan.daily_protein,
    carbs: nutritionPlan.daily_carbs,
    fats: nutritionPlan.daily_fats
  } : null

  // Calculate percentages
  const getPercentage = (consumed, target) => {
    if (!target || target === 0) return 0
    return Math.min(100, (consumed / target) * 100)
  }

  const getRemaining = (consumed, target) => {
    return Math.max(0, target - consumed)
  }

  const getOver = (consumed, target) => {
    return Math.max(0, consumed - target)
  }

  // Group logs by meal type
  const logsByMeal = todayLogs.reduce((acc, log) => {
    const meal = log.meal_type || 'other'
    if (!acc[meal]) acc[meal] = []
    acc[meal].push(log)
    return acc
  }, {})

  // Calculate meal totals
  const getMealTotals = (logs) => {
    return logs.reduce((acc, log) => ({
      calories: acc.calories + (parseFloat(log.calories) || 0),
      protein: acc.protein + (parseFloat(log.protein) || 0),
      carbs: acc.carbs + (parseFloat(log.carbs) || 0),
      fats: acc.fats + (parseFloat(log.fats) || 0)
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 })
  }

  // Macro Stat Card Component
  const MacroStatCard = ({ label, consumed, target, unit, color, icon: Icon, trend }) => {
    const percentage = getPercentage(consumed, target)
    const remaining = getRemaining(consumed, target)
    const over = getOver(consumed, target)
    const isOver = consumed > target
    const consumedRounded = Math.round(consumed)
    const targetRounded = Math.round(target)
    const remainingRounded = Math.round(remaining)
    const overRounded = Math.round(over)

    return (
      <Card withBorder p="sm" style={{ height: '100%' }}>
        <Group gap="md" align="center" wrap="nowrap">
          <Box style={{ flexShrink: 0 }}>
            <RingProgress
              size={70}
              thickness={7}
              sections={[{ value: percentage, color: color }]}
              styles={{
                root: {
                  '--rp-color': color,
                }
              }}
              label={
                <Center>
                  <Icon size={20} color={color} />
                </Center>
              }
            />
          </Box>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4} lh={1.2}>
              {label}
            </Text>
            <Text size="lg" fw={700} lh={1.2} mb={4}>
              {consumedRounded} / {targetRounded} {unit}
            </Text>
            {isOver ? (
              <Text size="xs" c="red" fw={500} lh={1.3}>
                {overRounded} {unit} Over
              </Text>
            ) : (
              <Text size="xs" c="dimmed" fw={500} lh={1.3}>
                {remainingRounded} {unit} Remaining
              </Text>
            )}
          </Box>
        </Group>
      </Card>
    )
  }

  return (
    <Container size="xl" py="xl">
      {!isTrainerView && <Title order={1} mb="xl">My Nutrition</Title>}

      {targets ? (
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="dashboard">Dashboard</Tabs.Tab>
            <Tabs.Tab value="meals">Meals</Tabs.Tab>
            <Tabs.Tab value="log">Food Log</Tabs.Tab>
            <Tabs.Tab value="history">Progress</Tabs.Tab>
          </Tabs.List>

          {/* Dashboard Tab */}
          <Tabs.Panel value="dashboard" pt="xl">
            <Stack gap="xl">
              {/* Ring Progress Stats */}
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
                <Tooltip label="Basal Metabolic Rate - calories your body burns at rest">
                  <MacroStatCard
                    label="CALORIE"
                    consumed={todayTotals.calories}
                    target={targets.calories}
                    unit="cal"
                    color={todayTotals.calories > targets.calories ? 'red' : 'green'}
                    icon={IconFlame}
                  />
                </Tooltip>
                <Tooltip label="Essential for muscle repair and growth">
                  <MacroStatCard
                    label="PROTEIN"
                    consumed={todayTotals.protein}
                    target={targets.protein}
                    unit="g"
                    color="blue"
                    icon={IconMeat}
                  />
                </Tooltip>
                <Tooltip label="Primary energy source for your body">
                  <MacroStatCard
                    label="CARBS"
                    consumed={todayTotals.carbs}
                    target={targets.carbs}
                    unit="g"
                    color="orange"
                    icon={IconBread}
                  />
                </Tooltip>
                <Tooltip label="Important for hormone production and nutrient absorption">
                  <MacroStatCard
                    label="FATS"
                    consumed={todayTotals.fats}
                    target={targets.fats}
                    unit="g"
                    color="yellow"
                    icon={IconCheese}
                  />
                </Tooltip>
              </SimpleGrid>

              {/* Today's Meals Breakdown */}
              <Paper p="md" withBorder>
                <Group justify="space-between" mb="md">
                  <Title order={3}>Today's Meals</Title>
                  {!isTrainerView && (
                    <Button 
                      leftSection={<IconPlus size={16} />} 
                      onClick={openLogModal}
                      size="sm"
                    >
                      Add Food
                    </Button>
                  )}
                </Group>
                <Stack gap="md">
                  {['breakfast', 'lunch', 'dinner', 'snack'].map(mealType => {
                    const mealLogs = logsByMeal[mealType] || []
                    const mealTotals = getMealTotals(mealLogs)
                    
                    return (
                      <Card key={mealType} withBorder p="md">
                        <Group justify="space-between" mb="sm">
                          <Group gap="xs">
                            <Text fw={600} tt="capitalize">{mealType}</Text>
                            {mealLogs.length > 0 && (
                              <Badge size="sm" variant="light">
                                {mealLogs.length} {mealLogs.length === 1 ? 'item' : 'items'}
                              </Badge>
                            )}
                          </Group>
                          {mealLogs.length > 0 && (
                            <Text size="sm" c="dimmed">
                              {Math.round(mealTotals.calories).toFixed(0)} cal | 
                              P: {Math.round(mealTotals.protein).toFixed(0)}g | 
                              C: {Math.round(mealTotals.carbs).toFixed(0)}g | 
                              F: {Math.round(mealTotals.fats).toFixed(0)}g
                            </Text>
                          )}
                        </Group>
                        {mealLogs.length === 0 ? (
                          <Text size="sm" c="dimmed" py="sm">
                            No foods logged yet. Click "Add Food" to get started.
                          </Text>
                        ) : (
                          <Stack gap="xs">
                            {mealLogs.map(log => (
                              <Group key={log.id} justify="space-between" p="xs" style={{ borderRadius: '4px' }}>
                                <Box style={{ flex: 1 }}>
                                  <Text size="sm" fw={500}>{log.food_name}</Text>
                                  <Text size="xs" c="dimmed">
                                    {log.quantity} {log.unit} • {log.calories} cal
                                  </Text>
                                </Box>
                                <Group gap="xs">
                                  <Text size="xs" c="dimmed">
                                    P:{log.protein}g C:{log.carbs}g F:{log.fats}g
                                  </Text>
                                  {!isTrainerView && (
                                    <ActionIcon
                                      color="red"
                                      variant="light"
                                      size="sm"
                                      onClick={() => handleDeleteLog(log.id)}
                                    >
                                      <IconTrash size={14} />
                                    </ActionIcon>
                                  )}
                                </Group>
                              </Group>
                            ))}
                          </Stack>
                        )}
                      </Card>
                    )
                  })}
                </Stack>
              </Paper>

              {/* Quick Actions & Insights */}
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                <Card withBorder p="md" style={{ cursor: 'pointer' }} onClick={openLogModal}>
                  <Stack gap="xs" align="center">
                    <IconPlus size={32} />
                    <Text fw={600}>Quick Log Food</Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Log a meal in seconds
                    </Text>
                  </Stack>
                </Card>

                {weeklySummary && (
                  <Card withBorder p="md">
                    <Text fw={600} mb="sm">This Week</Text>
                    <Stack gap="xs">
                      <Text size="sm">
                        Avg: {weeklySummary.avgCalories.toFixed(0)} cal/day
                      </Text>
                      <Text size="sm">
                        {weeklySummary.daysLogged}/7 days logged
                      </Text>
                      <Progress 
                        value={(weeklySummary.daysLogged / 7) * 100} 
                        size="sm" 
                        mt="xs"
                      />
                    </Stack>
                  </Card>
                )}

                <Card withBorder p="md">
                  <Text fw={600} mb="sm">Today's Tip</Text>
                  <Text size="sm" c="dimmed">
                    {nutritionPlan?.notes || 'Stay hydrated and aim to hit your protein target!'}
                  </Text>
                </Card>
              </SimpleGrid>
            </Stack>
          </Tabs.Panel>

          {/* Meals Tab */}
          <Tabs.Panel value="meals" pt="xl">
            <Stack gap="xl">
              {/* Header with Week Selector */}
              <Group justify="space-between" align="center">
                <Group gap="md">
                  <Button
                    variant="light"
                    size="sm"
                    onClick={() => {
                      const newDate = new Date(currentWeekStart)
                      newDate.setDate(newDate.getDate() - 7)
                      setCurrentWeekStart(newDate)
                    }}
                  >
                    &lt;
                  </Button>
                  <Text fw={600}>
                    {currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {
                      new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }
                  </Text>
                  <Button
                    variant="light"
                    size="sm"
                    onClick={() => {
                      const newDate = new Date(currentWeekStart)
                      newDate.setDate(newDate.getDate() + 7)
                      setCurrentWeekStart(newDate)
                    }}
                  >
                    &gt;
                  </Button>
                  <Button
                    variant="light"
                    size="sm"
                    onClick={() => {
                      const today = new Date()
                      const dayOfWeek = today.getDay()
                      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
                      const monday = new Date(today.setDate(diff))
                      monday.setHours(0, 0, 0, 0)
                      setCurrentWeekStart(monday)
                    }}
                  >
                    This Week
                  </Button>
                </Group>
                {!isTrainerView && (
                  <Button leftSection={<IconPlus size={16} />} variant="light">
                    Shopping List
                  </Button>
                )}
              </Group>

              {/* Weekly Nutrition Averages */}
              {weeklyMealData?.weekly_averages && (
                <Card withBorder p="md">
                  <Text fw={600} mb="md">Weekly Nutrition Averages</Text>
                  <SimpleGrid cols={4} spacing="md">
                    <Box>
                      <Text size="xs" c="dimmed" mb={4}>Calories</Text>
                      <Text size="xl" fw={700}>{weeklyMealData.weekly_averages.calories} cal</Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed" mb={4}>Protein</Text>
                      <Text size="xl" fw={700}>{weeklyMealData.weekly_averages.protein} g</Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed" mb={4}>Carbs</Text>
                      <Text size="xl" fw={700}>{weeklyMealData.weekly_averages.carbs} g</Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed" mb={4}>Fats</Text>
                      <Text size="xl" fw={700}>{weeklyMealData.weekly_averages.fats} g</Text>
                    </Box>
                  </SimpleGrid>
                  <Text size="sm" c="dimmed" mt="sm">
                    {weeklyMealData.weekly_averages.days_logged} of 7 days logged
                  </Text>
                </Card>
              )}

              {/* Today's Meals Section */}
              <Paper p="md" withBorder>
                <Title order={3} mb="md">Today</Title>
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                  {['breakfast', 'lunch', 'dinner', 'snack'].map(mealSlot => {
                    // Get assigned meal for today
                    const todayDayNum = new Date().getDay() || 7
                    const assignedMeal = nutritionPlan?.meals?.find(m => 
                      m.day_number === todayDayNum && 
                      m.meal_name?.toLowerCase().includes(mealSlot)
                    )
                    
                    // Get client selection for today
                    const todayStr = new Date().toISOString().split('T')[0]
                    const selectedMeal = weeklyMealData?.client_selections?.find(s => 
                      s.selected_date === todayStr && 
                      s.meal_slot === mealSlot
                    )

                    // Get flexible recommendations for this category
                    const flexibleMeals = recommendedMeals.flexible[mealSlot] || []

                    return (
                      <Card key={mealSlot} withBorder p="md">
                        <Text fw={600} mb="sm" tt="capitalize">{mealSlot}</Text>
                        
                        {/* Show assigned or selected meal */}
                        {(assignedMeal || selectedMeal) ? (
                          <Box>
                            {selectedMeal?.recipe_name && (
                              <>
                                <Text size="sm" fw={500} mb="xs">{selectedMeal.recipe_name}</Text>
                                <Group gap="xs" mb="xs">
                                  <Badge size="sm" variant="light">
                                    {Math.round(selectedMeal.actual_calories || 0)} cal
                                  </Badge>
                                  <Text size="xs" c="dimmed">
                                    P:{Math.round(selectedMeal.actual_protein || 0)}g C:{Math.round(selectedMeal.actual_carbs || 0)}g F:{Math.round(selectedMeal.actual_fats || 0)}g
                                  </Text>
                                </Group>
                              </>
                            )}
                            {assignedMeal && !selectedMeal && (
                              <>
                                <Text size="sm" fw={500} mb="xs">{assignedMeal.meal_name}</Text>
                                <Group gap="xs">
                                  <Badge size="sm" variant="light">
                                    {Math.round(assignedMeal.target_calories || 0)} cal
                                  </Badge>
                                  <Text size="xs" c="dimmed">
                                    P:{Math.round(assignedMeal.target_protein || 0)}g C:{Math.round(assignedMeal.target_carbs || 0)}g F:{Math.round(assignedMeal.target_fats || 0)}g
                                  </Text>
                                </Group>
                              </>
                            )}
                            {!isTrainerView && (
                              <Button size="xs" variant="light" mt="xs" fullWidth>
                                Swap Meal
                              </Button>
                            )}
                          </Box>
                        ) : (
                          <Box>
                            <Text size="sm" c="dimmed" mb="sm">No meal assigned</Text>
                            {flexibleMeals.length > 0 && !isTrainerView && (
                              <Stack gap="xs">
                                <Text size="xs" fw={500}>Recommended:</Text>
                                {flexibleMeals.slice(0, 2).map(meal => (
                                  <Card key={meal.id} p="xs" withBorder style={{ cursor: 'pointer' }} onClick={() => handleSelectMeal(meal, mealSlot)}>
                                    <Text size="xs" fw={500}>{meal.recipe_name || meal.meal_name}</Text>
                                    <Text size="xs" c="dimmed">
                                      {Math.round(meal.calories_per_serving || 0)} cal
                                    </Text>
                                  </Card>
                                ))}
                                {flexibleMeals.length > 2 && (
                                  <Text size="xs" c="dimmed" ta="center">+{flexibleMeals.length - 2} more</Text>
                                )}
                              </Stack>
                            )}
                          </Box>
                        )}
                      </Card>
                    )
                  })}
                </SimpleGrid>
              </Paper>

              {/* Weekly View */}
              <Paper p="md" withBorder>
                <Title order={3} mb="md">This Week</Title>
                <Stack gap="lg">
                  {[1, 2, 3, 4, 5, 6, 7].map(dayNum => {
                    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayNum - 1]
                    const dayMeals = nutritionPlan?.meals?.filter(m => m.day_number === dayNum) || []
                    const daySelections = weeklyMealData?.client_selections?.filter(s => {
                      const date = new Date(s.selected_date)
                      return date.getDay() === (dayNum % 7)
                    }) || []

                    if (dayMeals.length === 0 && daySelections.length === 0) return null

                    return (
                      <Card key={dayNum} withBorder p="md">
                        <Text fw={600} mb="sm">{dayName} (Day {dayNum})</Text>
                        {dayMeals.length > 0 && (
                          <Group gap="xs" mb="sm">
                            <Text size="sm" c="dimmed">
                              {Math.round(dayMeals.reduce((sum, m) => sum + (parseFloat(m.target_calories) || 0), 0))} cal | 
                              P: {Math.round(dayMeals.reduce((sum, m) => sum + (parseFloat(m.target_protein) || 0), 0))}g | 
                              C: {Math.round(dayMeals.reduce((sum, m) => sum + (parseFloat(m.target_carbs) || 0), 0))}g | 
                              F: {Math.round(dayMeals.reduce((sum, m) => sum + (parseFloat(m.target_fats) || 0), 0))}g
                            </Text>
                          </Group>
                        )}
                        <Stack gap="sm">
                          {dayMeals.map(meal => (
                            <Card key={meal.id} withBorder p="sm" style={{ backgroundColor: 'var(--mantine-color-dark-7)' }}>
                              <Group justify="space-between" mb="xs">
                                <Text fw={500} size="sm">
                                  {meal.meal_name} {meal.meal_time && `(${meal.meal_time})`}
                                </Text>
                                <Badge size="sm" variant="light">
                                  {Math.round(meal.target_calories || 0)} cal
                                </Badge>
                              </Group>
                              {meal.foods && meal.foods.length > 0 && (
                                <Text size="xs" c="dimmed">
                                  {meal.foods.map(f => `${f.food_name} (${f.quantity}${f.unit})`).join(', ')}
                                </Text>
                              )}
                              <Text size="xs" c="dimmed" mt="xs">
                                P:{Math.round(meal.target_protein || 0)}g C:{Math.round(meal.target_carbs || 0)}g F:{Math.round(meal.target_fats || 0)}g
                              </Text>
                            </Card>
                          ))}
                          {daySelections.map(selection => (
                            <Card key={selection.id} withBorder p="sm" style={{ backgroundColor: 'var(--mantine-color-dark-6)' }}>
                              <Group justify="space-between">
                                <Text fw={500} size="sm">{selection.recipe_name || 'Selected Meal'}</Text>
                                <Badge size="sm" variant="light">
                                  {Math.round(selection.actual_calories || 0)} cal
                                </Badge>
                              </Group>
                              <Text size="xs" c="dimmed" mt="xs">
                                P:{Math.round(selection.actual_protein || 0)}g C:{Math.round(selection.actual_carbs || 0)}g F:{Math.round(selection.actual_fats || 0)}g
                              </Text>
                            </Card>
                          ))}
                        </Stack>
                      </Card>
                    )
                  })}
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>

          {/* Food Log Tab */}
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

              {/* Date Selector */}
              <Group mb="md">
                <DateInput
                  label="Select Date"
                  value={selectedDate}
                  onChange={setSelectedDate}
                  leftSection={<IconCalendar size={16} />}
                  maxDate={new Date()}
                />
                <Button
                  variant="light"
                  onClick={() => setSelectedDate(new Date())}
                  size="sm"
                  mt="auto"
                >
                  Today
                </Button>
              </Group>

              {/* Daily Totals Summary */}
              <Card withBorder p="md" mb="md">
                <Text fw={600} mb="sm">Daily Totals</Text>
                <SimpleGrid cols={4} spacing="md">
                  <Box>
                    <Text size="xs" c="dimmed">Calories</Text>
                    <Text size="lg" fw={700}>
                      {selectedDateTotals.calories.toFixed(0)} / {Math.round(targets.calories).toFixed(0)}
                    </Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed">Protein</Text>
                    <Text size="lg" fw={700}>
                      {Math.round(selectedDateTotals.protein).toFixed(0)} / {Math.round(targets.protein).toFixed(0)}g
                    </Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed">Carbs</Text>
                    <Text size="lg" fw={700}>
                      {Math.round(selectedDateTotals.carbs).toFixed(0)} / {Math.round(targets.carbs).toFixed(0)}g
                    </Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed">Fats</Text>
                    <Text size="lg" fw={700}>
                      {Math.round(selectedDateTotals.fats).toFixed(0)} / {Math.round(targets.fats).toFixed(0)}g
                    </Text>
                  </Box>
                </SimpleGrid>
              </Card>

              {/* Logged Foods */}
              {selectedDateLogs.length === 0 ? (
                <Text c="dimmed" ta="center" py="xl">
                  No foods logged for this date. Start logging to track your nutrition!
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
                    {selectedDateLogs.map(log => (
                      <Table.Tr key={log.id}>
                        <Table.Td>
                          <Group gap={4}>
                            <IconClock size={14} />
                            {new Date(log.created_at).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </Group>
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

          {/* Progress & History Tab */}
          <Tabs.Panel value="history" pt="xl">
            <Stack gap="xl">
              <Paper p="md" withBorder>
                <Title order={3} mb="md">Nutrition Progress</Title>
                
                {historyData.length === 0 ? (
                  <Text c="dimmed" ta="center" py="xl">
                    No history data available. Start logging to see your progress!
                  </Text>
                ) : (
                  <Stack gap="lg">
                    {/* Calorie Trend */}
                    <Box>
                      <Text fw={600} mb="sm">Calorie Trend (Last 30 Days)</Text>
                      <SimpleGrid cols={historyData.length > 7 ? 7 : historyData.length} spacing="xs">
                        {historyData.slice(-7).map((day, idx) => {
                          const percentage = getPercentage(day.total_calories, targets.calories)
                          return (
                            <Box key={idx}>
                              <Progress
                                value={percentage}
                                size="xl"
                                color={percentage > 100 ? 'red' : 'green'}
                                style={{ height: '100px' }}
                              />
                              <Text size="xs" ta="center" mt="xs">
                                {new Date(day.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </Text>
                            </Box>
                          )
                        })}
                      </SimpleGrid>
                    </Box>

                    {/* Stats Grid */}
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                      <Card withBorder p="md">
                        <Text size="xs" c="dimmed" mb="xs">Avg Daily Calories</Text>
                        <Text size="xl" fw={700}>
                          {historyData.length > 0 
                            ? (historyData.reduce((sum, d) => sum + parseFloat(d.total_calories || 0), 0) / historyData.length).toFixed(0)
                            : 0}
                        </Text>
                      </Card>
                      <Card withBorder p="md">
                        <Text size="xs" c="dimmed" mb="xs">Avg Daily Protein</Text>
                        <Text size="xl" fw={700}>
                          {historyData.length > 0
                            ? Math.round(historyData.reduce((sum, d) => sum + parseFloat(d.total_protein || 0), 0) / historyData.length).toFixed(0)
                            : 0}g
                        </Text>
                      </Card>
                      <Card withBorder p="md">
                        <Text size="xs" c="dimmed" mb="xs">Days Logged</Text>
                        <Text size="xl" fw={700}>{historyData.length}</Text>
                      </Card>
                      <Card withBorder p="md">
                        <Text size="xs" c="dimmed" mb="xs">Best Streak</Text>
                        <Text size="xl" fw={700}>
                          {(() => {
                            let streak = 0
                            let maxStreak = 0
                            const sorted = [...historyData].sort((a, b) => 
                              new Date(a.log_date) - new Date(b.log_date)
                            )
                            sorted.forEach(day => {
                              if (parseFloat(day.total_calories || 0) > 0) {
                                streak++
                                maxStreak = Math.max(maxStreak, streak)
                              } else {
                                streak = 0
                              }
                            })
                            return maxStreak
                          })()} days
                        </Text>
                      </Card>
                    </SimpleGrid>
                  </Stack>
                )}
              </Paper>
            </Stack>
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

      {/* Enhanced Log Food Modal */}
      <Modal
        opened={logModalOpened}
        onClose={closeLogModal}
        title="Log Food"
        size="lg"
      >
        <Tabs value={logModalTab} onChange={setLogModalTab}>
          <Tabs.List>
            <Tabs.Tab value="search">Search</Tabs.Tab>
            <Tabs.Tab value="quick">Quick Add</Tabs.Tab>
            <Tabs.Tab value="recent">Recent</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="search" pt="md">
            <Stack gap="md">
              <TextInput
                label="Search Food Database"
                placeholder="Type to search..."
                value={searchFood}
                onChange={(e) => {
                  setSearchFood(e.target.value)
                  handleSearchFoods(e.target.value)
                }}
                leftSection={<IconSearch size={16} />}
              />
              {foods.length > 0 && (
                <Paper p="xs" withBorder style={{ maxHeight: 200, overflow: 'auto' }}>
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
                              {food.calories} cal | P:{food.protein}g C:{food.carbs}g F:{food.fats}g
                            </Text>
                          </div>
                        </Group>
                      </Card>
                    ))}
                  </Stack>
                </Paper>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="quick" pt="md">
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
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="recent" pt="md">
            <Stack gap="md">
              <Text size="sm" c="dimmed">Select from recently logged foods</Text>
              {recentFoods.length > 0 ? (
                <Stack gap="xs">
                  {recentFoods.map((foodName, idx) => (
                    <Card
                      key={idx}
                      p="sm"
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        handleSelectFood(foodName)
                        setLogModalTab('quick')
                      }}
                      withBorder
                    >
                      <Text size="sm" fw={500}>{foodName}</Text>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Text c="dimmed" ta="center" py="xl">
                  No recent foods. Start logging to build your recent foods list!
                </Text>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>

        <Group justify="flex-end" mt="md">
          <Button variant="light" onClick={closeLogModal}>
            Cancel
          </Button>
          <Button onClick={handleSubmitLog}>
            Log Food
          </Button>
        </Group>
      </Modal>

      {/* Floating Action Button */}
      {!isTrainerView && (
        <Button
          size="lg"
          radius="xl"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
          onClick={openLogModal}
        >
          <IconPlus size={24} />
        </Button>
      )}
    </Container>
  )
}

export default ClientNutrition
