import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './Payments.css'

function Payments() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [stripeStatus, setStripeStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      if (user.role === 'trainer') {
        const [paymentsRes, statusRes] = await Promise.all([
          api.get('/payments/trainer/history'),
          api.get('/payments/trainer/connect/status')
        ])
        setPayments(paymentsRes.data)
        setStripeStatus(statusRes.data)
      } else {
        const [paymentsRes, subsRes] = await Promise.all([
          api.get('/payments/client/history'),
          api.get('/payments/client/subscriptions')
        ])
        setPayments(paymentsRes.data)
        setSubscriptions(subsRes.data)
      }
    } catch (error) {
      console.error('Error fetching payment data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectStripe = async () => {
    try {
      const response = await api.post('/payments/trainer/connect/setup')
      window.location.href = response.data.onboardingUrl
    } catch (error) {
      console.error('Error connecting Stripe:', error)
      alert('Failed to setup payment account')
    }
  }

  const handleCancelSubscription = async (subscriptionId) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) {
      return
    }

    try {
      await api.post(`/payments/subscriptions/${subscriptionId}/cancel`)
      fetchData()
      alert('Subscription cancelled successfully')
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      alert('Failed to cancel subscription')
    }
  }

  if (loading) {
    return <div className="payments-container">Loading...</div>
  }

  return (
    <div className="payments-container">
      <h1>Payments</h1>

      {user.role === 'trainer' && (
        <div className="stripe-connect-section">
          <h2>Payment Setup</h2>
          {!stripeStatus?.connected ? (
            <div className="connect-card">
              <p>Connect your Stripe account to receive payments directly from clients with zero platform fees.</p>
              <button onClick={handleConnectStripe} className="btn-connect">
                Connect Stripe Account
              </button>
            </div>
          ) : (
            <div className="status-card">
              <div className="status-item">
                <strong>Status:</strong> {stripeStatus.onboardingCompleted ? 'Active' : 'Pending Setup'}
              </div>
              <div className="status-item">
                <strong>Charges Enabled:</strong> {stripeStatus.chargesEnabled ? 'Yes' : 'No'}
              </div>
              <div className="status-item">
                <strong>Payouts Enabled:</strong> {stripeStatus.payoutsEnabled ? 'Yes' : 'No'}
              </div>
              {!stripeStatus.onboardingCompleted && (
                <p className="warning">Complete your Stripe onboarding to receive payments.</p>
              )}
            </div>
          )}
        </div>
      )}

      {user.role === 'client' && subscriptions.length > 0 && (
        <div className="subscriptions-section">
          <h2>Active Subscriptions</h2>
          <div className="subscriptions-list">
            {subscriptions.map(sub => (
              <div key={sub.id} className="subscription-card">
                <div className="subscription-header">
                  <div>
                    <h3>{sub.trainer_name}</h3>
                    <p>${sub.amount}/{sub.billing_cycle}</p>
                  </div>
                  <span className={`status-badge ${sub.status}`}>{sub.status}</span>
                </div>
                <div className="subscription-details">
                  <p>Next billing: {new Date(sub.current_period_end).toLocaleDateString()}</p>
                  {sub.status === 'active' && (
                    <button
                      onClick={() => handleCancelSubscription(sub.id)}
                      className="btn-cancel"
                    >
                      Cancel Subscription
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="payments-history-section">
        <h2>Payment History</h2>
        {payments.length === 0 ? (
          <p>No payments yet</p>
        ) : (
          <div className="payments-list">
            {payments.map(payment => (
              <div key={payment.id} className="payment-card">
                <div className="payment-header">
                  <div>
                    <h3>
                      {user.role === 'trainer' ? payment.client_name : payment.trainer_name}
                    </h3>
                    <p className="payment-type">{payment.payment_type}</p>
                  </div>
                  <div className="payment-amount">
                    ${payment.amount} {payment.currency.toUpperCase()}
                  </div>
                </div>
                <div className="payment-footer">
                  <span className={`status-badge ${payment.status}`}>{payment.status}</span>
                  <span className="payment-date">
                    {new Date(payment.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Payments

