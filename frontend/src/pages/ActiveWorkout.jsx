import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Container,
  Paper,
  Title,
  Text,
  Stack,
  Group,
  Button,
  Badge,
  NumberInput,
  TextInput,
  Textarea,
  Progress,
  Card,
  Divider,
  Modal,
  ActionIcon,
  Loader,
  Alert
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import api from '../services/api'

function ActiveWorkout() {
  const { workoutId } = useParams()
  const navigate = useNavigate()
  const [workout, setWorkout] = useState(null)
  const [program, setProgram] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [completedSets, setCompletedSets] = useState({}) // { exerciseIndex: { setIndex: { weight, reps, notes } } }
  const [startTime] = useState(new Date())
  const [elapsedTime, setElapsedTime] = useState(0)
  const [restTimer, setRestTimer] = useState(null)
  const [restTimeRemaining, setRestTimeRemaining] = useState(0)
  const [exitModalOpened, { open: openExitModal, close: closeExitModal }] = useDisclosure(false)
  const [completeModalOpened, { open: openCompleteModal, close: closeCompleteModal }] = useDisclosure(false)
  const [workoutNotes, setWorkoutNotes] = useState('')
  const intervalRef = useRef(null)
  const restIntervalRef = useRef(null)

  useEffect(() => {
    fetchWorkoutData()
    
    // Start workout timer
    intervalRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (restIntervalRef.current) clearInterval(restIntervalRef.current)
    }
  }, [workoutId])

  const fetchWorkoutData = async () => {
    try {
      setLoading(true)
      // Get workout from assigned programs
      const programsRes = await api.get('/programs/client/assigned')
      if (programsRes.data && programsRes.data.length > 0) {
        for (const prog of programsRes.data) {
          // Fetch full program details to get workouts
          const programRes = await api.get(`/programs/${prog.id}`)
          if (programRes.data && programRes.data.workouts) {
            const foundWorkout = programRes.data.workouts.find(w => w.id === parseInt(workoutId))
            if (foundWorkout) {
              setWorkout(foundWorkout)
              setProgram(programRes.data)
              return
            }
          }
        }
      }
      
      // If not found, show error
      setWorkout(null)
    } catch (error) {
      console.error('Error fetching workout:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load workout',
        color: 'red'
      })
      setWorkout(null)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startRestTimer = (seconds = 60) => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current)
    
    setRestTimeRemaining(seconds)
    setRestTimer(seconds)
    
    restIntervalRef.current = setInterval(() => {
      setRestTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(restIntervalRef.current)
          setRestTimer(null)
          notifications.show({
            title: 'Rest Complete',
            message: 'Time to start your next set!',
            color: 'green'
          })
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const skipRest = () => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current)
    setRestTimer(null)
    setRestTimeRemaining(0)
  }

  const completeSet = (exerciseIndex, setIndex, exercise) => {
    const currentSets = completedSets[exerciseIndex] || {}
    const setData = currentSets[setIndex] || {}
    
    setCompletedSets(prev => ({
      ...prev,
      [exerciseIndex]: {
        ...prev[exerciseIndex],
        [setIndex]: {
          ...setData,
          completed: true,
          completedAt: new Date()
        }
      }
    }))

    // Start rest timer if there are more sets
    const totalSets = exercise.sets || 1
    if (setIndex < totalSets - 1) {
      const restSeconds = parseRestTime(exercise.rest) || 60
      startRestTimer(restSeconds)
    }
  }

  const parseRestTime = (restString) => {
    if (!restString) return 60
    // Parse "1 minute", "90 seconds", "1m", etc.
    const match = restString.match(/(\d+)\s*(minute|min|m|second|sec|s)/i)
    if (match) {
      const value = parseInt(match[1])
      const unit = match[2].toLowerCase()
      if (unit.startsWith('m')) return value * 60
      return value
    }
    return 60
  }

  const updateSetData = (exerciseIndex, setIndex, field, value) => {
    setCompletedSets(prev => ({
      ...prev,
      [exerciseIndex]: {
        ...prev[exerciseIndex],
        [setIndex]: {
          ...(prev[exerciseIndex]?.[setIndex] || {}),
          [field]: value
        }
      }
    }))
  }

  const getExerciseProgress = (exerciseIndex) => {
    const exercise = workout?.exercises?.[exerciseIndex]
    if (!exercise) return { completed: 0, total: 0, percentage: 0 }
    
    const totalSets = exercise.sets || 1
    const completed = Object.keys(completedSets[exerciseIndex] || {}).filter(
      key => completedSets[exerciseIndex][key]?.completed
    ).length
    
    return {
      completed,
      total: totalSets,
      percentage: totalSets > 0 ? Math.round((completed / totalSets) * 100) : 0
    }
  }

  const getOverallProgress = () => {
    if (!workout?.exercises?.length) return 0
    const totalExercises = workout.exercises.length
    const completedExercises = workout.exercises.filter((_, idx) => {
      const progress = getExerciseProgress(idx)
      return progress.completed === progress.total && progress.total > 0
    }).length
    
    return Math.round((completedExercises / totalExercises) * 100)
  }

  const handleCompleteWorkout = async () => {
    try {
      const exercisesCompleted = workout.exercises.map((exercise, exIdx) => ({
        exercise_name: exercise.exercise_name,
        exercise_type: exercise.exercise_type,
        sets_completed: Object.keys(completedSets[exIdx] || {}).map(setIdx => ({
          set_number: parseInt(setIdx) + 1,
          weight: completedSets[exIdx][setIdx]?.weight || exercise.weight,
          reps: completedSets[exIdx][setIdx]?.reps || exercise.reps,
          notes: completedSets[exIdx][setIdx]?.notes || ''
        }))
      }))

      const duration = Math.floor((new Date() - startTime) / 1000) // seconds

      await api.post(`/programs/workout/${workoutId}/complete`, {
        exercises_completed: exercisesCompleted,
        notes: workoutNotes,
        duration: duration
      })

      notifications.show({
        title: 'Workout Complete!',
        message: 'Great job! Your workout has been saved.',
        color: 'green'
      })

      navigate('/client')
    } catch (error) {
      console.error('Error completing workout:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to save workout',
        color: 'red'
      })
    }
  }

  const handleExit = () => {
    openExitModal()
  }

  const confirmExit = () => {
    closeExitModal()
    navigate('/client')
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

  if (!workout) {
    return (
      <Container size="xl" py="xl">
        <Alert color="red" title="Workout Not Found">
          The workout you're looking for doesn't exist or you don't have access to it.
        </Alert>
        <Button mt="md" onClick={() => navigate('/client')}>
          Back to Dashboard
        </Button>
      </Container>
    )
  }

  const currentExercise = workout.exercises?.[currentExerciseIndex]
  const exerciseProgress = getExerciseProgress(currentExerciseIndex)
  const overallProgress = getOverallProgress()
  const totalExercises = workout.exercises?.length || 0

  return (
    <Container size="xl" py="md">
      {/* Workout Header */}
      <Paper p="md" mb="md" withBorder>
        <Group justify="space-between" align="flex-start">
          <Stack gap="xs">
            <Title order={2}>{workout.workout_name}</Title>
            {program && (
              <Text size="sm" c="dimmed">{program.name}</Text>
            )}
          </Stack>
          <Group>
            <Badge size="lg" variant="light">
              {formatTime(elapsedTime)}
            </Badge>
            <ActionIcon variant="subtle" color="red" onClick={handleExit}>
              ✕
            </ActionIcon>
          </Group>
        </Group>
        
        <Divider my="md" />
        
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Overall Progress</Text>
            <Text size="sm" fw={600}>{overallProgress}%</Text>
          </Group>
          <Progress value={overallProgress} size="lg" color="green" />
          <Group justify="space-between" mt="xs">
            <Text size="xs" c="dimmed">
              Exercise {currentExerciseIndex + 1} of {totalExercises}
            </Text>
            <Text size="xs" c="dimmed">
              {workout.exercises?.filter((_, idx) => {
                const prog = getExerciseProgress(idx)
                return prog.completed === prog.total && prog.total > 0
              }).length || 0} completed
            </Text>
          </Group>
        </Stack>
      </Paper>

      {/* Rest Timer */}
      {restTimer !== null && restTimeRemaining > 0 && (
        <Alert color="blue" mb="md" title="Rest Time">
          <Group justify="space-between">
            <Text size="xl" fw={700}>{formatTime(restTimeRemaining)}</Text>
            <Button size="sm" variant="light" onClick={skipRest}>
              Skip Rest
            </Button>
          </Group>
        </Alert>
      )}

      {/* Current Exercise */}
      {currentExercise && (
        <Card 
          shadow="lg" 
          p="xl" 
          mb="md" 
          withBorder
          style={{
            backgroundColor: 'var(--mantine-color-dark-6)',
            borderColor: 'var(--mantine-color-dark-4)'
          }}
        >
          <Stack gap="lg">
            <Group justify="space-between">
              <Stack gap="xs">
                <Badge size="lg" variant="light" color="blue">
                  {currentExercise.exercise_type || 'REGULAR'}
                </Badge>
                <Title order={2} c="white">{currentExercise.exercise_name}</Title>
              </Stack>
              <Badge size="lg" color="green">
                {exerciseProgress.completed}/{exerciseProgress.total} SETS
              </Badge>
            </Group>

            <Progress value={exerciseProgress.percentage} size="md" color="blue" />

            {/* Exercise Details */}
            <Group>
              {currentExercise.sets && (
                <Badge variant="outline" color="gray">Sets: {currentExercise.sets}</Badge>
              )}
              {currentExercise.reps && (
                <Badge variant="outline" color="gray">Reps: {currentExercise.reps}</Badge>
              )}
              {currentExercise.weight && (
                <Badge variant="outline" color="gray">Weight: {currentExercise.weight}</Badge>
              )}
              {currentExercise.duration && (
                <Badge variant="outline" color="gray">Duration: {currentExercise.duration}</Badge>
              )}
            </Group>

            {currentExercise.notes && (
              <Paper 
                p="sm" 
                withBorder 
                style={{
                  backgroundColor: 'var(--mantine-color-dark-7)',
                  borderColor: 'var(--mantine-color-dark-4)'
                }}
              >
                <Text size="sm" c="dimmed">{currentExercise.notes}</Text>
              </Paper>
            )}

            <Divider color="dark.4" />

            {/* Sets */}
            <Stack gap="md">
              <Title order={4} c="white">Sets</Title>
              {Array.from({ length: currentExercise.sets || 1 }, (_, setIdx) => {
                const setData = completedSets[currentExerciseIndex]?.[setIdx] || {}
                const isCompleted = setData.completed

                return (
                  <Paper 
                    key={setIdx} 
                    p="md" 
                    withBorder
                    style={{
                      backgroundColor: isCompleted 
                        ? 'rgba(34, 197, 94, 0.15)' 
                        : 'var(--mantine-color-dark-7)',
                      borderColor: isCompleted 
                        ? 'rgba(34, 197, 94, 0.5)' 
                        : 'var(--mantine-color-dark-4)'
                    }}
                  >
                    <Stack gap="sm">
                      <Group justify="space-between">
                        <Text fw={600} c="white">Set {setIdx + 1}</Text>
                        {isCompleted && (
                          <Badge color="green">Completed</Badge>
                        )}
                      </Group>
                      
                      <Group grow>
                        <NumberInput
                          label="Weight"
                          placeholder={currentExercise.weight || "Weight"}
                          value={setData.weight || currentExercise.weight || ''}
                          onChange={(value) => updateSetData(currentExerciseIndex, setIdx, 'weight', value)}
                          disabled={isCompleted}
                        />
                        <NumberInput
                          label="Reps"
                          placeholder={currentExercise.reps || "Reps"}
                          value={setData.reps || currentExercise.reps || ''}
                          onChange={(value) => updateSetData(currentExerciseIndex, setIdx, 'reps', value)}
                          disabled={isCompleted}
                        />
                      </Group>

                      <Textarea
                        label="Notes (optional)"
                        placeholder="How did this set feel?"
                        value={setData.notes || ''}
                        onChange={(e) => updateSetData(currentExerciseIndex, setIdx, 'notes', e.target.value)}
                        disabled={isCompleted}
                        minRows={2}
                      />

                      {!isCompleted && (
                        <Button
                          color="green"
                          onClick={() => completeSet(currentExerciseIndex, setIdx, currentExercise)}
                          fullWidth
                        >
                          Complete Set
                        </Button>
                      )}
                    </Stack>
                  </Paper>
                )
              })}
            </Stack>
          </Stack>
        </Card>
      )}

      {/* Navigation */}
      <Group justify="space-between" mb="md">
        <Button
          variant="light"
          onClick={() => setCurrentExerciseIndex(prev => Math.max(0, prev - 1))}
          disabled={currentExerciseIndex === 0}
        >
          Previous Exercise
        </Button>
        
        <Group>
          {workout.exercises?.map((_, idx) => (
            <Button
              key={idx}
              size="xs"
              variant={idx === currentExerciseIndex ? 'filled' : 'light'}
              onClick={() => setCurrentExerciseIndex(idx)}
            >
              {idx + 1}
            </Button>
          ))}
        </Group>

        <Button
          variant="light"
          onClick={() => setCurrentExerciseIndex(prev => Math.min((workout.exercises?.length || 1) - 1, prev + 1))}
          disabled={currentExerciseIndex === (workout.exercises?.length || 1) - 1}
        >
          Next Exercise
        </Button>
      </Group>

      {/* Complete Workout Button */}
      {overallProgress > 0 && (
        <Button
          size="lg"
          color="green"
          fullWidth
          onClick={openCompleteModal}
        >
          Complete Workout
        </Button>
      )}

      {/* Exit Confirmation Modal */}
      <Modal
        opened={exitModalOpened}
        onClose={closeExitModal}
        title="Exit Workout?"
        centered
      >
        <Stack gap="md">
          <Text>Are you sure you want to exit? Your progress will not be saved.</Text>
          <Group justify="flex-end">
            <Button variant="light" onClick={closeExitModal}>
              Continue Workout
            </Button>
            <Button color="red" onClick={confirmExit}>
              Exit Without Saving
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Complete Workout Modal */}
      <Modal
        opened={completeModalOpened}
        onClose={closeCompleteModal}
        title="Complete Workout"
        centered
        size="lg"
      >
        <Stack gap="md">
          <Text>Add any notes about your workout (optional):</Text>
          <Textarea
            placeholder="How did the workout feel? Any observations?"
            value={workoutNotes}
            onChange={(e) => setWorkoutNotes(e.target.value)}
            minRows={4}
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={closeCompleteModal}>
              Cancel
            </Button>
            <Button color="green" onClick={handleCompleteWorkout}>
              Save & Complete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}

export default ActiveWorkout

