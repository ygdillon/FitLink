import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Tabs,
  Progress,
  Divider,
  Select,
  TextInput,
  ActionIcon
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import api from '../services/api'
import './ClientWorkouts.css'

function ClientWorkouts() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'your-workouts')
  
  // Update URL when tab changes
  useEffect(() => {
    if (activeTab && activeTab !== tabFromUrl) {
      setSearchParams({ tab: activeTab })
    }
  }, [activeTab, tabFromUrl, setSearchParams])
  
  // Update active tab when URL changes
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [tabFromUrl])
  const [programs, setPrograms] = useState([])
  const [workouts, setWorkouts] = useState([]) // For old workout system
  const [recommendedWorkouts, setRecommendedWorkouts] = useState([])
  const [exploreWorkouts, setExploreWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedDuration, setSelectedDuration] = useState('all')

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      
      // Fetch assigned programs (these contain workouts)
      const programsRes = await api.get('/programs/client/assigned').catch(() => ({ data: [] }))
      const assignedPrograms = programsRes.data || []
      
      // Fetch full program details with workouts
      const programsWithDetails = await Promise.all(
        assignedPrograms.map(async (program) => {
          try {
            const fullProgramRes = await api.get(`/programs/${program.id}`)
            return fullProgramRes.data || program
          } catch (error) {
            console.error(`Error fetching program ${program.id}:`, error)
            return program
          }
        })
      )
      
      setPrograms(programsWithDetails)
      
      // Fetch old workout assignments (for backward compatibility)
      const workoutsRes = await api.get('/client/workouts').catch(() => ({ data: [] }))
      setWorkouts(workoutsRes.data || [])
      
      // For MVP, we'll generate recommendations from program workouts
      // In production, this would come from a dedicated recommendations API
      generateRecommendations(programsWithDetails)
      
      // For MVP, explore workouts will be system templates or trainer workouts
      // In production, this would be a dedicated explore endpoint
      fetchExploreWorkouts()
      
    } catch (error) {
      console.error('Error fetching workouts data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateRecommendations = (programs) => {
    // Simple recommendation logic for MVP
    // In production, this would be more sophisticated
    const recommendations = []
    
    programs.forEach(program => {
      if (program.workouts && program.workouts.length > 0) {
        // Get workout types in program
        const programTypes = new Set()
        program.workouts.forEach(w => {
          if (w.exercises) {
            w.exercises.forEach(ex => {
              if (ex.exercise_type) {
                programTypes.add(ex.exercise_type)
              }
            })
          }
        })
        
        // Recommend complementary workouts
        // If program is strength-focused, recommend cardio
        const isStrengthFocused = Array.from(programTypes).some(type => 
          ['REGULAR', 'ENOM'].includes(type)
        )
        
        if (isStrengthFocused) {
          // Add cardio recommendations (placeholder for now)
          recommendations.push({
            id: `rec-cardio-${program.id}`,
            workout_name: 'Quick Cardio Blast',
            workout_type: 'CARDIO',
            duration: '20 min',
            difficulty: 'Beginner',
            exercise_count: 6,
            reason: 'Complements your strength program',
            program_context: program.name
          })
        }
      }
    })
    
    setRecommendedWorkouts(recommendations)
  }

  const fetchExploreWorkouts = async () => {
    // For MVP, we'll use program workouts as explore content
    // In production, this would fetch from a workout library
    try {
      const allWorkouts = []
      programs.forEach(program => {
        if (program.workouts) {
          program.workouts.forEach(workout => {
            allWorkouts.push({
              ...workout,
              program_name: program.name,
              program_id: program.id
            })
          })
        }
      })
      setExploreWorkouts(allWorkouts)
    } catch (error) {
      console.error('Error fetching explore workouts:', error)
    }
  }

  // Get today's workout
  const getTodaysWorkout = useMemo(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek
    
    for (const program of programs) {
      if (!program.workouts || !program.workouts.length) continue
      
      const todaysWorkouts = program.workouts.filter(w => 
        w.week_number === 1 && w.day_number === dayNumber
      )
      
      if (todaysWorkouts.length > 0) {
        return {
          program: program,
          workout: todaysWorkouts[0],
          programId: program.id
        }
      }
    }
    
    return null
  }, [programs])

  // Get upcoming workouts
  const getUpcomingWorkouts = useMemo(() => {
    const upcoming = []
    const today = new Date()
    const dayOfWeek = today.getDay()
    const dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek
    
    programs.forEach(program => {
      if (!program.workouts) return
      
      program.workouts.forEach(workout => {
        // Simple logic: workouts in week 1, days after today
        if (workout.week_number === 1 && workout.day_number > dayNumber) {
          upcoming.push({
            ...workout,
            program: program,
            programId: program.id,
            dayName: getDayName(workout.day_number)
          })
        }
      })
    })
    
    return upcoming.sort((a, b) => a.day_number - b.day_number).slice(0, 5)
  }, [programs])

  const getDayName = (dayNumber) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    return days[dayNumber - 1] || `Day ${dayNumber}`
  }

  // Filter explore workouts
  const filteredExploreWorkouts = useMemo(() => {
    let filtered = exploreWorkouts

    if (searchQuery) {
      filtered = filtered.filter(w =>
        w.workout_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedCategory !== 'all') {
      // Filter by workout type (simplified for MVP)
      filtered = filtered.filter(w => {
        if (!w.exercises) return false
        return w.exercises.some(ex => ex.exercise_type === selectedCategory)
      })
    }

    return filtered
  }, [exploreWorkouts, searchQuery, selectedCategory])

  const handleStartWorkout = (workoutId) => {
    if (workoutId) {
      navigate(`/client/workout/${workoutId}`)
    }
  }

  const handleViewProgram = (programId) => {
    navigate(`/programs?id=${programId}`)
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
      <Title order={1} mb="xl">Workouts</Title>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="your-workouts">Your Workouts</Tabs.Tab>
          <Tabs.Tab value="recommended">Recommended</Tabs.Tab>
          <Tabs.Tab value="explore">Explore</Tabs.Tab>
        </Tabs.List>

        {/* Your Workouts Tab */}
        <Tabs.Panel value="your-workouts" pt="xl">
          <Stack gap="xl">
            {/* Today's Workout */}
            {getTodaysWorkout ? (
              <Card shadow="lg" padding="xl" radius="md" withBorder style={{
                background: 'linear-gradient(135deg, var(--mantine-color-blue-6) 0%, var(--mantine-color-blue-7) 100%)',
                border: 'none'
              }}>
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <Stack gap="xs">
                      <Badge size="lg" variant="light" color="white">
                        Today's Workout
                      </Badge>
                      <Title order={2} c="white" fw={700}>
                        {getTodaysWorkout.workout.workout_name}
                      </Title>
                      <Text c="white" opacity={0.9}>
                        {getTodaysWorkout.program.name}
                        {getTodaysWorkout.program.week_names?.[1] && (
                          <> • {getTodaysWorkout.program.week_names[1]}</>
                        )}
                      </Text>
                    </Stack>
                    <Group>
                      {getTodaysWorkout.workout.exercises && (
                        <Badge size="lg" variant="filled" color="white" c="blue">
                          {getTodaysWorkout.workout.exercises.length} exercises
                        </Badge>
                      )}
                    </Group>
                  </Group>
                  
                  <Divider color="white" opacity={0.3} />
                  
                  <Group>
                    <Button
                      size="lg"
                      variant="white"
                      color="blue"
                      onClick={() => handleStartWorkout(getTodaysWorkout.workout.id)}
                      style={{ flex: 1 }}
                    >
                      Start Workout
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      color="white"
                      onClick={() => handleViewProgram(getTodaysWorkout.programId)}
                    >
                      View Program
                    </Button>
                  </Group>
                </Stack>
              </Card>
            ) : (
              <Card shadow="sm" padding="xl" radius="md" withBorder>
                <Stack gap="md" align="center">
                  <Text size="lg" fw={500} c="dimmed">No workout scheduled for today</Text>
                  <Text size="sm" c="dimmed">Check your program schedule or upcoming workouts below</Text>
                </Stack>
              </Card>
            )}

            {/* Upcoming Workouts */}
            {getUpcomingWorkouts.length > 0 && (
              <Paper p="md" withBorder>
                <Title order={3} mb="md">Upcoming Workouts</Title>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  {getUpcomingWorkouts.map((workout, idx) => (
                    <Card key={idx} shadow="sm" padding="md" radius="md" withBorder>
                      <Stack gap="sm">
                        <Group justify="space-between">
                          <Title order={5} lineClamp={1}>{workout.workout_name}</Title>
                          <Badge size="sm" variant="light">Upcoming</Badge>
                        </Group>
                        <Text size="sm" c="dimmed">
                          {workout.dayName} • {workout.program.name}
                        </Text>
                        {workout.exercises && (
                          <Text size="xs" c="dimmed">
                            {workout.exercises.length} exercises
                          </Text>
                        )}
                        <Group>
                          <Button
                            size="sm"
                            variant="light"
                            onClick={() => handleStartWorkout(workout.id)}
                            style={{ flex: 1 }}
                          >
                            Start
                          </Button>
                          <Button
                            size="sm"
                            variant="subtle"
                            onClick={() => handleViewProgram(workout.programId)}
                          >
                            View
                          </Button>
                        </Group>
                      </Stack>
                    </Card>
                  ))}
                </SimpleGrid>
              </Paper>
            )}

            {/* All Program Workouts */}
            {programs.length > 0 && (
              <Paper p="md" withBorder>
                <Group justify="space-between" mb="md">
                  <Title order={3}>All Program Workouts</Title>
                  <Button variant="light" size="sm" onClick={() => navigate('/programs')}>
                    View Programs
                  </Button>
                </Group>
                
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  {programs.map(program => (
                    <Card key={program.id} shadow="sm" padding="md" radius="md" withBorder>
                      <Stack gap="sm">
                        <Group justify="space-between">
                          <Title order={4} lineClamp={1}>{program.name}</Title>
                          {program.split_type && (
                            <Badge size="sm" variant="outline">{program.split_type}</Badge>
                          )}
                        </Group>
                        {program.workouts && (
                          <Text size="sm" c="dimmed">
                            {program.workouts.length} workouts
                          </Text>
                        )}
                        <Button
                          variant="light"
                          size="sm"
                          fullWidth
                          onClick={() => handleViewProgram(program.id)}
                        >
                          View Program
                        </Button>
                      </Stack>
                    </Card>
                  ))}
                </SimpleGrid>
              </Paper>
            )}

            {/* Old Workout Assignments (if any) */}
            {workouts.length > 0 && (
              <Paper p="md" withBorder>
                <Title order={3} mb="md">Assigned Workouts</Title>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  {workouts.map(workout => {
                    const workoutName = workout.workout_name || workout.name
                    const workoutId = workout.workout_id || workout.id
                    return (
                      <Card key={workout.id} shadow="sm" padding="md" radius="md" withBorder>
                        <Stack gap="sm">
                          <Group justify="space-between">
                            <Title order={5}>{workoutName}</Title>
                            <Badge color={workout.status === 'completed' ? 'green' : 'blue'}>
                              {workout.status || 'assigned'}
                            </Badge>
                          </Group>
                          {workout.description && (
                            <Text size="sm" c="dimmed" lineClamp={2}>{workout.description}</Text>
                          )}
                          <Button
                            variant="light"
                            size="sm"
                            fullWidth
                            onClick={() => navigate(`/workout/${workoutId}`)}
                          >
                            View Workout
                          </Button>
                        </Stack>
                      </Card>
                    )
                  })}
                </SimpleGrid>
              </Paper>
            )}

            {programs.length === 0 && workouts.length === 0 && (
              <Paper p="xl" withBorder>
                <Stack gap="xs" align="center">
                  <Text c="dimmed">No workouts assigned yet</Text>
                  <Text size="sm" c="dimmed">Your trainer will assign programs and workouts to you</Text>
                </Stack>
              </Paper>
            )}
          </Stack>
        </Tabs.Panel>

        {/* Recommended Tab */}
        <Tabs.Panel value="recommended" pt="xl">
          <Stack gap="xl">
            <Paper p="md" withBorder>
              <Title order={3} mb="md">Recommended for You</Title>
              <Text size="sm" c="dimmed" mb="lg">
                These workouts complement your current program and help you reach your goals faster.
              </Text>

              {recommendedWorkouts.length > 0 ? (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  {recommendedWorkouts.map((workout, idx) => (
                    <Card key={idx} shadow="sm" padding="md" radius="md" withBorder>
                      <Stack gap="sm">
                        <Group justify="space-between">
                          <Badge color="green" variant="light">Recommended</Badge>
                          <Badge size="sm" variant="outline">{workout.workout_type}</Badge>
                        </Group>
                        <Title order={4}>{workout.workout_name}</Title>
                        <Text size="sm" c="dimmed">{workout.reason}</Text>
                        <Group gap="xs">
                          <Text size="xs" c="dimmed">{workout.duration}</Text>
                          <Text size="xs" c="dimmed">•</Text>
                          <Text size="xs" c="dimmed">{workout.exercise_count} exercises</Text>
                        </Group>
                        {workout.program_context && (
                          <Text size="xs" c="dimmed">
                            Complements: {workout.program_context}
                          </Text>
                        )}
                        <Button
                          variant="light"
                          color="green"
                          size="sm"
                          fullWidth
                          onClick={() => {
                            notifications.show({
                              title: 'Coming Soon',
                              message: 'Workout recommendations will be available soon!',
                              color: 'blue'
                            })
                          }}
                        >
                          Try This
                        </Button>
                      </Stack>
                    </Card>
                  ))}
                </SimpleGrid>
              ) : (
                <Paper p="xl" withBorder>
                  <Stack gap="xs" align="center">
                    <Text c="dimmed">No recommendations available yet</Text>
                    <Text size="sm" c="dimmed">
                      Complete more workouts to get personalized recommendations
                    </Text>
                  </Stack>
                </Paper>
              )}
            </Paper>

            {/* Recommendation Categories */}
            <Paper p="md" withBorder>
              <Title order={3} mb="md">Browse by Goal</Title>
              <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="md">
                {['Weight Loss', 'Muscle Gain', 'Endurance', 'Flexibility', 'General Fitness'].map(goal => (
                  <Card
                    key={goal}
                    shadow="sm"
                    padding="md"
                    radius="md"
                    withBorder
                    style={{ cursor: 'pointer', textAlign: 'center' }}
                    onClick={() => {
                      notifications.show({
                        title: 'Coming Soon',
                        message: `Goal-based recommendations for "${goal}" coming soon!`,
                        color: 'blue'
                      })
                    }}
                  >
                    <Text fw={500} size="sm">{goal}</Text>
                  </Card>
                ))}
              </SimpleGrid>
            </Paper>
          </Stack>
        </Tabs.Panel>

        {/* Explore Tab */}
        <Tabs.Panel value="explore" pt="xl">
          <Stack gap="xl">
            {/* Search and Filters */}
            <Paper p="md" withBorder>
              <Stack gap="md">
                <TextInput
                  placeholder="Search workouts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  rightSection={
                    searchQuery && (
                      <ActionIcon onClick={() => setSearchQuery('')}>
                        ✕
                      </ActionIcon>
                    )
                  }
                />
                <Group>
                  <Select
                    label="Category"
                    placeholder="All categories"
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                    data={[
                      { value: 'all', label: 'All Categories' },
                      { value: 'REGULAR', label: 'Strength' },
                      { value: 'AMRAP', label: 'AMRAP' },
                      { value: 'INTERVAL', label: 'Interval' },
                      { value: 'TABATA', label: 'TABATA' },
                      { value: 'ENOM', label: 'EMOM' }
                    ]}
                    style={{ flex: 1 }}
                  />
                  <Select
                    label="Duration"
                    placeholder="All durations"
                    value={selectedDuration}
                    onChange={setSelectedDuration}
                    data={[
                      { value: 'all', label: 'All Durations' },
                      { value: '15', label: '15 min or less' },
                      { value: '30', label: '30 min' },
                      { value: '45', label: '45 min' },
                      { value: '60', label: '60+ min' }
                    ]}
                    style={{ flex: 1 }}
                  />
                </Group>
              </Stack>
            </Paper>

            {/* Workout Grid */}
            {filteredExploreWorkouts.length > 0 ? (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
                {filteredExploreWorkouts.map((workout, idx) => {
                  const workoutTypes = workout.exercises
                    ? [...new Set(workout.exercises.map(ex => ex.exercise_type || 'REGULAR'))]
                    : ['REGULAR']
                  
                  return (
                    <Card key={workout.id || idx} shadow="sm" padding="md" radius="md" withBorder>
                      <Stack gap="sm">
                        <Group justify="space-between" align="flex-start">
                          <Title order={5} lineClamp={2} style={{ flex: 1 }}>
                            {workout.workout_name}
                          </Title>
                        </Group>
                        
                        <Group gap="xs">
                          {workoutTypes.slice(0, 2).map(type => (
                            <Badge key={type} size="xs" variant="outline">
                              {type}
                            </Badge>
                          ))}
                          {workoutTypes.length > 2 && (
                            <Badge size="xs" variant="light">
                              +{workoutTypes.length - 2}
                            </Badge>
                          )}
                        </Group>

                        {workout.program_name && (
                          <Text size="xs" c="dimmed">
                            From: {workout.program_name}
                          </Text>
                        )}

                        {workout.exercises && (
                          <Text size="xs" c="dimmed">
                            {workout.exercises.length} exercises
                          </Text>
                        )}

                        <Group>
                          <Button
                            variant="light"
                            size="sm"
                            onClick={() => handleStartWorkout(workout.id)}
                            style={{ flex: 1 }}
                          >
                            Start
                          </Button>
                          <Button
                            variant="subtle"
                            size="sm"
                            onClick={() => workout.program_id && handleViewProgram(workout.program_id)}
                          >
                            View
                          </Button>
                        </Group>
                      </Stack>
                    </Card>
                  )
                })}
              </SimpleGrid>
            ) : (
              <Paper p="xl" withBorder>
                <Stack gap="xs" align="center">
                  <Text c="dimmed">No workouts found</Text>
                  <Text size="sm" c="dimmed">
                    {searchQuery ? 'Try adjusting your search or filters' : 'No workouts available to explore yet'}
                  </Text>
                </Stack>
              </Paper>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Container>
  )
}

export default ClientWorkouts
