import { useState } from 'react'
import { Paper, Title, Text, Stack, Select, TextInput, Button, Group, Badge, Alert, Loader } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import api from '../services/api'
import './ClientGoals.css'

function ClientGoals({ clientId, client, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newSecondaryGoal, setNewSecondaryGoal] = useState('')

  const form = useForm({
    initialValues: {
      primary_goal: client.primary_goal || '',
      goal_target: client.goal_target || '',
      goal_timeframe: client.goal_timeframe || '',
      secondary_goals: Array.isArray(client.secondary_goals) ? client.secondary_goals : []
    },
    validate: {
      primary_goal: (value) => (!value ? 'Primary goal is required' : null),
      goal_target: (value) => (!value ? 'Goal target is required' : null),
      goal_timeframe: (value) => (!value ? 'Goal timeframe is required' : null),
    },
  })

  const handleSubmit = async (values) => {
    setLoading(true)
    
    try {
      await api.put(`/trainer/clients/${clientId}/onboarding`, values)
      setIsEditing(false)
      onUpdate()
      notifications.show({
        title: 'Goals Updated',
        message: 'Client goals have been successfully updated!',
        color: 'green',
      })
    } catch (error) {
      console.error('Error updating goals:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to update goals',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  const addSecondaryGoal = () => {
    if (newSecondaryGoal.trim()) {
      form.setFieldValue('secondary_goals', [...form.values.secondary_goals, newSecondaryGoal.trim()])
      setNewSecondaryGoal('')
    }
  }

  const removeSecondaryGoal = (index) => {
    form.setFieldValue('secondary_goals', form.values.secondary_goals.filter((_, i) => i !== index))
  }

  if (!client.primary_goal && !isEditing) {
    return (
      <Paper p="xl" withBorder>
        <Stack gap="md" align="center">
          <Alert color="yellow" title="⚠️ No Goal Set">
            This client doesn't have a goal set yet. Setting a clear goal is essential for tracking progress and success.
          </Alert>
          <Button onClick={() => setIsEditing(true)}>
            Set Client Goal
          </Button>
        </Stack>
      </Paper>
    )
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Goals</Title>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="outline">
            Edit Goals
          </Button>
        )}
      </Group>

      {isEditing ? (
        <Paper p="md" withBorder>
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <Title order={3}>Primary Goal *</Title>
              <Select
                label="Goal Type *"
                placeholder="Select a goal"
                data={[
                  'Weight Loss',
                  'Muscle Gain',
                  'Tone & Strengthen',
                  'Improve Strength',
                  'Improve Cardio',
                  'Improve Flexibility',
                  'Improve Performance',
                  'Build Healthy Habits',
                  'Increase Energy',
                  'Reduce Stress'
                ]}
                withinPortal
                {...form.getInputProps('primary_goal')}
                required
              />
              <TextInput
                label="Target *"
                placeholder="e.g., Lose 20 lbs, Gain 10 lbs muscle, Bench 225 lbs"
                {...form.getInputProps('goal_target')}
                required
              />
              <TextInput
                label="Timeframe *"
                placeholder="e.g., 3 months, 6 months, 1 year"
                {...form.getInputProps('goal_timeframe')}
                required
              />

              <div>
                <Title order={4} mb="xs">Secondary Goals</Title>
                <Group mb="xs">
                  <TextInput
                    placeholder="Add a secondary goal..."
                    value={newSecondaryGoal}
                    onChange={(e) => setNewSecondaryGoal(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSecondaryGoal())}
                    style={{ flex: 1 }}
                  />
                  <Button onClick={addSecondaryGoal} variant="outline">
                    Add
                  </Button>
                </Group>
                {form.values.secondary_goals.length > 0 && (
                  <Group gap="xs">
                    {form.values.secondary_goals.map((goal, index) => (
                      <Badge
                        key={index}
                        variant="light"
                        rightSection={
                          <button
                            type="button"
                            onClick={() => removeSecondaryGoal(index)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4 }}
                          >
                            ×
                          </button>
                        }
                      >
                        {goal}
                      </Badge>
                    ))}
                  </Group>
                )}
              </div>

              <Group justify="flex-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false)
                    form.setValues({
                      primary_goal: client.primary_goal || '',
                      goal_target: client.goal_target || '',
                      goal_timeframe: client.goal_timeframe || '',
                      secondary_goals: Array.isArray(client.secondary_goals) ? client.secondary_goals : []
                    })
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={loading}>
                  Save Goals
                </Button>
              </Group>
            </Stack>
          </form>
        </Paper>
      ) : (
        <Stack gap="md">
          <Paper p="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={3}>Primary Goal</Title>
              <Badge size="lg" variant="light">
                {client.primary_goal ? client.primary_goal.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not Set'}
              </Badge>
            </Group>
            <Stack gap="xs">
              {client.goal_target && (
                <Text><Text span fw={500}>Target:</Text> {client.goal_target}</Text>
              )}
              {client.goal_timeframe && (
                <Text><Text span fw={500}>Timeframe:</Text> {client.goal_timeframe}</Text>
              )}
              {client.goal_target && client.goal_timeframe && (
                <Text fw={500} c="green">
                  Goal Summary: {client.goal_target} in {client.goal_timeframe}
                </Text>
              )}
            </Stack>
          </Paper>

          {client.secondary_goals && Array.isArray(client.secondary_goals) && client.secondary_goals.length > 0 ? (
            <Paper p="md" withBorder>
              <Title order={3} mb="md">Secondary Goals</Title>
              <Group gap="xs">
                {client.secondary_goals.map((goal, index) => (
                  <Badge key={index} size="lg" variant="light">
                    {goal}
                  </Badge>
                ))}
              </Group>
            </Paper>
          ) : (
            <Text c="dimmed">No secondary goals set. Click "Edit Goals" to add some.</Text>
          )}
        </Stack>
      )}
    </Stack>
  )
}

export default ClientGoals

