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
  Flex,
  Image,
  ScrollArea,
  Avatar,
  Textarea,
  List,
  Checkbox
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
  IconClock,
  IconEye,
  IconLeaf,
  IconWheat,
  IconMilk,
  IconClockHour4,
  IconChefHat,
  IconX,
  IconInfoCircle,
  IconChecklist,
  IconBook,
  IconShoppingCart
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
  const [viewAllModalOpened, { open: openViewAllModal, close: closeViewAllModal }] = useDisclosure(false)
  const [addMealModalOpened, { open: openAddMealModal, close: closeAddMealModal }] = useDisclosure(false)
  const [editMealModalOpened, { open: openEditMealModal, close: closeEditMealModal }] = useDisclosure(false)
  const [recipeModalOpened, { open: openRecipeModal, close: closeRecipeModal }] = useDisclosure(false)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [selectedMealToEdit, setSelectedMealToEdit] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedMealSlot, setSelectedMealSlot] = useState(null)
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

  const mealRecommendationForm = useForm({
    initialValues: {
      meal_name: '',
      meal_description: '',
      meal_category: 'breakfast',
      calories_per_serving: '',
      protein_per_serving: '',
      carbs_per_serving: '',
      fats_per_serving: '',
      recommendation_type: 'flexible',
      priority: 0,
      notes: '',
      // Recipe fields
      include_recipe: false,
      total_yield: 1,
      prep_time: '',
      cook_time: '',
      total_time: '',
      difficulty_level: '',
      ingredients: [''],
      instructions: '',
      equipment_needed: [],
      prep_tips: '',
      storage_tips: '',
      nutrition_tips: '',
      substitution_options: [],
      is_vegan: false,
      is_vegetarian: true,
      is_gluten_free: false,
      is_dairy_free: false,
      is_quick_meal: false,
      is_meal_prep_friendly: false
    },
    validate: {
      meal_name: (value) => (!value ? 'Meal name is required' : null),
      meal_category: (value) => (!value ? 'Category is required' : null),
      calories_per_serving: (value) => (!value || value <= 0 ? 'Calories must be greater than 0' : null),
      protein_per_serving: (value) => (value < 0 ? 'Protein cannot be negative' : null),
      carbs_per_serving: (value) => (value < 0 ? 'Carbs cannot be negative' : null),
      fats_per_serving: (value) => (value < 0 ? 'Fats cannot be negative' : null)
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
      if (isTrainerView && clientId) {
        try {
          const clientRes = await api.get(`/trainer/clients/${clientId}`).catch(() => ({ data: null }))
          if (clientRes.data?.user_id) {
            const userId = clientRes.data.user_id
            const logsRes = await api.get(`/trainer/clients/${userId}/nutrition/logs`).catch(() => ({ data: [] }))
            setNutritionLogs(logsRes.data || [])
            
            // Fetch recent foods (last 10 unique foods logged)
            const recent = logsRes.data
              ?.map(log => log.food_name)
              .filter((name, index, self) => self.indexOf(name) === index)
              .slice(0, 10) || []
            setRecentFoods(recent)
          } else {
            setNutritionLogs([])
            setRecentFoods([])
          }
        } catch (error) {
          console.error('Error fetching client nutrition logs:', error)
          setNutritionLogs([])
          setRecentFoods([])
        }
      } else {
        const logsRes = await api.get('/nutrition/logs').catch(() => ({ data: [] }))
        setNutritionLogs(logsRes.data || [])
        
        // Fetch recent foods (last 10 unique foods logged)
        const recent = logsRes.data
          ?.map(log => log.food_name)
          .filter((name, index, self) => self.indexOf(name) === index)
          .slice(0, 10) || []
        setRecentFoods(recent)
      }
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
      if (isTrainerView && clientId) {
        // For trainers, get recommendations for the client
        try {
          const clientRes = await api.get(`/trainer/clients/${clientId}`).catch(() => ({ data: null }))
          if (clientRes.data?.user_id) {
            const userId = clientRes.data.user_id
            const result = await api.get(`/nutrition/meals/recommendations/${userId}`).catch(() => ({ data: [] }))
            // Transform trainer endpoint response to match client endpoint format
            const recommendations = result.data || []
            const assigned = recommendations.filter(r => r.is_assigned)
            const flexible = recommendations.filter(r => !r.is_assigned)
            const flexibleByCategory = flexible.reduce((acc, meal) => {
              if (!acc[meal.meal_category]) {
                acc[meal.meal_category] = []
              }
              acc[meal.meal_category].push(meal)
              return acc
            }, {})
            setRecommendedMeals({ assigned, flexible: flexibleByCategory })
          } else {
            setRecommendedMeals({ assigned: [], flexible: {} })
          }
        } catch (error) {
          console.error('Error fetching client meal recommendations:', error)
          setRecommendedMeals({ assigned: [], flexible: {} })
        }
      } else {
        // For clients, use the client endpoint
        const result = await api.get('/nutrition/meals/recommended').catch(() => ({ data: { assigned: [], flexible: {} } }))
        setRecommendedMeals(result.data)
      }
    } catch (error) {
      console.error('Error fetching recommended meals:', error)
      setRecommendedMeals({ assigned: [], flexible: {} })
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

  const handleAddMealRecommendation = async (values) => {
    try {
      if (!isTrainerView || !clientId) {
        notifications.show({
          title: 'Error',
          message: 'Invalid request',
          color: 'red'
        })
        return
      }

      // Get client's user_id
      const clientRes = await api.get(`/trainer/clients/${clientId}`).catch(() => ({ data: null }))
      if (!clientRes.data?.user_id) {
        notifications.show({
          title: 'Error',
          message: 'Client not found',
          color: 'red'
        })
        return
      }

      const userId = clientRes.data.user_id
      const activePlanId = nutritionPlan?.id || null

      // Validate meal_name is not empty
      if (!values.meal_name || values.meal_name.trim() === '') {
        notifications.show({
          title: 'Validation Error',
          message: 'Meal name is required',
          color: 'red'
        })
        return
      }

      const payload = {
        client_id: userId,
        meal_name: values.meal_name.trim(),
        meal_description: values.meal_description?.trim() || null,
        meal_category: values.meal_category,
        calories_per_serving: parseFloat(values.calories_per_serving) || 0,
        protein_per_serving: parseFloat(values.protein_per_serving || 0),
        carbs_per_serving: parseFloat(values.carbs_per_serving || 0),
        fats_per_serving: parseFloat(values.fats_per_serving || 0),
        recommendation_type: values.recommendation_type || 'flexible',
        priority: parseInt(values.priority || 0),
        notes: values.notes?.trim() || null,
        nutrition_plan_id: activePlanId
      }

      // If recipe details are provided, include them
      if (values.include_recipe && values.ingredients && values.ingredients.length > 0 && values.ingredients[0].trim() !== '' && values.instructions && values.instructions.trim() !== '') {
        payload.recipe = {
          total_yield: parseInt(values.total_yield || 1),
          prep_time: values.prep_time ? parseInt(values.prep_time) : null,
          cook_time: values.cook_time ? parseInt(values.cook_time) : null,
          total_time: values.total_time ? parseInt(values.total_time) : null,
          difficulty_level: values.difficulty_level || null,
          ingredients: values.ingredients.filter(ing => ing.trim() !== '').map(ing => ing.trim()),
          instructions: values.instructions.trim(),
          equipment_needed: values.equipment_needed || [],
          prep_tips: values.prep_tips?.trim() || null,
          storage_tips: values.storage_tips?.trim() || null,
          nutrition_tips: values.nutrition_tips?.trim() || null,
          substitution_options: values.substitution_options || [],
          is_vegan: values.is_vegan || false,
          is_vegetarian: values.is_vegetarian !== undefined ? values.is_vegetarian : true,
          is_gluten_free: values.is_gluten_free || false,
          is_dairy_free: values.is_dairy_free || false,
          is_quick_meal: values.is_quick_meal || false,
          is_meal_prep_friendly: values.is_meal_prep_friendly || false
        }
      }

      await api.post('/nutrition/meals/recommendations', payload)

      notifications.show({
        title: 'Success',
        message: 'Meal recommendation added successfully',
        color: 'green'
      })

      closeAddMealModal()
      mealRecommendationForm.reset()
      fetchRecommendedMeals()
    } catch (error) {
      console.error('Error adding meal recommendation:', error)
      console.error('Error details:', error.response?.data)
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to add meal recommendation'
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red'
      })
    }
  }

  const handleEditMeal = async (meal) => {
    setSelectedMealToEdit(meal)
    
    // Load basic meal data
    const formValues = {
      meal_name: meal.meal_name || '',
      meal_description: meal.meal_description || '',
      meal_category: meal.meal_category || 'breakfast',
      calories_per_serving: meal.calories_per_serving || '',
      protein_per_serving: meal.protein_per_serving || 0,
      carbs_per_serving: meal.carbs_per_serving || 0,
      fats_per_serving: meal.fats_per_serving || 0,
      recommendation_type: meal.recommendation_type || 'flexible',
      priority: meal.priority || 0,
      notes: meal.notes || '',
      // Recipe fields
      include_recipe: false,
      total_yield: 1,
      prep_time: '',
      cook_time: '',
      total_time: '',
      difficulty_level: '',
      ingredients: [''],
      instructions: '',
      equipment_needed: [],
      prep_tips: '',
      storage_tips: '',
      nutrition_tips: '',
      substitution_options: [],
      is_vegan: false,
      is_vegetarian: true,
      is_gluten_free: false,
      is_dairy_free: false,
      is_quick_meal: false,
      is_meal_prep_friendly: false
    }

    // If meal has a recipe_id, fetch the recipe data
    if (meal.recipe_id) {
      try {
        const recipeResult = await api.get(`/nutrition/recipes/${meal.recipe_id}`).catch(() => ({ data: null }))
        if (recipeResult.data) {
          const recipe = recipeResult.data
          formValues.include_recipe = true
          formValues.total_yield = recipe.total_yield || 1
          formValues.prep_time = recipe.prep_time || ''
          formValues.cook_time = recipe.cook_time || ''
          formValues.total_time = recipe.total_time || ''
          formValues.difficulty_level = recipe.difficulty_level || ''
          formValues.ingredients = Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 
            ? recipe.ingredients 
            : ['']
          formValues.instructions = recipe.instructions || ''
          formValues.prep_tips = recipe.prep_tips || ''
          formValues.storage_tips = recipe.storage_tips || ''
          formValues.nutrition_tips = recipe.nutrition_tips || ''
          formValues.equipment_needed = Array.isArray(recipe.equipment_needed) ? recipe.equipment_needed : []
          formValues.substitution_options = Array.isArray(recipe.substitution_options) ? recipe.substitution_options : []
          formValues.is_vegan = recipe.is_vegan || false
          formValues.is_vegetarian = recipe.is_vegetarian !== undefined ? recipe.is_vegetarian : true
          formValues.is_gluten_free = recipe.is_gluten_free || false
          formValues.is_dairy_free = recipe.is_dairy_free || false
          formValues.is_quick_meal = recipe.is_quick_meal || false
          formValues.is_meal_prep_friendly = recipe.is_meal_prep_friendly || false
        }
      } catch (error) {
        console.error('Error fetching recipe for edit:', error)
      }
    }

    mealRecommendationForm.setValues(formValues)
    openEditMealModal()
  }

  const handleUpdateMealRecommendation = async (values) => {
    try {
      if (!isTrainerView || !selectedMealToEdit?.id) {
        notifications.show({
          title: 'Error',
          message: 'Invalid request',
          color: 'red'
        })
        return
      }

      // Validate meal_name is not empty
      if (!values.meal_name || values.meal_name.trim() === '') {
        notifications.show({
          title: 'Validation Error',
          message: 'Meal name is required',
          color: 'red'
        })
        return
      }

      const payload = {
        meal_name: values.meal_name.trim(),
        meal_description: values.meal_description?.trim() || null,
        meal_category: values.meal_category,
        calories_per_serving: parseFloat(values.calories_per_serving) || 0,
        protein_per_serving: parseFloat(values.protein_per_serving || 0),
        carbs_per_serving: parseFloat(values.carbs_per_serving || 0),
        fats_per_serving: parseFloat(values.fats_per_serving || 0),
        recommendation_type: values.recommendation_type || 'flexible',
        priority: parseInt(values.priority || 0),
        notes: values.notes?.trim() || null
      }

      // If recipe details are provided, include them
      console.log('Form values check:', {
        include_recipe: values.include_recipe,
        ingredients: values.ingredients,
        ingredients_length: values.ingredients?.length,
        first_ingredient: values.ingredients?.[0],
        instructions: values.instructions,
        has_instructions: !!(values.instructions && values.instructions.trim() !== '')
      })
      
      if (values.include_recipe && values.ingredients && values.ingredients.length > 0 && values.ingredients[0].trim() !== '' && values.instructions && values.instructions.trim() !== '') {
        payload.recipe = {
          total_yield: parseInt(values.total_yield || 1),
          prep_time: values.prep_time ? parseInt(values.prep_time) : null,
          cook_time: values.cook_time ? parseInt(values.cook_time) : null,
          total_time: values.total_time ? parseInt(values.total_time) : null,
          difficulty_level: values.difficulty_level || null,
          ingredients: values.ingredients.filter(ing => ing.trim() !== '').map(ing => ing.trim()),
          instructions: values.instructions.trim(),
          equipment_needed: values.equipment_needed || [],
          prep_tips: values.prep_tips?.trim() || null,
          storage_tips: values.storage_tips?.trim() || null,
          nutrition_tips: values.nutrition_tips?.trim() || null,
          substitution_options: values.substitution_options || [],
          is_vegan: values.is_vegan || false,
          is_vegetarian: values.is_vegetarian !== undefined ? values.is_vegetarian : true,
          is_gluten_free: values.is_gluten_free || false,
          is_dairy_free: values.is_dairy_free || false,
          is_quick_meal: values.is_quick_meal || false,
          is_meal_prep_friendly: values.is_meal_prep_friendly || false
        }
        console.log('✅ Sending recipe data with update:', {
          ingredients: payload.recipe.ingredients.length,
          ingredients_list: payload.recipe.ingredients,
          hasInstructions: !!payload.recipe.instructions,
          instructions_preview: payload.recipe.instructions.substring(0, 100),
          hasTips: !!(payload.recipe.prep_tips || payload.recipe.storage_tips || payload.recipe.nutrition_tips)
        })
      } else {
        console.log('❌ Recipe data NOT included because:', {
          include_recipe: values.include_recipe,
          has_ingredients: !!(values.ingredients && values.ingredients.length > 0),
          first_ingredient_valid: !!(values.ingredients?.[0] && values.ingredients[0].trim() !== ''),
          has_instructions: !!(values.instructions && values.instructions.trim() !== '')
        })
      }

      const response = await api.put(`/nutrition/meals/recommendations/${selectedMealToEdit.id}`, payload)
      console.log('Update response:', response.data)
      console.log('Updated meal recipe_id:', response.data?.recipe_id)

      notifications.show({
        title: 'Success',
        message: 'Meal recommendation updated successfully',
        color: 'green'
      })

      closeEditMealModal()
      setSelectedMealToEdit(null)
      mealRecommendationForm.reset()
      
      // Refresh meal recommendations to get updated recipe_id
      await fetchRecommendedMeals()
      
      // Also refresh weekly meal data if in meals tab
      if (activeTab === 'meals') {
        await fetchWeeklyMealData()
      }
    } catch (error) {
      console.error('Error updating meal recommendation:', error)
      console.error('Error details:', error.response?.data)
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to update meal recommendation'
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red'
      })
    }
  }

  const handleViewRecipe = async (meal) => {
    try {
      setRecipeLoading(true)
      const recipeId = meal.recipe_id
      
      console.log('View Recipe - meal data:', {
        meal_name: meal.meal_name,
        recipe_id: recipeId,
        has_recipe_id: !!recipeId
      })
      
      // For client view: Always fetch full recipe from API if recipe_id exists
      // This ensures we get complete recipe data (ingredients, instructions, tips, etc.)
      if (recipeId) {
        try {
          console.log('Fetching recipe from API:', recipeId)
          const result = await api.get(`/nutrition/recipes/${recipeId}`)
          
          if (result.data) {
            console.log('Recipe data received:', {
              name: result.data.name,
              has_ingredients: !!(result.data.ingredients && result.data.ingredients.length > 0),
              has_instructions: !!result.data.instructions,
              has_prep_tips: !!result.data.prep_tips,
              has_storage_tips: !!result.data.storage_tips,
              has_nutrition_tips: !!result.data.nutrition_tips,
              ingredients_count: Array.isArray(result.data.ingredients) ? result.data.ingredients.length : 0
            })
            
            // Merge meal-specific data (like notes from meal recommendation) with recipe data
            setSelectedRecipe({
              ...result.data,
              // Preserve meal recommendation notes if available
              notes: meal.notes || result.data.notes,
              // Use meal macros if recipe doesn't have them
              calories_per_serving: result.data.calories_per_serving || meal.calories_per_serving,
              protein_per_serving: result.data.protein_per_serving || meal.protein_per_serving,
              carbs_per_serving: result.data.carbs_per_serving || meal.carbs_per_serving,
              fats_per_serving: result.data.fats_per_serving || meal.fats_per_serving
            })
            openRecipeModal()
            return
          }
        } catch (apiError) {
          console.error('Error fetching recipe from API:', apiError)
          console.error('API Error details:', apiError.response?.data)
          // Fall through to show basic meal info if API fails
        }
      } else {
        console.log('No recipe_id found for meal, showing basic info')
      }
      
      // If no recipe_id or API fetch failed, show meal recommendation details
      // This is a fallback for meals without full recipes
      setSelectedRecipe({
        name: meal.recipe_name || meal.meal_name,
        description: meal.meal_description || meal.recipe_description,
        calories_per_serving: meal.calories_per_serving,
        protein_per_serving: meal.protein_per_serving,
        carbs_per_serving: meal.carbs_per_serving,
        fats_per_serving: meal.fats_per_serving,
        image_url: meal.image_url,
        is_vegan: meal.is_vegan,
        is_vegetarian: meal.is_vegetarian,
        is_gluten_free: meal.is_gluten_free,
        is_dairy_free: meal.is_dairy_free,
        notes: meal.notes,
        is_custom_meal: true // Flag to indicate this is a custom meal, not a full recipe
      })
      openRecipeModal()
    } catch (error) {
      console.error('Error in handleViewRecipe:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load recipe details',
        color: 'red'
      })
    } finally {
      setRecipeLoading(false)
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
      <Card withBorder p="sm" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Group gap="sm" align="center" wrap="nowrap" justify="center" style={{ width: '100%' }}>
          <Box style={{ flexShrink: 0 }}>
            <RingProgress
              size={60}
              thickness={6}
              sections={[{ value: percentage, color: color }]}
              styles={{
                root: {
                  '--rp-color': color,
                }
              }}
              label={
                <Center>
                  <Icon size={18} color={color} />
                </Center>
              }
            />
          </Box>
          <Box style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={3} lh={1.2} ta="center">
              {label}
            </Text>
            <Text size="md" fw={700} lh={1.2} mb={3} ta="center">
              {consumedRounded} / {targetRounded}
            </Text>
            {isOver ? (
              <Text size="xs" c="red" fw={500} lh={1.3} ta="center">
                {overRounded} {unit} Over
              </Text>
            ) : (
              <Text size="xs" c="dimmed" fw={500} lh={1.3} ta="center">
                {remainingRounded} {unit} Remaining
              </Text>
            )}
          </Box>
        </Group>
      </Card>
    )
  }

  // Enhanced Meal Card Component
  const MealCard = ({ meal, onSelect, onViewRecipe, mealSlot, showActions = true, onEdit = null }) => {
    const mealName = meal.recipe_name || meal.meal_name || 'Meal'
    const imageUrl = meal.image_url
    const calories = Math.round(meal.calories_per_serving || meal.actual_calories || 0)
    const protein = Math.round(meal.protein_per_serving || meal.actual_protein || 0)
    const carbs = Math.round(meal.carbs_per_serving || meal.actual_carbs || 0)
    const fats = Math.round(meal.fats_per_serving || meal.actual_fats || 0)

    // Dietary badges
    const dietaryBadges = []
    if (meal.is_vegan) dietaryBadges.push({ label: 'Vegan', color: 'green', icon: IconLeaf })
    if (meal.is_vegetarian) dietaryBadges.push({ label: 'Vegetarian', color: 'teal', icon: IconLeaf })
    if (meal.is_gluten_free) dietaryBadges.push({ label: 'Gluten-Free', color: 'orange', icon: IconWheat })
    if (meal.is_dairy_free) dietaryBadges.push({ label: 'Dairy-Free', color: 'blue', icon: IconMilk })
    if (meal.is_quick_meal) dietaryBadges.push({ label: 'Quick', color: 'yellow', icon: IconClockHour4 })
    if (meal.is_meal_prep_friendly) dietaryBadges.push({ label: 'Meal Prep', color: 'grape', icon: IconChefHat })

    return (
      <Card withBorder p={0} style={{ overflow: 'hidden', cursor: showActions ? 'pointer' : 'default' }}>
        {/* Image Section */}
        <Box style={{ position: 'relative', height: 120, backgroundColor: 'var(--mantine-color-dark-7)' }}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={mealName}
              height={120}
              fit="cover"
              style={{ width: '100%' }}
            />
          ) : (
            <Center style={{ height: '100%' }}>
              <IconMeat size={40} color="var(--mantine-color-dimmed)" />
            </Center>
          )}
          {/* Dietary Badges Overlay */}
          {dietaryBadges.length > 0 && (
            <Group gap={4} style={{ position: 'absolute', top: 8, right: 8 }}>
              {dietaryBadges.slice(0, 2).map((badge, idx) => (
                <Badge
                  key={idx}
                  size="xs"
                  variant="filled"
                  color={badge.color}
                  leftSection={<badge.icon size={12} />}
                >
                  {badge.label}
                </Badge>
              ))}
            </Group>
          )}
        </Box>

        {/* Content Section */}
        <Stack gap="xs" p="sm">
          <Text fw={600} size="sm" lineClamp={2} style={{ minHeight: 40 }}>
            {mealName}
          </Text>

          {/* Macros */}
          <Group gap={4} wrap="nowrap">
            <Badge size="xs" variant="light" color="red">
              {calories} cal
            </Badge>
            <Text size="xs" c="dimmed">P:{protein}g</Text>
            <Text size="xs" c="dimmed">C:{carbs}g</Text>
            <Text size="xs" c="dimmed">F:{fats}g</Text>
          </Group>

          {/* Actions */}
          {showActions && !isTrainerView && (
            <Group gap="xs" mt="xs">
              {onViewRecipe && (
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconEye size={14} />}
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewRecipe(meal)
                  }}
                  style={{ flex: 1 }}
                >
                  View Recipe
                </Button>
              )}
              {onSelect && (
                <Button
                  size="xs"
                  leftSection={<IconPlus size={14} />}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect(meal, mealSlot)
                  }}
                  style={{ flex: 1 }}
                >
                  Add
                </Button>
              )}
            </Group>
          )}
          {/* Trainer Actions */}
          {isTrainerView && (
            <Stack gap="xs" mt="xs">
              {onViewRecipe && (
                <Button
                  size="xs"
                  variant="light"
                  fullWidth
                  leftSection={<IconEye size={14} />}
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewRecipe(meal)
                  }}
                >
                  View Recipe
                </Button>
              )}
              {onEdit && (
                <Button
                  size="xs"
                  variant="light"
                  fullWidth
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(meal)
                  }}
                >
                  Edit
                </Button>
              )}
            </Stack>
          )}
        </Stack>
      </Card>
    )
  }

  // Meal Category Section Component
  const MealCategorySection = ({ category, meals, assignedMeal, onSelect, onViewAll, mealSlot }) => {
    const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1)
    const displayMeals = meals.slice(0, 3) // Show first 3 meals
    const hasMore = meals.length > 3

    return (
      <Box>
        <Group justify="space-between" mb="sm">
          <Text fw={600} tt="capitalize">{categoryLabel}</Text>
          {hasMore && (
            <Button
              size="xs"
              variant="subtle"
              onClick={() => {
                setSelectedCategory(category)
                setSelectedMealSlot(mealSlot)
                openViewAllModal()
              }}
            >
              View All ({meals.length})
            </Button>
          )}
        </Group>

        {assignedMeal ? (
          <MealCard
            meal={assignedMeal}
            onSelect={onSelect}
            mealSlot={mealSlot}
            showActions={false}
          />
        ) : (
          <SimpleGrid cols={displayMeals.length > 1 ? displayMeals.length : 1} spacing="sm">
            {displayMeals.map(meal => (
              <MealCard
                key={meal.id}
                meal={meal}
                onSelect={onSelect}
                mealSlot={mealSlot}
                showActions={true}
              />
            ))}
            {meals.length === 0 && (
              <Card withBorder p="md">
                <Text size="sm" c="dimmed" ta="center">
                  No recommendations available
                </Text>
              </Card>
            )}
          </SimpleGrid>
        )}
      </Box>
    )
  }

  return (
    <Container size="xl" py="xl">
      {!isTrainerView && <Title order={1} mb="xl">My Nutrition</Title>}

      {targets ? (
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="dashboard">{isTrainerView ? 'Overview' : 'Dashboard'}</Tabs.Tab>
            <Tabs.Tab value="meals">Meals</Tabs.Tab>
            {!isTrainerView && <Tabs.Tab value="log">Food Log</Tabs.Tab>}
            <Tabs.Tab value="history">Progress</Tabs.Tab>
          </Tabs.List>

          {/* Dashboard Tab */}
          <Tabs.Panel value="dashboard" pt="xl">
            <Stack gap="xl">
              {/* Ring Progress Stats */}
              {isTrainerView && (
                <Text size="sm" c="dimmed" mb="md">
                  Viewing {clientName || 'client'}'s nutrition progress for today
                </Text>
              )}
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
                <Tooltip label={isTrainerView ? "Client's calorie consumption vs target" : "Basal Metabolic Rate - calories your body burns at rest"}>
                  <MacroStatCard
                    label="CALORIES"
                    consumed={todayTotals.calories}
                    target={targets.calories}
                    unit="cal"
                    color={todayTotals.calories > targets.calories ? 'red' : 'green'}
                    icon={IconFlame}
                  />
                </Tooltip>
                <Tooltip label={isTrainerView ? "Client's protein consumption vs target" : "Essential for muscle repair and growth"}>
                  <MacroStatCard
                    label="PROTEIN"
                    consumed={todayTotals.protein}
                    target={targets.protein}
                    unit="g"
                    color="blue"
                    icon={IconMeat}
                  />
                </Tooltip>
                <Tooltip label={isTrainerView ? "Client's carb consumption vs target" : "Primary energy source for your body"}>
                  <MacroStatCard
                    label="CARBS"
                    consumed={todayTotals.carbs}
                    target={targets.carbs}
                    unit="g"
                    color="orange"
                    icon={IconBread}
                  />
                </Tooltip>
                <Tooltip label={isTrainerView ? "Client's fat consumption vs target" : "Important for hormone production and nutrient absorption"}>
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
                  <Title order={3}>{isTrainerView ? "Client's Meals Today" : "Today's Meals"}</Title>
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
                            {isTrainerView ? 'No foods logged yet.' : 'No foods logged yet. Click "Add Food" to get started.'}
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
              {!isTrainerView ? (
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
              ) : (
                weeklySummary && (
                  <Card withBorder p="md">
                    <Text fw={600} mb="sm">Client's Weekly Summary</Text>
                    <Stack gap="xs">
                      <Text size="sm">
                        Average Daily Calories: {weeklySummary.avgCalories.toFixed(0)} cal
                      </Text>
                      <Text size="sm">
                        Days Logged: {weeklySummary.daysLogged}/7
                      </Text>
                      <Progress 
                        value={(weeklySummary.daysLogged / 7) * 100} 
                        size="sm" 
                        mt="xs"
                        label={`${Math.round((weeklySummary.daysLogged / 7) * 100)}%`}
                      />
                    </Stack>
                  </Card>
                )
              )}
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
                {isTrainerView && (
                  <Button leftSection={<IconPlus size={16} />} variant="light" onClick={openAddMealModal}>
                    Add Meal
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
                <Title order={3} mb="md">{isTrainerView ? "Client's Meals Today" : "Today"}</Title>
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

                    // Prepare meal data for MealCard
                    const currentMeal = selectedMeal ? {
                      ...selectedMeal,
                      recipe_name: selectedMeal.recipe_name || selectedMeal.meal_name,
                      meal_name: selectedMeal.recipe_name || selectedMeal.meal_name,
                      calories_per_serving: selectedMeal.actual_calories,
                      protein_per_serving: selectedMeal.actual_protein,
                      carbs_per_serving: selectedMeal.actual_carbs,
                      fats_per_serving: selectedMeal.actual_fats,
                      // Include all recipe data from the JOIN
                      recipe_id: selectedMeal.recipe_id,
                      recipe_description: selectedMeal.recipe_description,
                      ingredients: selectedMeal.ingredients,
                      instructions: selectedMeal.instructions,
                      prep_time: selectedMeal.prep_time,
                      cook_time: selectedMeal.cook_time,
                      total_time: selectedMeal.total_time,
                      total_yield: selectedMeal.total_yield,
                      difficulty_level: selectedMeal.difficulty_level,
                      equipment_needed: selectedMeal.equipment_needed,
                      substitution_options: selectedMeal.substitution_options,
                      prep_tips: selectedMeal.prep_tips,
                      storage_tips: selectedMeal.storage_tips,
                      storage_instructions: selectedMeal.storage_instructions,
                      nutrition_tips: selectedMeal.nutrition_tips,
                      is_vegan: selectedMeal.is_vegan,
                      is_vegetarian: selectedMeal.is_vegetarian,
                      is_gluten_free: selectedMeal.is_gluten_free,
                      is_dairy_free: selectedMeal.is_dairy_free,
                      is_quick_meal: selectedMeal.is_quick_meal,
                      is_meal_prep_friendly: selectedMeal.is_meal_prep_friendly
                    } : assignedMeal ? {
                      ...assignedMeal,
                      meal_name: assignedMeal.meal_name,
                      calories_per_serving: assignedMeal.target_calories,
                      protein_per_serving: assignedMeal.target_protein,
                      carbs_per_serving: assignedMeal.target_carbs,
                      fats_per_serving: assignedMeal.target_fats,
                      recipe_id: assignedMeal.recipe_id
                    } : null

                    return (
                      <Box key={mealSlot}>
                        <Text fw={600} mb="sm" tt="capitalize" size="sm">{mealSlot}</Text>
                        
                        {/* Show assigned or selected meal */}
                        {currentMeal ? (
                          <Stack gap="xs">
                            <MealCard
                              meal={currentMeal}
                              onSelect={null}
                              onViewRecipe={handleViewRecipe}
                              mealSlot={mealSlot}
                              showActions={false}
                            />
                            {!isTrainerView && (
                              <Button 
                                size="xs" 
                                variant="light" 
                                fullWidth
                                onClick={() => {
                                  // TODO: Implement meal swap in Phase 4
                                  notifications.show({
                                    title: 'Coming Soon',
                                    message: 'Meal swap functionality will be available soon',
                                    color: 'blue'
                                  })
                                }}
                              >
                                Swap Meal
                              </Button>
                            )}
                          </Stack>
                        ) : (
                          <Stack gap="sm">
                            <Card withBorder p="md" style={{ backgroundColor: 'var(--mantine-color-dark-7)' }}>
                              <Text size="sm" c="dimmed" ta="center" mb="sm">No meal assigned</Text>
                              {flexibleMeals.length > 0 && (
                                <>
                                  <Text size="xs" fw={500} mb="xs">
                                    {isTrainerView ? 'Available Recommendations:' : 'Recommended:'}
                                  </Text>
                                  <SimpleGrid cols={flexibleMeals.length > 1 ? 2 : 1} spacing="xs">
                                    {flexibleMeals.slice(0, 2).map(meal => (
                                      <MealCard
                                        key={meal.id}
                                        meal={meal}
                                        onSelect={isTrainerView ? null : handleSelectMeal}
                                        onViewRecipe={handleViewRecipe}
                                        mealSlot={mealSlot}
                                        showActions={!isTrainerView}
                                        onEdit={isTrainerView ? handleEditMeal : null}
                                      />
                                    ))}
                                  </SimpleGrid>
                                  {flexibleMeals.length > 2 && (
                                    <Button
                                      size="xs"
                                      variant="subtle"
                                      fullWidth
                                      mt="xs"
                                      onClick={() => {
                                        setSelectedCategory(mealSlot)
                                        setSelectedMealSlot(mealSlot)
                                        openViewAllModal()
                                      }}
                                    >
                                      View All ({flexibleMeals.length} options)
                                    </Button>
                                  )}
                                </>
                              )}
                            </Card>
                          </Stack>
                        )}
                      </Box>
                    )
                  })}
                </SimpleGrid>
              </Paper>

              {/* Weekly View */}
              <Paper p="md" withBorder>
                <Title order={3} mb="md">{isTrainerView ? "Client's Weekly Meal Plan" : "This Week"}</Title>
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
                  {isTrainerView 
                    ? `No foods logged for this date.` 
                    : "No foods logged for this date. Start logging to track your nutrition!"}
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
                <Title order={3} mb="md">{isTrainerView ? "Client's Nutrition Progress" : "Nutrition Progress"}</Title>
                
                {historyData.length === 0 ? (
                  <Text c="dimmed" ta="center" py="xl">
                    {isTrainerView 
                      ? "No nutrition history data available for this client yet." 
                      : "No history data available. Start logging to see your progress!"}
                  </Text>
                ) : (
                  <Stack gap="lg">
                    {/* Calorie Trend */}
                    <Box>
                      <Text fw={600} mb="sm">
                        {isTrainerView ? "Client's Calorie Trend (Last 30 Days)" : "Calorie Trend (Last 30 Days)"}
                      </Text>
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

      {/* View All Meals Modal */}
      <Modal
        opened={viewAllModalOpened}
        onClose={closeViewAllModal}
        title={`All ${selectedCategory ? selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1) : ''} Recommendations`}
        size="xl"
      >
        <ScrollArea h={500}>
              {selectedCategory && recommendedMeals.flexible[selectedCategory]?.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {recommendedMeals.flexible[selectedCategory].map(meal => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onSelect={isTrainerView ? null : handleSelectMeal}
                  onViewRecipe={handleViewRecipe}
                  mealSlot={selectedMealSlot}
                  showActions={!isTrainerView}
                  onEdit={isTrainerView ? handleEditMeal : null}
                />
              ))}
            </SimpleGrid>
          ) : (
            <Center py="xl">
              <Stack gap="xs" align="center">
                <Text c="dimmed">No recommendations available for this category</Text>
                <Text size="sm" c="dimmed">
                  Your trainer will add meal recommendations soon
                </Text>
              </Stack>
            </Center>
          )}
        </ScrollArea>
      </Modal>

      {/* Add Meal Modal (Trainer Only) */}
      {isTrainerView && (
        <Modal
          opened={addMealModalOpened}
          onClose={closeAddMealModal}
          title="Add Meal"
          size="lg"
        >
          <form onSubmit={mealRecommendationForm.onSubmit(handleAddMealRecommendation)}>
            <Stack gap="md">
              <TextInput
                label="Meal Name"
                placeholder="e.g., Grilled Chicken with Vegetables"
                required
                {...mealRecommendationForm.getInputProps('meal_name')}
              />

              <Textarea
                label="Description (Optional)"
                placeholder="Brief description of the meal..."
                rows={3}
                {...mealRecommendationForm.getInputProps('meal_description')}
              />

              <Select
                label="Meal Category"
                required
                data={[
                  { value: 'breakfast', label: 'Breakfast' },
                  { value: 'lunch', label: 'Lunch' },
                  { value: 'dinner', label: 'Dinner' },
                  { value: 'snack', label: 'Snack' },
                  { value: 'quick_eat', label: 'Quick Eat' }
                ]}
                {...mealRecommendationForm.getInputProps('meal_category')}
              />

              <Divider label="Nutritional Information" labelPosition="center" />

              <NumberInput
                label="Calories per Serving"
                required
                min={0}
                {...mealRecommendationForm.getInputProps('calories_per_serving')}
              />

              <SimpleGrid cols={3}>
                <NumberInput
                  label="Protein (g)"
                  min={0}
                  {...mealRecommendationForm.getInputProps('protein_per_serving')}
                />
                <NumberInput
                  label="Carbs (g)"
                  min={0}
                  {...mealRecommendationForm.getInputProps('carbs_per_serving')}
                />
                <NumberInput
                  label="Fats (g)"
                  min={0}
                  {...mealRecommendationForm.getInputProps('fats_per_serving')}
                />
              </SimpleGrid>

              <Select
                label="Recommendation Type"
                data={[
                  { value: 'flexible', label: 'Flexible (Client can choose)' },
                  { value: 'assigned', label: 'Assigned (Specific day/time)' },
                  { value: 'suggested', label: 'Suggested' }
                ]}
                {...mealRecommendationForm.getInputProps('recommendation_type')}
              />

              <NumberInput
                label="Priority (0-10, higher = more recommended)"
                min={0}
                max={10}
                {...mealRecommendationForm.getInputProps('priority')}
              />

              <Textarea
                label="Notes for Client (Optional)"
                placeholder="Any special instructions or tips..."
                rows={2}
                {...mealRecommendationForm.getInputProps('notes')}
              />

              <Divider label="Recipe Details (Optional)" labelPosition="center" />

              <Checkbox
                label="Include full recipe details (ingredients, instructions, tips)"
                {...mealRecommendationForm.getInputProps('include_recipe', { type: 'checkbox' })}
              />

              {mealRecommendationForm.values.include_recipe && (
                <Stack gap="md">
                  <SimpleGrid cols={3}>
                    <NumberInput
                      label="Total Yield (servings)"
                      min={1}
                      {...mealRecommendationForm.getInputProps('total_yield')}
                    />
                    <NumberInput
                      label="Prep Time (min)"
                      min={0}
                      {...mealRecommendationForm.getInputProps('prep_time')}
                    />
                    <NumberInput
                      label="Cook Time (min)"
                      min={0}
                      {...mealRecommendationForm.getInputProps('cook_time')}
                    />
                  </SimpleGrid>

                  <Select
                    label="Difficulty Level"
                    data={[
                      { value: 'beginner', label: 'Beginner' },
                      { value: 'intermediate', label: 'Intermediate' },
                      { value: 'advanced', label: 'Advanced' }
                    ]}
                    {...mealRecommendationForm.getInputProps('difficulty_level')}
                  />

                  <Box>
                    <Text size="sm" fw={500} mb="xs">Ingredients *</Text>
                    {mealRecommendationForm.values.ingredients.map((ingredient, index) => (
                      <Group key={index} mb="xs">
                        <TextInput
                          placeholder={`Ingredient ${index + 1} (e.g., 2 cups chicken breast)`}
                          style={{ flex: 1 }}
                          {...mealRecommendationForm.getInputProps(`ingredients.${index}`)}
                        />
                        {mealRecommendationForm.values.ingredients.length > 1 && (
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => {
                              const newIngredients = mealRecommendationForm.values.ingredients.filter((_, i) => i !== index)
                              mealRecommendationForm.setFieldValue('ingredients', newIngredients)
                            }}
                          >
                            <IconX size={16} />
                          </ActionIcon>
                        )}
                      </Group>
                    ))}
                    <Button
                      variant="light"
                      size="xs"
                      leftSection={<IconPlus size={14} />}
                      onClick={() => {
                        mealRecommendationForm.setFieldValue('ingredients', [...mealRecommendationForm.values.ingredients, ''])
                      }}
                    >
                      Add Ingredient
                    </Button>
                  </Box>

                  <Textarea
                    label="Instructions *"
                    placeholder="Step-by-step cooking instructions..."
                    rows={6}
                    required={mealRecommendationForm.values.include_recipe}
                    {...mealRecommendationForm.getInputProps('instructions')}
                  />

                  <Textarea
                    label="Preparation Tips (Optional)"
                    placeholder="Tips for preparing this meal..."
                    rows={2}
                    {...mealRecommendationForm.getInputProps('prep_tips')}
                  />

                  <Textarea
                    label="Storage Tips (Optional)"
                    placeholder="How to store leftovers..."
                    rows={2}
                    {...mealRecommendationForm.getInputProps('storage_tips')}
                  />

                  <Textarea
                    label="Nutrition Tips (Optional)"
                    placeholder="Nutritional benefits or tips..."
                    rows={2}
                    {...mealRecommendationForm.getInputProps('nutrition_tips')}
                  />

                  <SimpleGrid cols={2}>
                    <Checkbox
                      label="Vegan"
                      {...mealRecommendationForm.getInputProps('is_vegan', { type: 'checkbox' })}
                    />
                    <Checkbox
                      label="Vegetarian"
                      {...mealRecommendationForm.getInputProps('is_vegetarian', { type: 'checkbox' })}
                    />
                    <Checkbox
                      label="Gluten-Free"
                      {...mealRecommendationForm.getInputProps('is_gluten_free', { type: 'checkbox' })}
                    />
                    <Checkbox
                      label="Dairy-Free"
                      {...mealRecommendationForm.getInputProps('is_dairy_free', { type: 'checkbox' })}
                    />
                    <Checkbox
                      label="Quick Meal (< 15 min)"
                      {...mealRecommendationForm.getInputProps('is_quick_meal', { type: 'checkbox' })}
                    />
                    <Checkbox
                      label="Meal Prep Friendly"
                      {...mealRecommendationForm.getInputProps('is_meal_prep_friendly', { type: 'checkbox' })}
                    />
                  </SimpleGrid>
                </Stack>
              )}

              <Group justify="flex-end" mt="md">
                <Button variant="light" onClick={closeAddMealModal}>
                  Cancel
                </Button>
                <Button type="submit">
                  Add Meal
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>
      )}

      {/* Edit Meal Recommendation Modal (Trainer Only) */}
      {isTrainerView && (
        <Modal
          opened={editMealModalOpened}
          onClose={() => {
            closeEditMealModal()
            setSelectedMealToEdit(null)
            mealRecommendationForm.reset()
          }}
          title="Edit Meal Recommendation"
          size="lg"
        >
          <form onSubmit={mealRecommendationForm.onSubmit(handleUpdateMealRecommendation)}>
            <Stack gap="md">
              <TextInput
                label="Meal Name"
                placeholder="e.g., Grilled Chicken with Vegetables"
                required
                {...mealRecommendationForm.getInputProps('meal_name')}
              />

              <Textarea
                label="Description (Optional)"
                placeholder="Brief description of the meal..."
                rows={3}
                {...mealRecommendationForm.getInputProps('meal_description')}
              />

              <Select
                label="Meal Category"
                required
                data={[
                  { value: 'breakfast', label: 'Breakfast' },
                  { value: 'lunch', label: 'Lunch' },
                  { value: 'dinner', label: 'Dinner' },
                  { value: 'snack', label: 'Snack' },
                  { value: 'quick_eat', label: 'Quick Eat' }
                ]}
                {...mealRecommendationForm.getInputProps('meal_category')}
              />

              <Divider label="Nutritional Information" labelPosition="center" />

              <NumberInput
                label="Calories per Serving"
                required
                min={0}
                {...mealRecommendationForm.getInputProps('calories_per_serving')}
              />

              <SimpleGrid cols={3}>
                <NumberInput
                  label="Protein (g)"
                  min={0}
                  {...mealRecommendationForm.getInputProps('protein_per_serving')}
                />
                <NumberInput
                  label="Carbs (g)"
                  min={0}
                  {...mealRecommendationForm.getInputProps('carbs_per_serving')}
                />
                <NumberInput
                  label="Fats (g)"
                  min={0}
                  {...mealRecommendationForm.getInputProps('fats_per_serving')}
                />
              </SimpleGrid>

              <Select
                label="Recommendation Type"
                data={[
                  { value: 'flexible', label: 'Flexible (Client can choose)' },
                  { value: 'assigned', label: 'Assigned (Specific day/time)' },
                  { value: 'suggested', label: 'Suggested' }
                ]}
                {...mealRecommendationForm.getInputProps('recommendation_type')}
              />

              <NumberInput
                label="Priority (0-10, higher = more recommended)"
                min={0}
                max={10}
                {...mealRecommendationForm.getInputProps('priority')}
              />

              <Textarea
                label="Notes for Client (Optional)"
                placeholder="Any special instructions or tips..."
                rows={2}
                {...mealRecommendationForm.getInputProps('notes')}
              />

              <Divider label="Recipe Details (Optional)" labelPosition="center" />

              <Checkbox
                label="Include full recipe details (ingredients, instructions, tips)"
                {...mealRecommendationForm.getInputProps('include_recipe', { type: 'checkbox' })}
              />

              {mealRecommendationForm.values.include_recipe && (
                <Stack gap="md">
                  <SimpleGrid cols={3}>
                    <NumberInput
                      label="Total Yield (servings)"
                      min={1}
                      {...mealRecommendationForm.getInputProps('total_yield')}
                    />
                    <NumberInput
                      label="Prep Time (min)"
                      min={0}
                      {...mealRecommendationForm.getInputProps('prep_time')}
                    />
                    <NumberInput
                      label="Cook Time (min)"
                      min={0}
                      {...mealRecommendationForm.getInputProps('cook_time')}
                    />
                  </SimpleGrid>

                  <Select
                    label="Difficulty Level"
                    data={[
                      { value: 'beginner', label: 'Beginner' },
                      { value: 'intermediate', label: 'Intermediate' },
                      { value: 'advanced', label: 'Advanced' }
                    ]}
                    {...mealRecommendationForm.getInputProps('difficulty_level')}
                  />

                  <Box>
                    <Text size="sm" fw={500} mb="xs">Ingredients *</Text>
                    {mealRecommendationForm.values.ingredients.map((ingredient, index) => (
                      <Group key={index} mb="xs">
                        <TextInput
                          placeholder={`Ingredient ${index + 1} (e.g., 2 cups chicken breast)`}
                          style={{ flex: 1 }}
                          {...mealRecommendationForm.getInputProps(`ingredients.${index}`)}
                        />
                        {mealRecommendationForm.values.ingredients.length > 1 && (
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => {
                              const newIngredients = mealRecommendationForm.values.ingredients.filter((_, i) => i !== index)
                              mealRecommendationForm.setFieldValue('ingredients', newIngredients)
                            }}
                          >
                            <IconX size={16} />
                          </ActionIcon>
                        )}
                      </Group>
                    ))}
                    <Button
                      variant="light"
                      size="xs"
                      leftSection={<IconPlus size={14} />}
                      onClick={() => {
                        mealRecommendationForm.setFieldValue('ingredients', [...mealRecommendationForm.values.ingredients, ''])
                      }}
                    >
                      Add Ingredient
                    </Button>
                  </Box>

                  <Textarea
                    label="Instructions *"
                    placeholder="Step-by-step cooking instructions..."
                    rows={6}
                    required={mealRecommendationForm.values.include_recipe}
                    {...mealRecommendationForm.getInputProps('instructions')}
                  />

                  <Textarea
                    label="Preparation Tips (Optional)"
                    placeholder="Tips for preparing this meal..."
                    rows={2}
                    {...mealRecommendationForm.getInputProps('prep_tips')}
                  />

                  <Textarea
                    label="Storage Tips (Optional)"
                    placeholder="How to store leftovers..."
                    rows={2}
                    {...mealRecommendationForm.getInputProps('storage_tips')}
                  />

                  <Textarea
                    label="Nutrition Tips (Optional)"
                    placeholder="Nutritional benefits or tips..."
                    rows={2}
                    {...mealRecommendationForm.getInputProps('nutrition_tips')}
                  />

                  <SimpleGrid cols={2}>
                    <Checkbox
                      label="Vegan"
                      {...mealRecommendationForm.getInputProps('is_vegan', { type: 'checkbox' })}
                    />
                    <Checkbox
                      label="Vegetarian"
                      {...mealRecommendationForm.getInputProps('is_vegetarian', { type: 'checkbox' })}
                    />
                    <Checkbox
                      label="Gluten-Free"
                      {...mealRecommendationForm.getInputProps('is_gluten_free', { type: 'checkbox' })}
                    />
                    <Checkbox
                      label="Dairy-Free"
                      {...mealRecommendationForm.getInputProps('is_dairy_free', { type: 'checkbox' })}
                    />
                    <Checkbox
                      label="Quick Meal (< 15 min)"
                      {...mealRecommendationForm.getInputProps('is_quick_meal', { type: 'checkbox' })}
                    />
                    <Checkbox
                      label="Meal Prep Friendly"
                      {...mealRecommendationForm.getInputProps('is_meal_prep_friendly', { type: 'checkbox' })}
                    />
                  </SimpleGrid>
                </Stack>
              )}

              <Group justify="flex-end" mt="md">
                <Button variant="light" onClick={() => {
                  closeEditMealModal()
                  setSelectedMealToEdit(null)
                  mealRecommendationForm.reset()
                }}>
                  Cancel
                </Button>
                <Button type="submit">
                  Update Recommendation
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>
      )}

      {/* Recipe Detail Modal */}
      <Modal
        opened={recipeModalOpened}
        onClose={() => {
          closeRecipeModal()
          setSelectedRecipe(null)
        }}
        title={selectedRecipe?.name || 'Recipe Details'}
        size="xl"
      >
        {recipeLoading ? (
          <Center py="xl">
            <Loader size="lg" />
          </Center>
        ) : selectedRecipe ? (
          <ScrollArea h={600}>
            <Stack gap="md">
              {/* Recipe Image */}
              {selectedRecipe.image_url && (
                <Image
                  src={selectedRecipe.image_url}
                  alt={selectedRecipe.name}
                  height={200}
                  fit="cover"
                  radius="sm"
                />
              )}

              {/* Description */}
              {selectedRecipe.description && (
                <Text c="dimmed">{selectedRecipe.description}</Text>
              )}

              {/* Macros */}
              <Card withBorder p="sm">
                <Text fw={600} mb="sm" size="md">Nutritional Information (per serving)</Text>
                <SimpleGrid cols={4} spacing="sm">
                  <Box>
                    <Text size="xs" c="dimmed">Calories</Text>
                    <Text size="lg" fw={700}>{Math.round(selectedRecipe.calories_per_serving || 0)}</Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed">Protein</Text>
                    <Text size="lg" fw={700}>{Math.round(selectedRecipe.protein_per_serving || 0)}g</Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed">Carbs</Text>
                    <Text size="lg" fw={700}>{Math.round(selectedRecipe.carbs_per_serving || 0)}g</Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed">Fats</Text>
                    <Text size="lg" fw={700}>{Math.round(selectedRecipe.fats_per_serving || 0)}g</Text>
                  </Box>
                </SimpleGrid>
                {selectedRecipe.total_yield && (
                  <Text size="sm" c="dimmed" mt="xs">
                    Serves {selectedRecipe.total_yield}
                  </Text>
                )}
              </Card>

              {/* Time & Difficulty */}
              {(selectedRecipe.prep_time || selectedRecipe.cook_time || selectedRecipe.difficulty_level) && (
                <Group gap="md">
                  {selectedRecipe.prep_time && (
                    <Badge leftSection={<IconClock size={14} />} variant="light">
                      Prep: {selectedRecipe.prep_time} min
                    </Badge>
                  )}
                  {selectedRecipe.cook_time && (
                    <Badge leftSection={<IconClock size={14} />} variant="light">
                      Cook: {selectedRecipe.cook_time} min
                    </Badge>
                  )}
                  {selectedRecipe.difficulty_level && (
                    <Badge variant="light" tt="capitalize">
                      {selectedRecipe.difficulty_level}
                    </Badge>
                  )}
                </Group>
              )}

              {/* Dietary Badges */}
              <Group gap="xs">
                {selectedRecipe.is_vegan && <Badge color="green" leftSection={<IconLeaf size={12} />}>Vegan</Badge>}
                {selectedRecipe.is_vegetarian && <Badge color="teal" leftSection={<IconLeaf size={12} />}>Vegetarian</Badge>}
                {selectedRecipe.is_gluten_free && <Badge color="orange" leftSection={<IconWheat size={12} />}>Gluten-Free</Badge>}
                {selectedRecipe.is_dairy_free && <Badge color="blue" leftSection={<IconMilk size={12} />}>Dairy-Free</Badge>}
                {selectedRecipe.is_quick_meal && <Badge color="yellow" leftSection={<IconClockHour4 size={12} />}>Quick</Badge>}
                {selectedRecipe.is_meal_prep_friendly && <Badge color="grape" leftSection={<IconChefHat size={12} />}>Meal Prep</Badge>}
              </Group>

              {/* Ingredients */}
              {selectedRecipe.ingredients && Array.isArray(selectedRecipe.ingredients) && selectedRecipe.ingredients.length > 0 && (
                <Card withBorder p="md">
                  <Group mb="sm">
                    <IconChecklist size={20} />
                    <Text fw={600}>Ingredients</Text>
                  </Group>
                  <List spacing="xs">
                    {selectedRecipe.ingredients.map((ingredient, idx) => (
                      <List.Item key={idx}>
                        {typeof ingredient === 'string' ? (
                          <Text size="sm">{ingredient}</Text>
                        ) : (
                          <Text size="sm">
                            {ingredient.amount} {ingredient.unit} {ingredient.name || ingredient.food_name}
                            {ingredient.notes && <Text component="span" c="dimmed" size="xs"> ({ingredient.notes})</Text>}
                          </Text>
                        )}
                      </List.Item>
                    ))}
                  </List>
                </Card>
              )}

              {/* Instructions */}
              {selectedRecipe.instructions && (
                <Card withBorder p="md">
                  <Group mb="sm">
                    <IconBook size={20} />
                    <Text fw={600}>Instructions</Text>
                  </Group>
                  <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
                    {selectedRecipe.instructions}
                  </Text>
                </Card>
              )}

              {/* Tips Section */}
              {(selectedRecipe.prep_tips || selectedRecipe.storage_tips || selectedRecipe.nutrition_tips) && (
                <Stack gap="sm">
                  {selectedRecipe.prep_tips && (
                    <Card withBorder p="sm">
                      <Group mb="xs">
                        <IconInfoCircle size={16} />
                        <Text fw={600} size="sm">Preparation Tips</Text>
                      </Group>
                      <Text size="sm" c="dimmed">{selectedRecipe.prep_tips}</Text>
                    </Card>
                  )}
                  {selectedRecipe.storage_tips && (
                    <Card withBorder p="sm">
                      <Group mb="xs">
                        <IconInfoCircle size={16} />
                        <Text fw={600} size="sm">Storage Instructions</Text>
                      </Group>
                      <Text size="sm" c="dimmed">{selectedRecipe.storage_tips}</Text>
                    </Card>
                  )}
                  {selectedRecipe.nutrition_tips && (
                    <Card withBorder p="sm">
                      <Group mb="xs">
                        <IconInfoCircle size={16} />
                        <Text fw={600} size="sm">Nutrition Tips</Text>
                      </Group>
                      <Text size="sm" c="dimmed">{selectedRecipe.nutrition_tips}</Text>
                    </Card>
                  )}
                </Stack>
              )}

              {/* Custom Meal Notes (for meal recommendations without recipes) */}
              {selectedRecipe.is_custom_meal && selectedRecipe.notes && (
                <Card withBorder p="sm">
                  <Group mb="xs">
                    <IconInfoCircle size={16} />
                    <Text fw={600} size="sm">Trainer Notes</Text>
                  </Group>
                  <Text size="sm" c="dimmed">{selectedRecipe.notes}</Text>
                </Card>
              )}

              {/* Equipment Needed */}
              {selectedRecipe.equipment_needed && Array.isArray(selectedRecipe.equipment_needed) && selectedRecipe.equipment_needed.length > 0 && (
                <Card withBorder p="sm">
                  <Group mb="xs">
                    <IconShoppingCart size={16} />
                    <Text fw={600} size="sm">Equipment Needed</Text>
                  </Group>
                  <Group gap="xs">
                    {selectedRecipe.equipment_needed.map((equipment, idx) => (
                      <Badge key={idx} variant="light" size="sm">
                        {equipment}
                      </Badge>
                    ))}
                  </Group>
                </Card>
              )}

              {/* Substitution Options */}
              {selectedRecipe.substitution_options && Array.isArray(selectedRecipe.substitution_options) && selectedRecipe.substitution_options.length > 0 && (
                <Card withBorder p="sm">
                  <Text fw={600} size="sm" mb="xs">Substitution Options</Text>
                  <List spacing="xs" size="sm">
                    {selectedRecipe.substitution_options.map((sub, idx) => (
                      <List.Item key={idx}>
                        <Text size="sm">
                          {typeof sub === 'string' ? sub : `${sub.replace || sub.original} → ${sub.with || sub.replacement}`}
                        </Text>
                      </List.Item>
                    ))}
                  </List>
                </Card>
              )}

              {/* Add to Meal Plan Button (for clients) */}
              {!isTrainerView && !selectedRecipe.is_custom_meal && (
                <Button
                  leftSection={<IconPlus size={16} />}
                  fullWidth
                  onClick={() => {
                    // TODO: Implement add to meal plan functionality
                    notifications.show({
                      title: 'Coming Soon',
                      message: 'Add to meal plan functionality will be available soon',
                      color: 'blue'
                    })
                  }}
                >
                  Add to Meal Plan
                </Button>
              )}
            </Stack>
          </ScrollArea>
        ) : (
          <Text c="dimmed" ta="center" py="xl">
            No recipe details available
          </Text>
        )}
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
