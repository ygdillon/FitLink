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
  Loader,
  Alert,
  Tabs,
  Paper,
  Stepper,
  Progress,
  Grid,
  Switch,
  Tooltip,
  Box
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './NutritionBuilder.css'

function NutritionBuilder() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clientId = searchParams.get('clientId')

  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [nutritionProfile, setNutritionProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeStep, setActiveStep] = useState(0)
  const [calculatedMacros, setCalculatedMacros] = useState(null)
  const [saving, setSaving] = useState(false)

  // Form for nutrition profile
  const profileForm = useForm({
    initialValues: {
      // Body Composition
      current_weight: '',
      height_inches: '', // Display in inches, convert to cm for backend
      height_cm: '', // Internal field for backend
      age: '',
      biological_sex: '',
      body_fat_percentage: '',
      weight_trend: '',
      
      // Activity
      training_frequency: '',
      training_type: '',
      training_duration: '',
      daily_activity_level: '',
      steps_per_day: '',
      sleep_hours_min: '',
      sleep_hours_max: '',
      sleep_hours: '', // Combined value for backend
      
      // Dietary Preferences
      dietary_framework: '',
      allergies: [],
      dislikes: [],
      cooking_skill_level: '',
      meal_prep_time: '',
      
      // Goals
      primary_goal: '',
      rate_of_change: '',
      target_weight: ''
    }
  })

  // Form for macro calculation
  const macroForm = useForm({
    initialValues: {
      calculation_method: 'mifflin_st_jeor',
      weight_lbs: '', // Display in lbs
      height_inches: '', // Display in inches
      height_cm: '', // Internal field for backend
      age: '',
      biological_sex: '',
      activity_level: '',
      goal: '',
      rate_of_change: 'moderate'
    }
  })

  // Form for nutrition plan
  const planForm = useForm({
    initialValues: {
      plan_name: '',
      nutrition_approach: 'macro_tracking',
      meal_frequency: 4,
      notes: ''
    }
  })

  useEffect(() => {
    fetchClients()
    if (clientId) {
      handleSelectClient(clientId)
    }
  }, [clientId])

  const fetchClients = async () => {
    try {
      const response = await api.get('/trainer/clients')
      setClients(response.data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectClient = async (clientId) => {
    try {
      setLoading(true)
      
      // Always fetch full client profile to get all fields (height, weight, age, gender, etc.)
      // The clients list only has limited fields
      const clientRes = await api.get(`/trainer/clients/${clientId}`)
      const client = clientRes.data
      setSelectedClient(client)
      
      console.log('Client data loaded:', {
        weight: client.weight,
        height: client.height,
        age: client.age,
        gender: client.gender,
        primary_goal: client.primary_goal,
        goal_target: client.goal_target,
        activity_level: client.activity_level
      })

      // Helper function to extract target weight from goal_target string
      const extractTargetWeight = (goalTarget, currentWeight) => {
        if (!goalTarget) return ''
        
        // First, try to find explicit target weight patterns like "reach 140 lbs", "get to 150 lbs", "140 lbs goal"
        const explicitTargetMatch = goalTarget.match(/(?:reach|get to|goal.*?|target.*?|weigh)\s*(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?|kg|kilograms?)/i)
        if (explicitTargetMatch) {
          return parseFloat(explicitTargetMatch[1])
        }
        
        // If current weight is available, calculate target from "Lose X lbs" or "Gain X lbs"
        if (currentWeight) {
          const loseMatch = goalTarget.match(/lose\s+(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?|kg|kilograms?)/i)
          if (loseMatch) {
            const weightToLose = parseFloat(loseMatch[1])
            return Math.max(0, parseFloat(currentWeight) - weightToLose)
          }
          
          const gainMatch = goalTarget.match(/gain\s+(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?|kg|kilograms?)/i)
          if (gainMatch) {
            const weightToGain = parseFloat(gainMatch[1])
            return parseFloat(currentWeight) + weightToGain
          }
        }
        
        // Fallback: extract any weight value mentioned
        const weightMatch = goalTarget.match(/(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?|kg|kilograms?)/i)
        if (weightMatch) {
          const extractedWeight = parseFloat(weightMatch[1])
          // Only use if it's a reasonable target weight (between 80-500 lbs)
          if (extractedWeight >= 80 && extractedWeight <= 500) {
            return extractedWeight
          }
        }
        
        return ''
      }

      // Helper function to map primary_goal to nutrition goal format
      const mapGoalToNutritionGoal = (goal) => {
        if (!goal) return ''
        const goalLower = goal.toLowerCase()
        if (goalLower.includes('lose') || goalLower.includes('fat') || goalLower.includes('weight loss')) {
          return 'lose_fat'
        }
        if (goalLower.includes('gain') || goalLower.includes('muscle') || goalLower.includes('bulk')) {
          return 'build_muscle'
        }
        if (goalLower.includes('maintain')) {
          return 'maintain'
        }
        if (goalLower.includes('performance') || goalLower.includes('athletic')) {
          return 'performance'
        }
        if (goalLower.includes('health')) {
          return 'health'
        }
        return ''
      }

      // Pre-fill form with known client data
      const formValues = {
        // Body Composition - Pre-filled from client profile
        current_weight: client.weight ? parseFloat(client.weight) : '',
        height_inches: client.height ? parseFloat((parseFloat(client.height) * 0.393701).toFixed(1)) : '',
        height_cm: client.height ? parseFloat(client.height) : '',
        age: client.age ? parseInt(client.age) : '',
        biological_sex: client.gender ? 
          (client.gender.toLowerCase() === 'male' ? 'male' : 
           client.gender.toLowerCase() === 'female' ? 'female' : 'other') : '',
        body_fat_percentage: '',
        weight_trend: '',
        
        // Activity & Lifestyle - Pre-filled from client profile
        training_frequency: client.training_days_per_week ? parseInt(client.training_days_per_week) : '',
        training_type: '',
        training_duration: client.session_duration_minutes ? parseInt(client.session_duration_minutes) : '',
        daily_activity_level: client.activity_level || '',
        steps_per_day: '',
        sleep_hours_min: (() => {
          if (client.sleep_hours) {
            const sleepMatch = client.sleep_hours.toString().match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/)
            if (sleepMatch) {
              return parseFloat(sleepMatch[1])
            } else {
              const singleValue = parseFloat(client.sleep_hours)
              return !isNaN(singleValue) ? singleValue : ''
            }
          }
          return ''
        })(),
        sleep_hours_max: (() => {
          if (client.sleep_hours) {
            const sleepMatch = client.sleep_hours.toString().match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/)
            if (sleepMatch) {
              return parseFloat(sleepMatch[2])
            } else {
              const singleValue = parseFloat(client.sleep_hours)
              return !isNaN(singleValue) ? singleValue : ''
            }
          }
          return ''
        })(),
        sleep_hours: client.sleep_hours || '',
        
        // Nutrition History - Pre-filled from client profile
        current_eating_habits: client.average_daily_eating || client.nutrition_habits || '',
        previous_diet_attempts: [],
        nutrition_challenges: client.barriers || '',
        food_relationship: '',
        
        // Dietary Preferences
        dietary_framework: '',
        allergies: [],
        dislikes: [],
        cooking_skill_level: '',
        meal_prep_time: '',
        
        // Goals - Pre-filled from client profile
        primary_goal: mapGoalToNutritionGoal(client.primary_goal) || '',
        rate_of_change: '',
        target_weight: extractTargetWeight(client.goal_target, client.weight) ? parseFloat(extractTargetWeight(client.goal_target, client.weight)) : ''
      }

      // Fetch nutrition profile and merge with client data
      try {
        const profileRes = await api.get(`/nutrition/profiles/${clientId}`)
        if (profileRes.data) {
          setNutritionProfile(profileRes.data)
          // Convert height_cm to inches for display
          const profileData = { ...profileRes.data }
          if (profileData.height_cm) {
            profileData.height_inches = (parseFloat(profileData.height_cm) * 0.393701).toFixed(1)
          }
          // Parse sleep_hours range if it exists
          if (profileData.sleep_hours) {
            const sleepMatch = profileData.sleep_hours.toString().match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/)
            if (sleepMatch) {
              profileData.sleep_hours_min = parseFloat(sleepMatch[1])
              profileData.sleep_hours_max = parseFloat(sleepMatch[2])
            } else {
              // Single value, set both min and max
              const singleValue = parseFloat(profileData.sleep_hours)
              if (!isNaN(singleValue)) {
                profileData.sleep_hours_min = singleValue
                profileData.sleep_hours_max = singleValue
              }
            }
          }
          // Merge with client data, profile data takes precedence
          const mergedValues = { ...formValues, ...profileData }
          console.log('Setting form values (with existing profile):', {
            current_weight: mergedValues.current_weight,
            height_inches: mergedValues.height_inches,
            age: mergedValues.age,
            biological_sex: mergedValues.biological_sex,
            primary_goal: mergedValues.primary_goal,
            target_weight: mergedValues.target_weight
          })
          profileForm.setValues(mergedValues)
        } else {
          // No existing profile, use client data
          console.log('Setting form values (no existing profile):', {
            current_weight: formValues.current_weight,
            height_inches: formValues.height_inches,
            age: formValues.age,
            biological_sex: formValues.biological_sex,
            primary_goal: formValues.primary_goal,
            target_weight: formValues.target_weight
          })
          profileForm.setValues(formValues)
        }
      } catch (error) {
        // Profile doesn't exist yet, use client data
        console.log('No nutrition profile found, using client data')
        console.log('Setting form values (error case):', {
          current_weight: formValues.current_weight,
          height_inches: formValues.height_inches,
          age: formValues.age,
          biological_sex: formValues.biological_sex,
          primary_goal: formValues.primary_goal,
          target_weight: formValues.target_weight
        })
        profileForm.setValues(formValues)
      }
    } catch (error) {
      console.error('Error selecting client:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load client data',
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCalculateBMR = async () => {
    const values = macroForm.values
    
    // Convert height_inches to height_cm if needed
    let heightCm = values.height_cm
    if (values.height_inches && !heightCm) {
      heightCm = parseFloat(values.height_inches) * 2.54
    }
    
    if (!values.weight_lbs || !heightCm || !values.age || !values.biological_sex) {
      notifications.show({
        title: 'Missing Information',
        message: 'Please fill in all required fields',
        color: 'red'
      })
      return
    }

    try {
      // Convert weight from lbs to kg for BMR calculation (API expects kg)
      const weightKg = parseFloat(values.weight_lbs) / 2.20462
      
      const bmrRes = await api.post('/nutrition/calculate/bmr', {
        weight_kg: weightKg,
        height_cm: parseFloat(heightCm),
        age: parseInt(values.age),
        biological_sex: values.biological_sex
      })

      const tdeeRes = await api.post('/nutrition/calculate/tdee', {
        bmr: bmrRes.data.bmr,
        activity_level: values.activity_level
      })

      const macrosRes = await api.post('/nutrition/calculate/macros', {
        weight_lbs: parseFloat(values.weight_lbs),
        tdee: tdeeRes.data.tdee,
        goal: values.goal,
        rate_of_change: values.rate_of_change,
        biological_sex: values.biological_sex,
        in_deficit: values.goal === 'lose_fat'
      })

      setCalculatedMacros({
        bmr: bmrRes.data.bmr,
        tdee: tdeeRes.data.tdee,
        activity_multiplier: tdeeRes.data.activity_multiplier,
        ...macrosRes.data
      })

      notifications.show({
        title: 'Macros Calculated',
        message: 'Macronutrient targets have been calculated',
        color: 'green'
      })
    } catch (error) {
      console.error('Error calculating macros:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to calculate macros',
        color: 'red'
      })
    }
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      const values = { ...profileForm.values }
      
      // Ensure height_cm is set from height_inches if needed
      if (values.height_inches && !values.height_cm) {
        values.height_cm = parseFloat(values.height_inches) * 2.54
      }
      
      // Convert height_cm to number if it's a string
      if (values.height_cm) {
        values.height_cm = parseFloat(values.height_cm)
      }
      
      // Convert current_weight to number if it's a string
      if (values.current_weight) {
        values.current_weight = parseFloat(values.current_weight)
      }
      
      // Convert age to integer if it's a string
      if (values.age) {
        values.age = parseInt(values.age)
      }
      
      // Remove height_inches from payload (backend expects height_cm)
      const { height_inches, ...profileData } = values
      
      // Backend expects user_id for nutrition profiles
      const clientUserId = selectedClient.user_id
      if (!clientUserId) {
        throw new Error('Client user_id not found')
      }
      
      await api.post(`/nutrition/profiles/${clientUserId}`, profileData)
      
      notifications.show({
        title: 'Success',
        message: 'Nutrition profile saved',
        color: 'green'
      })
      
      setActiveStep(1)
    } catch (error) {
      console.error('Error saving profile:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to save nutrition profile',
        color: 'red'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCreatePlan = async () => {
    if (!calculatedMacros) {
      notifications.show({
        title: 'Error',
        message: 'Please calculate macros first',
        color: 'red'
      })
      return
    }

    try {
      setSaving(true)
      const values = planForm.values

      // Nutrition plans use user_id (from users table), not client table id
      // selectedClient comes from /trainer/clients/:clientId which returns client table row
      // We need to use the user_id field
      const clientUserId = selectedClient.user_id
      
      console.log('Creating nutrition plan:', {
        selectedClient,
        clientUserId,
        hasUserId: !!selectedClient.user_id,
        hasId: !!selectedClient.id
      })
      
      if (!clientUserId) {
        console.error('Client object:', selectedClient)
        throw new Error('Client user_id not found. Client object: ' + JSON.stringify(selectedClient))
      }
      
      const planData = {
        client_id: clientUserId,
        plan_name: values.plan_name || `${selectedClient.name}'s Nutrition Plan`,
        daily_calories: calculatedMacros.target_calories,
        daily_protein: calculatedMacros.target_protein,
        daily_carbs: calculatedMacros.target_carbs,
        daily_fats: calculatedMacros.target_fats,
        nutrition_approach: values.nutrition_approach,
        meal_frequency: values.meal_frequency,
        calculation_method: macroForm.values.calculation_method,
        activity_multiplier: calculatedMacros.activity_multiplier,
        bmr: calculatedMacros.bmr,
        tdee: calculatedMacros.tdee,
        goal_adjustment: calculatedMacros.tdee - calculatedMacros.target_calories,
        plan_type: macroForm.values.goal,
        rate_of_change: macroForm.values.rate_of_change,
        notes: values.notes
      }

      await api.post('/nutrition/plans', planData)

      notifications.show({
        title: 'Success',
        message: 'Nutrition plan created successfully',
        color: 'green'
      })

      navigate(`/trainer/clients/${selectedClient.user_id || selectedClient.id}`)
    } catch (error) {
      console.error('Error creating plan:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to create nutrition plan',
        color: 'red'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading && !selectedClient) {
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
      <Title order={1} mb="xl">Nutrition Plan Builder</Title>

      {!selectedClient ? (
        <Paper p="md" withBorder>
          <Stack gap="md">
            <Text size="lg" fw={500}>Select a Client</Text>
            <Select
              placeholder="Choose a client"
              data={clients.map(c => ({
                value: String(c.id), // Use client table id, not user_id
                label: c.name || c.email
              }))}
              onChange={(value) => value && handleSelectClient(value)}
            />
          </Stack>
        </Paper>
      ) : (
        <Stack gap="xl">
          <Paper p="md" withBorder>
            <Group justify="space-between">
              <div>
                <Text size="lg" fw={600}>{selectedClient.name}</Text>
                <Text size="sm" c="dimmed">{selectedClient.email}</Text>
              </div>
              <Button variant="light" onClick={() => setSelectedClient(null)}>
                Change Client
              </Button>
            </Group>
          </Paper>

          <Stepper active={activeStep} onStepClick={setActiveStep} breakpoint="sm">
            <Stepper.Step label="Profile" description="Client nutrition profile">
              <Paper p="md" withBorder mt="xl">
                <Stack gap="md">
                  <Title order={3}>Client Nutrition Profile</Title>
                  
                  <Tabs defaultValue="body">
                    <Tabs.List>
                      <Tabs.Tab value="body">Body & Activity</Tabs.Tab>
                      <Tabs.Tab value="dietary">Dietary Preferences</Tabs.Tab>
                      <Tabs.Tab value="goals">Goals</Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="body" pt="md">
                      <Grid>
                        <Grid.Col span={6}>
                          <NumberInput
                            label="Current Weight (lbs)"
                            {...profileForm.getInputProps('current_weight')}
                            min={0}
                          />
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <NumberInput
                            label="Height (inches)"
                            {...profileForm.getInputProps('height_inches')}
                            min={0}
                            decimalScale={1}
                            onChange={(value) => {
                              // Convert inches to cm for backend storage
                              const inches = parseFloat(value) || 0
                              const cm = (inches * 2.54).toFixed(1)
                              profileForm.setFieldValue('height_inches', value)
                              profileForm.setFieldValue('height_cm', cm)
                            }}
                          />
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <NumberInput
                            label="Age"
                            {...profileForm.getInputProps('age')}
                            min={0}
                            max={120}
                          />
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Select
                            label="Biological Sex"
                            data={[
                              { value: 'male', label: 'Male' },
                              { value: 'female', label: 'Female' },
                              { value: 'other', label: 'Other' }
                            ]}
                            {...profileForm.getInputProps('biological_sex')}
                          />
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <NumberInput
                            label="Body Fat % (optional)"
                            {...profileForm.getInputProps('body_fat_percentage')}
                            min={0}
                            max={100}
                            decimalScale={1}
                          />
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Select
                            label="Weight Trend"
                            data={[
                              { value: 'gaining', label: 'Gaining' },
                              { value: 'losing', label: 'Losing' },
                              { value: 'stable', label: 'Stable' }
                            ]}
                            {...profileForm.getInputProps('weight_trend')}
                          />
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <NumberInput
                            label="Training Frequency (days/week)"
                            {...profileForm.getInputProps('training_frequency')}
                            min={0}
                            max={7}
                          />
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Select
                            label="Training Type"
                            data={[
                              { value: 'strength', label: 'Strength' },
                              { value: 'cardio', label: 'Cardio' },
                              { value: 'both', label: 'Both' },
                              { value: 'athletic', label: 'Athletic' }
                            ]}
                            {...profileForm.getInputProps('training_type')}
                          />
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <NumberInput
                            label="Training Duration (minutes)"
                            {...profileForm.getInputProps('training_duration')}
                            min={0}
                          />
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Select
                            label="Daily Activity Level"
                            data={[
                              { value: 'sedentary', label: 'Sedentary' },
                              { value: 'lightly_active', label: 'Lightly Active' },
                              { value: 'moderately_active', label: 'Moderately Active' },
                              { value: 'very_active', label: 'Very Active' }
                            ]}
                            {...profileForm.getInputProps('daily_activity_level')}
                          />
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Stack gap="xs">
                            <Text size="sm" fw={500}>Sleep Hours (Range)</Text>
                            <Group gap="xs" align="flex-end">
                              <NumberInput
                                label="Min"
                                {...profileForm.getInputProps('sleep_hours_min')}
                                min={0}
                                max={24}
                                decimalScale={1}
                                style={{ flex: 1 }}
                                onChange={(value) => {
                                  profileForm.setFieldValue('sleep_hours_min', value)
                                  const min = parseFloat(value) || 0
                                  const max = parseFloat(profileForm.values.sleep_hours_max) || 0
                                  if (min > 0 && max > 0) {
                                    profileForm.setFieldValue('sleep_hours', `${min}-${max}`)
                                  } else if (min > 0) {
                                    profileForm.setFieldValue('sleep_hours', min.toString())
                                  }
                                }}
                              />
                              <Text size="lg" c="dimmed" style={{ marginBottom: '0.5rem' }}>-</Text>
                              <NumberInput
                                label="Max"
                                {...profileForm.getInputProps('sleep_hours_max')}
                                min={0}
                                max={24}
                                decimalScale={1}
                                style={{ flex: 1 }}
                                onChange={(value) => {
                                  profileForm.setFieldValue('sleep_hours_max', value)
                                  const min = parseFloat(profileForm.values.sleep_hours_min) || 0
                                  const max = parseFloat(value) || 0
                                  if (min > 0 && max > 0) {
                                    profileForm.setFieldValue('sleep_hours', `${min}-${max}`)
                                  } else if (max > 0) {
                                    profileForm.setFieldValue('sleep_hours', max.toString())
                                  }
                                }}
                              />
                            </Group>
                          </Stack>
                        </Grid.Col>
                      </Grid>
                    </Tabs.Panel>

                    <Tabs.Panel value="dietary" pt="md">
                      <Grid>
                        <Grid.Col span={6}>
                          <Select
                            label="Dietary Framework"
                            data={[
                              { value: 'omnivore', label: 'Omnivore' },
                              { value: 'vegetarian', label: 'Vegetarian' },
                              { value: 'vegan', label: 'Vegan' },
                              { value: 'pescatarian', label: 'Pescatarian' }
                            ]}
                            {...profileForm.getInputProps('dietary_framework')}
                          />
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Select
                            label="Cooking Skill Level"
                            data={[
                              { value: 'beginner', label: 'Beginner' },
                              { value: 'intermediate', label: 'Intermediate' },
                              { value: 'advanced', label: 'Advanced' }
                            ]}
                            {...profileForm.getInputProps('cooking_skill_level')}
                          />
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Select
                            label="Meal Prep Time"
                            data={[
                              { value: 'none', label: 'None' },
                              { value: '1-2_hours_week', label: '1-2 Hours/Week' },
                              { value: 'daily', label: 'Daily' }
                            ]}
                            {...profileForm.getInputProps('meal_prep_time')}
                          />
                        </Grid.Col>
                      </Grid>
                    </Tabs.Panel>

                    <Tabs.Panel value="goals" pt="md">
                      <Grid>
                        <Grid.Col span={6}>
                          <Select
                            label="Primary Goal"
                            data={[
                              { value: 'lose_fat', label: 'Lose Fat' },
                              { value: 'build_muscle', label: 'Build Muscle' },
                              { value: 'maintain', label: 'Maintain' },
                              { value: 'performance', label: 'Performance' },
                              { value: 'health', label: 'Health' }
                            ]}
                            {...profileForm.getInputProps('primary_goal')}
                          />
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Select
                            label="Rate of Change"
                            data={[
                              { value: 'aggressive', label: 'Aggressive' },
                              { value: 'moderate', label: 'Moderate' },
                              { value: 'conservative', label: 'Conservative' }
                            ]}
                            {...profileForm.getInputProps('rate_of_change')}
                          />
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <NumberInput
                            label="Target Weight (lbs)"
                            {...profileForm.getInputProps('target_weight')}
                            min={0}
                          />
                        </Grid.Col>
                      </Grid>
                    </Tabs.Panel>
                  </Tabs>

                  <Group justify="flex-end" mt="xl">
                    <Button onClick={async () => {
                      await handleSaveProfile()
                      // Pre-fill macro form with profile data when moving to next step
                      const profileValues = profileForm.values
                      if (profileValues.current_weight) {
                        macroForm.setFieldValue('weight_lbs', parseFloat(profileValues.current_weight))
                      }
                      if (profileValues.height_inches) {
                        macroForm.setFieldValue('height_inches', profileValues.height_inches)
                        macroForm.setFieldValue('height_cm', profileValues.height_cm)
                      }
                      if (profileValues.age) {
                        macroForm.setFieldValue('age', profileValues.age)
                      }
                      if (profileValues.biological_sex) {
                        macroForm.setFieldValue('biological_sex', profileValues.biological_sex)
                      }
                      if (profileValues.daily_activity_level) {
                        macroForm.setFieldValue('activity_level', profileValues.daily_activity_level)
                      }
                      if (profileValues.primary_goal) {
                        macroForm.setFieldValue('goal', profileValues.primary_goal)
                      }
                      if (profileValues.rate_of_change) {
                        macroForm.setFieldValue('rate_of_change', profileValues.rate_of_change)
                      }
                    }} loading={saving}>
                      Save Profile & Continue
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            </Stepper.Step>

            <Stepper.Step label="Calculate" description="Calculate macros">
              <Paper p="md" withBorder mt="xl">
                <Stack gap="md">
                  <Title order={3}>Calculate Macronutrients</Title>
                  
                  <Grid>
                    <Grid.Col span={6}>
                      <NumberInput
                        label="Weight (lbs)"
                        {...macroForm.getInputProps('weight_lbs')}
                        min={0}
                        required
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <NumberInput
                        label="Height (inches)"
                        {...macroForm.getInputProps('height_inches')}
                        min={0}
                        decimalScale={1}
                        required
                        onChange={(value) => {
                          // Convert inches to cm for backend storage
                          const inches = parseFloat(value) || 0
                          const cm = (inches * 2.54).toFixed(1)
                          macroForm.setFieldValue('height_inches', value)
                          macroForm.setFieldValue('height_cm', cm)
                        }}
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <NumberInput
                        label="Age"
                        {...macroForm.getInputProps('age')}
                        min={0}
                        max={120}
                        required
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Select
                        label="Biological Sex"
                        data={[
                          { value: 'male', label: 'Male' },
                          { value: 'female', label: 'Female' }
                        ]}
                        {...macroForm.getInputProps('biological_sex')}
                        required
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Select
                        label="Activity Level"
                        data={[
                          { value: 'sedentary', label: 'Sedentary' },
                          { value: 'lightly_active', label: 'Lightly Active' },
                          { value: 'moderately_active', label: 'Moderately Active' },
                          { value: 'very_active', label: 'Very Active' },
                          { value: 'extremely_active', label: 'Extremely Active' }
                        ]}
                        {...macroForm.getInputProps('activity_level')}
                        required
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Select
                        label="Goal"
                        data={[
                          { value: 'lose_fat', label: 'Lose Fat' },
                          { value: 'build_muscle', label: 'Build Muscle' },
                          { value: 'maintain', label: 'Maintain' },
                          { value: 'performance', label: 'Performance' }
                        ]}
                        {...macroForm.getInputProps('goal')}
                        required
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Select
                        label="Rate of Change"
                        data={[
                          { value: 'aggressive', label: 'Aggressive' },
                          { value: 'moderate', label: 'Moderate' },
                          { value: 'conservative', label: 'Conservative' }
                        ]}
                        {...macroForm.getInputProps('rate_of_change')}
                      />
                    </Grid.Col>
                  </Grid>

                  <Button onClick={handleCalculateBMR} fullWidth mt="md">
                    Calculate Macros
                  </Button>

                  {calculatedMacros && (
                    <Paper p="md" withBorder mt="md" style={{ backgroundColor: 'var(--mantine-color-green-0)' }}>
                      <Stack gap="md">
                        <Title order={4}>Calculated Targets</Title>
                        
                        {/* Energy Metrics */}
                        <Box>
                          <Text size="sm" fw={600} mb="xs">Energy Requirements</Text>
                          <SimpleGrid cols={2} spacing="md">
                            <Tooltip 
                              label="Basal Metabolic Rate (BMR) - The number of calories your body burns at rest to maintain basic functions like breathing, circulation, and cell production."
                              withArrow
                              multiline
                              width={300}
                            >
                              <div>
                                <Text size="sm" c="dimmed">BMR</Text>
                                <Text size="xl" fw={700}>{calculatedMacros.bmr} cal</Text>
                                <Text size="xs" c="dimmed">Basal Metabolic Rate</Text>
                              </div>
                            </Tooltip>
                            <Tooltip 
                              label="Total Daily Energy Expenditure (TDEE) - Your BMR multiplied by your activity level. This is the total calories you burn per day including all activities."
                              withArrow
                              multiline
                              width={300}
                            >
                              <div>
                                <Text size="sm" c="dimmed">TDEE</Text>
                                <Text size="xl" fw={700}>{calculatedMacros.tdee} cal</Text>
                                <Text size="xs" c="dimmed">Total Daily Energy Expenditure</Text>
                              </div>
                            </Tooltip>
                            <Tooltip 
                              label="Target Calories - Your daily calorie goal based on your TDEE and fitness goal. Adjusted for weight loss, muscle gain, or maintenance."
                              withArrow
                              multiline
                              width={300}
                            >
                              <div>
                                <Text size="sm" c="dimmed">Target Calories</Text>
                                <Text size="xl" fw={700}>{calculatedMacros.target_calories} cal</Text>
                                <Text size="xs" c="dimmed">Daily Calorie Goal</Text>
                              </div>
                            </Tooltip>
                          </SimpleGrid>
                        </Box>

                        <Divider />

                        {/* Macronutrients */}
                        <Box>
                          <Text size="sm" fw={600} mb="xs">Macronutrient Targets</Text>
                          <SimpleGrid cols={3} spacing="md">
                            <Tooltip 
                              label="Protein - Essential for muscle repair, growth, and maintenance. Calculated based on body weight and goals (typically 0.8-1.0g per lb of bodyweight)."
                              withArrow
                              multiline
                              width={300}
                            >
                              <div>
                                <Text size="sm" c="dimmed">Protein</Text>
                                <Text size="xl" fw={700}>{calculatedMacros.target_protein} g</Text>
                                <Text size="xs" c="dimmed">
                                  {calculatedMacros.breakdown?.protein_percent || 0}% of calories
                                </Text>
                              </div>
                            </Tooltip>
                            <Tooltip 
                              label="Carbohydrates - Your body's primary energy source. Calculated as the remaining calories after protein and fat needs are met. Carbs = (Target Calories - Protein Calories - Fat Calories) ÷ 4"
                              withArrow
                              multiline
                              width={300}
                            >
                              <div>
                                <Text size="sm" c="dimmed">Carbs</Text>
                                <Text size="xl" fw={700}>{calculatedMacros.target_carbs} g</Text>
                                <Text size="xs" c="dimmed">
                                  {calculatedMacros.breakdown?.carbs_percent || 0}% of calories
                                </Text>
                              </div>
                            </Tooltip>
                            <Tooltip 
                              label="Fats - Essential for hormone production, vitamin absorption, and cell function. Calculated based on body weight (typically 0.35-0.4g per lb of bodyweight)."
                              withArrow
                              multiline
                              width={300}
                            >
                              <div>
                                <Text size="sm" c="dimmed">Fats</Text>
                                <Text size="xl" fw={700}>{calculatedMacros.target_fats} g</Text>
                                <Text size="xs" c="dimmed">
                                  {calculatedMacros.breakdown?.fats_percent || 0}% of calories
                                </Text>
                              </div>
                            </Tooltip>
                          </SimpleGrid>
                        </Box>

                        {/* Macro Breakdown Summary */}
                        {calculatedMacros.breakdown && (
                          <Box mt="xs">
                            <Text size="xs" c="dimmed">
                              Macro Split: {calculatedMacros.breakdown.protein_percent}% Protein • {calculatedMacros.breakdown.carbs_percent}% Carbs • {calculatedMacros.breakdown.fats_percent}% Fats
                            </Text>
                          </Box>
                        )}
                      </Stack>
                    </Paper>
                  )}

                  <Group justify="flex-end" mt="xl">
                    <Button variant="light" onClick={() => setActiveStep(0)}>
                      Back
                    </Button>
                    <Button 
                      onClick={() => {
                        // Pre-fill macro form with profile data
                        const profileValues = profileForm.values
                        if (profileValues.current_weight) {
                          macroForm.setFieldValue('weight_lbs', parseFloat(profileValues.current_weight))
                        }
                        if (profileValues.height_inches) {
                          macroForm.setFieldValue('height_inches', profileValues.height_inches)
                          macroForm.setFieldValue('height_cm', profileValues.height_cm)
                        }
                        if (profileValues.age) {
                          macroForm.setFieldValue('age', profileValues.age)
                        }
                        if (profileValues.biological_sex) {
                          macroForm.setFieldValue('biological_sex', profileValues.biological_sex)
                        }
                        if (profileValues.daily_activity_level) {
                          macroForm.setFieldValue('activity_level', profileValues.daily_activity_level)
                        }
                        if (profileValues.primary_goal) {
                          macroForm.setFieldValue('goal', profileValues.primary_goal)
                        }
                        if (profileValues.rate_of_change) {
                          macroForm.setFieldValue('rate_of_change', profileValues.rate_of_change)
                        }
                        setActiveStep(2)
                      }} 
                      disabled={!calculatedMacros}
                    >
                      Continue
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            </Stepper.Step>

            <Stepper.Step label="Create Plan" description="Create nutrition plan">
              <Paper p="md" withBorder mt="xl">
                <Stack gap="md">
                  <Title order={3}>Create Nutrition Plan</Title>
                  
                  <TextInput
                    label="Plan Name"
                    placeholder="e.g., Fat Loss Plan - Phase 1"
                    {...planForm.getInputProps('plan_name')}
                  />

                  <Select
                    label="Nutrition Approach"
                    data={[
                      { value: 'macro_tracking', label: 'Macro Tracking (Flexible)' },
                      { value: 'meal_plan', label: 'Meal Plan (Structured)' },
                      { value: 'portion_control', label: 'Portion Control (Simple)' },
                      { value: 'hybrid', label: 'Hybrid (Structured + Flexible)' }
                    ]}
                    {...planForm.getInputProps('nutrition_approach')}
                  />

                  <NumberInput
                    label="Meals Per Day"
                    {...planForm.getInputProps('meal_frequency')}
                    min={2}
                    max={6}
                  />

                  <Textarea
                    label="Notes"
                    placeholder="Additional instructions for the client..."
                    {...planForm.getInputProps('notes')}
                    rows={4}
                  />

                  {calculatedMacros && (
                    <Alert color="blue" title="Macro Targets">
                      <Text size="sm">
                        Calories: {calculatedMacros.target_calories} | 
                        Protein: {calculatedMacros.target_protein}g | 
                        Carbs: {calculatedMacros.target_carbs}g | 
                        Fats: {calculatedMacros.target_fats}g
                      </Text>
                    </Alert>
                  )}

                  <Group justify="flex-end" mt="xl">
                    <Button variant="light" onClick={() => setActiveStep(1)}>
                      Back
                    </Button>
                    <Button onClick={handleCreatePlan} loading={saving}>
                      Create Plan
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            </Stepper.Step>
          </Stepper>
        </Stack>
      )}
    </Container>
  )
}

export default NutritionBuilder

