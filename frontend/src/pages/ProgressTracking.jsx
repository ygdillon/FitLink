import { useState, useEffect } from 'react'
import { Container, Title, Text, Stack, Card, Paper, Button, Group, Grid, NumberInput, Textarea, Loader } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import api from '../services/api'
import './ProgressTracking.css'

function ProgressTracking() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  
  const form = useForm({
    initialValues: {
      date: new Date(),
      weight: '',
      bodyFat: '',
      measurements: {
        chest: '',
        waist: '',
        hips: '',
        arms: ''
      },
      notes: ''
    },
  })

  useEffect(() => {
    fetchProgress()
  }, [])

  const fetchProgress = async () => {
    try {
      const response = await api.get('/client/progress')
      setEntries(response.data)
    } catch (error) {
      console.error('Error fetching progress:', error)
    }
  }

  const handleSubmit = async (values) => {
    setLoading(true)

    try {
      const date = values.date instanceof Date 
        ? values.date.toISOString().split('T')[0]
        : values.date
      
      await api.post('/client/progress', {
        ...values,
        date
      })
      form.reset()
      fetchProgress()
      notifications.show({
        title: 'Progress Saved',
        message: 'Your progress has been successfully saved!',
        color: 'green',
      })
    } catch (error) {
      console.error('Error saving progress:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to save progress',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">Progress Tracking</Title>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="md" withBorder>
            <Title order={2} mb="md">Log Progress</Title>
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack gap="md">
                <DatePickerInput
                  label="Date"
                  {...form.getInputProps('date')}
                  required
                />
                <Group grow>
                  <NumberInput
                    label="Weight (kg)"
                    step={0.1}
                    {...form.getInputProps('weight')}
                  />
                  <NumberInput
                    label="Body Fat %"
                    step={0.1}
                    {...form.getInputProps('bodyFat')}
                  />
                </Group>
                <div>
                  <Text fw={500} mb="xs">Measurements (inches)</Text>
                  <Grid>
                    <Grid.Col span={6}>
                      <NumberInput
                        label="Chest"
                        step={0.1}
                        {...form.getInputProps('measurements.chest')}
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <NumberInput
                        label="Waist"
                        step={0.1}
                        {...form.getInputProps('measurements.waist')}
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <NumberInput
                        label="Hips"
                        step={0.1}
                        {...form.getInputProps('measurements.hips')}
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <NumberInput
                        label="Arms"
                        step={0.1}
                        {...form.getInputProps('measurements.arms')}
                      />
                    </Grid.Col>
                  </Grid>
                </div>
                <Textarea
                  label="Notes"
                  rows={3}
                  {...form.getInputProps('notes')}
                />
                <Button type="submit" loading={loading} fullWidth>
                  Save Progress
                </Button>
              </Stack>
            </form>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="md" withBorder>
            <Title order={2} mb="md">Progress History</Title>
            {entries.length === 0 ? (
              <Text c="dimmed">No progress entries yet</Text>
            ) : (
              <Stack gap="md">
                {entries.map(entry => (
                  <Card key={entry.id} withBorder>
                    <Stack gap="xs">
                      <Text fw={500}>{new Date(entry.date).toLocaleDateString()}</Text>
                      <Group gap="xs">
                        {entry.weight && (
                          <Badge variant="light">Weight: {entry.weight} kg</Badge>
                        )}
                        {entry.body_fat && (
                          <Badge variant="light">Body Fat: {entry.body_fat}%</Badge>
                        )}
                      </Group>
                      {entry.notes && (
                        <Text size="sm" c="dimmed">{entry.notes}</Text>
                      )}
                    </Stack>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  )
}

export default ProgressTracking

