import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Paper, Title, Text, Stack, TextInput, Textarea, Select, Checkbox, Button, Group, Card, NumberInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import api from '../services/api'
import './WorkoutBuilder.css'

function WorkoutBuilder() {
  const [workoutName, setWorkoutName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [isTemplate, setIsTemplate] = useState(false)
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const addExercise = () => {
    setExercises([...exercises, {
      name: '',
      sets: '',
      reps: '',
      weight: '',
      rest: '',
      notes: ''
    }])
  }

  const updateExercise = (index, field, value) => {
    const updated = [...exercises]
    updated[index][field] = value
    setExercises(updated)
  }

  const removeExercise = (index) => {
    setExercises(exercises.filter((_, i) => i !== index))
  }

  const handleSubmit = async (values) => {
    setLoading(true)

    try {
      await api.post('/trainer/workouts', {
        name: workoutName,
        description,
        category,
        is_template: isTemplate,
        exercises: exercises.filter(ex => ex.name.trim() !== '')
      })
      notifications.show({
        title: 'Workout Created',
        message: 'Workout has been successfully created!',
        color: 'green',
      })
      navigate('/trainer/workouts')
    } catch (error) {
      console.error('Error creating workout:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to create workout',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container size="lg" py="xl">
      <Paper shadow="md" p="xl" radius="md" withBorder>
        <Title order={1} mb="xl">Create Workout</Title>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
          <Stack gap="md">
            <TextInput
              label="Workout Name"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              required
            />
            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <Select
              label="Category (optional)"
              placeholder="Select category"
              data={['Strength', 'Cardio', 'HIIT', 'Flexibility', 'Full Body', 'Upper Body', 'Lower Body', 'Core']}
              value={category}
              onChange={setCategory}
            />
            <Checkbox
              label="Save as Template (reusable workout)"
              checked={isTemplate}
              onChange={(e) => setIsTemplate(e.target.checked)}
            />

            <div>
              <Group justify="space-between" mb="md">
                <Title order={3}>Exercises</Title>
                <Button type="button" onClick={addExercise} variant="outline">
                  + Add Exercise
                </Button>
              </Group>

              <Stack gap="md">
                {exercises.map((exercise, index) => (
                  <Card key={index} withBorder p="md">
                    <Group justify="flex-end" mb="xs">
                      <Button type="button" variant="subtle" color="red" size="xs" onClick={() => removeExercise(index)}>
                        Remove
                      </Button>
                    </Group>
                    <Stack gap="sm">
                      <TextInput
                        placeholder="Exercise name"
                        value={exercise.name}
                        onChange={(e) => updateExercise(index, 'name', e.target.value)}
                        required
                      />
                      <Group grow>
                        <NumberInput
                          placeholder="Sets"
                          value={exercise.sets}
                          onChange={(value) => updateExercise(index, 'sets', value)}
                        />
                        <TextInput
                          placeholder="Reps"
                          value={exercise.reps}
                          onChange={(e) => updateExercise(index, 'reps', e.target.value)}
                        />
                        <TextInput
                          placeholder="Weight (optional)"
                          value={exercise.weight}
                          onChange={(e) => updateExercise(index, 'weight', e.target.value)}
                        />
                        <TextInput
                          placeholder="Rest (optional)"
                          value={exercise.rest}
                          onChange={(e) => updateExercise(index, 'rest', e.target.value)}
                        />
                      </Group>
                      <Textarea
                        placeholder="Notes (optional)"
                        value={exercise.notes}
                        onChange={(e) => updateExercise(index, 'notes', e.target.value)}
                        rows={2}
                      />
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </div>

            <Group justify="flex-end">
              <Button type="submit" loading={loading} disabled={exercises.length === 0}>
                Create Workout
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}

export default WorkoutBuilder

