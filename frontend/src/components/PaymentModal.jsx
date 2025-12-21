import { useState } from 'react'
import { Modal, Stack, Text, Title, Button, Group, Badge, Alert, NumberInput, Select, Textarea, Loader, Card } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import api from '../services/api'

function PaymentModal({ opened, onClose, trainer, onSuccess }) {
  const [paymentType, setPaymentType] = useState('one-time')
  const [amount, setAmount] = useState(trainer?.hourly_rate || 0)
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: Commitment, 2: Payment Details, 3: Processing

  const handlePayment = async () => {
    if (!amount || amount <= 0) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a valid amount',
        color: 'red',
      })
      return
    }

    setLoading(true)
    try {
      if (paymentType === 'one-time') {
        const response = await api.post('/payments/create-payment-intent', {
          trainerId: trainer.id,
          amount: parseFloat(amount),
          description: description || 'Training payment',
        })

        // In a real implementation, you would use Stripe Elements here
        // For now, we'll just show success
        notifications.show({
          title: 'Payment Intent Created',
          message: 'Payment processing will be implemented with Stripe Elements',
          color: 'blue',
        })
        
        if (onSuccess) onSuccess()
        onClose()
      } else {
        const response = await api.post('/payments/create-subscription', {
          trainerId: trainer.id,
          amount: parseFloat(amount),
          billingCycle,
          description: description || 'Training subscription',
        })

        notifications.show({
          title: 'Subscription Created',
          message: 'Subscription processing will be implemented with Stripe Elements',
          color: 'blue',
        })
        
        if (onSuccess) onSuccess()
        onClose()
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to process payment',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Make Payment"
      size="lg"
    >
      {step === 1 && (
        <Stack gap="md">
          <Alert color="blue" title="Investment in Your Health">
            <Text size="sm">
              By making this payment, you're committing to your fitness journey with {trainer?.name}.
              This upfront investment helps ensure your dedication to achieving your goals.
            </Text>
          </Alert>

          <Card withBorder p="md">
            <Stack gap="xs">
              <Text size="sm" c="dimmed">Trainer</Text>
              <Title order={4}>{trainer?.name}</Title>
              {trainer?.hourly_rate && (
                <Text size="sm" c="dimmed">
                  Hourly Rate: ${trainer.hourly_rate}
                </Text>
              )}
            </Stack>
          </Card>

          <Group justify="flex-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => setStep(2)}>Continue to Payment</Button>
          </Group>
        </Stack>
      )}

      {step === 2 && (
        <Stack gap="md">
          <Select
            label="Payment Type"
            value={paymentType}
            onChange={setPaymentType}
            data={[
              { value: 'one-time', label: 'One-Time Payment' },
              { value: 'subscription', label: 'Recurring Subscription' },
            ]}
          />

          <NumberInput
            label="Amount"
            value={amount}
            onChange={setAmount}
            min={0}
            step={10}
            prefix="$"
            required
          />

          {paymentType === 'subscription' && (
            <Select
              label="Billing Cycle"
              value={billingCycle}
              onChange={setBillingCycle}
              data={[
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'yearly', label: 'Yearly' },
              ]}
            />
          )}

          <Textarea
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Initial training package, Monthly coaching..."
          />

          <Group justify="space-between" mt="md">
            <Text size="sm" c="dimmed">
              Total: ${amount} {paymentType === 'subscription' && `per ${billingCycle}`}
            </Text>
          </Group>

          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={handlePayment} loading={loading}>
              Process Payment
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  )
}

export default PaymentModal

