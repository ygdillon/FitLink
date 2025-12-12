import express from 'express'
import Stripe from 'stripe'
import { authenticate, requireRole } from '../middleware/auth.js'
import { pool } from '../config/database.js'

const router = express.Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

router.use(authenticate)

// Get trainer's Stripe Connect account
async function getTrainerStripeAccount(trainerId) {
  const result = await pool.query(
    'SELECT stripe_account_id FROM trainer_stripe_accounts WHERE trainer_id = $1',
    [trainerId]
  )
  return result.rows[0]?.stripe_account_id
}

// Create Stripe Connect account for trainer (P2P setup)
router.post('/trainer/connect/setup', requireRole(['trainer']), async (req, res) => {
  try {
    const trainerId = req.user.id

    // Check if account already exists
    const existing = await pool.query(
      'SELECT stripe_account_id FROM trainer_stripe_accounts WHERE trainer_id = $1',
      [trainerId]
    )

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Stripe account already connected' })
    }

    // Create Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US', // Default, can be made configurable
      email: req.user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    })

    // Save account to database
    await pool.query(
      `INSERT INTO trainer_stripe_accounts (trainer_id, stripe_account_id, stripe_account_type)
       VALUES ($1, $2, 'express')`,
      [trainerId, account.id]
    )

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL}/profile?stripe_refresh=true`,
      return_url: `${process.env.FRONTEND_URL}/profile?stripe_success=true`,
      type: 'account_onboarding',
    })

    res.json({
      accountId: account.id,
      onboardingUrl: accountLink.url,
    })
  } catch (error) {
    console.error('Error setting up Stripe Connect:', error)
    res.status(500).json({ message: 'Failed to setup payment account' })
  }
})

// Get trainer's Stripe Connect status
router.get('/trainer/connect/status', requireRole(['trainer']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT stripe_account_id, onboarding_completed, charges_enabled, payouts_enabled
       FROM trainer_stripe_accounts WHERE trainer_id = $1`,
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.json({ connected: false })
    }

    const account = result.rows[0]
    
    // Fetch latest status from Stripe
    if (account.stripe_account_id) {
      try {
        const stripeAccount = await stripe.accounts.retrieve(account.stripe_account_id)
        await pool.query(
          `UPDATE trainer_stripe_accounts 
           SET onboarding_completed = $1, charges_enabled = $2, payouts_enabled = $3
           WHERE trainer_id = $4`,
          [
            stripeAccount.details_submitted,
            stripeAccount.charges_enabled,
            stripeAccount.payouts_enabled,
            req.user.id
          ]
        )
        
        return res.json({
          connected: true,
          accountId: account.stripe_account_id,
          onboardingCompleted: stripeAccount.details_submitted,
          chargesEnabled: stripeAccount.charges_enabled,
          payoutsEnabled: stripeAccount.payouts_enabled,
        })
      } catch (stripeError) {
        console.error('Error fetching Stripe account:', stripeError)
      }
    }

    res.json({
      connected: true,
      ...account,
    })
  } catch (error) {
    console.error('Error getting Stripe status:', error)
    res.status(500).json({ message: 'Failed to get payment status' })
  }
})

// Create payment intent (one-time payment)
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { trainerId, amount, currency = 'usd', description } = req.body

    if (!trainerId || !amount) {
      return res.status(400).json({ message: 'Trainer ID and amount are required' })
    }

    // Get trainer's Stripe Connect account
    const stripeAccountId = await getTrainerStripeAccount(trainerId)
    if (!stripeAccountId) {
      return res.status(400).json({ message: 'Trainer has not set up payments' })
    }

    // Create payment intent with application fee of 0 (P2P - no platform cut)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      description: description || 'Training payment',
      application_fee_amount: 0, // Zero platform fee - P2P
      transfer_data: {
        destination: stripeAccountId, // Direct to trainer
      },
    }, {
      stripeAccount: stripeAccountId,
    })

    // Save payment record
    await pool.query(
      `INSERT INTO payments (trainer_id, client_id, amount, currency, payment_type, 
                            stripe_payment_intent_id, stripe_connect_account_id, status, description)
       VALUES ($1, $2, $3, $4, 'one-time', $5, $6, 'pending', $7)`,
      [trainerId, req.user.id, amount, currency, paymentIntent.id, stripeAccountId, description]
    )

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    console.error('Error creating payment intent:', error)
    res.status(500).json({ message: 'Failed to create payment' })
  }
})

// Create subscription (recurring payment)
router.post('/create-subscription', async (req, res) => {
  try {
    const { trainerId, amount, currency = 'usd', billingCycle = 'monthly', description } = req.body

    if (!trainerId || !amount) {
      return res.status(400).json({ message: 'Trainer ID and amount are required' })
    }

    // Get trainer's Stripe Connect account
    const stripeAccountId = await getTrainerStripeAccount(trainerId)
    if (!stripeAccountId) {
      return res.status(400).json({ message: 'Trainer has not set up payments' })
    }

    // Create or retrieve Stripe customer
    let customerId = req.user.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.name,
      })
      customerId = customer.id
      
      // Save customer ID to user (would need to add this field to users table)
      // For now, we'll store it in the subscription
    }

    // Determine billing interval
    const interval = billingCycle === 'weekly' ? 'week' : billingCycle === 'yearly' ? 'year' : 'month'

    // Create subscription with 0% platform fee
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price_data: {
          currency,
          unit_amount: Math.round(amount * 100),
          recurring: {
            interval,
          },
          product_data: {
            name: description || 'Training Subscription',
          },
        },
      }],
      application_fee_percent: 0, // Zero platform fee - P2P
      transfer_data: {
        destination: stripeAccountId, // Direct to trainer
      },
    })

    // Save subscription
    const subResult = await pool.query(
      `INSERT INTO subscriptions (trainer_id, client_id, amount, currency, billing_cycle,
                                  stripe_subscription_id, stripe_customer_id, stripe_connect_account_id,
                                  status, current_period_start, current_period_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10)
       RETURNING id`,
      [
        trainerId,
        req.user.id,
        amount,
        currency,
        billingCycle,
        subscription.id,
        customerId,
        stripeAccountId,
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000),
      ]
    )

    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      status: subscription.status,
    })
  } catch (error) {
    console.error('Error creating subscription:', error)
    res.status(500).json({ message: 'Failed to create subscription' })
  }
})

// Get payment history (trainer)
router.get('/trainer/history', requireRole(['trainer']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.amount, p.currency, p.payment_type, p.status, p.created_at, p.completed_at,
              u.name as client_name, u.email as client_email
       FROM payments p
       JOIN users u ON p.client_id = u.id
       WHERE p.trainer_id = $1
       ORDER BY p.created_at DESC
       LIMIT 50`,
      [req.user.id]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching payment history:', error)
    res.status(500).json({ message: 'Failed to fetch payment history' })
  }
})

// Get payment history (client)
router.get('/client/history', requireRole(['client']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.amount, p.currency, p.payment_type, p.status, p.created_at, p.completed_at,
              u.name as trainer_name
       FROM payments p
       JOIN users u ON p.trainer_id = u.id
       WHERE p.client_id = $1
       ORDER BY p.created_at DESC
       LIMIT 50`,
      [req.user.id]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching payment history:', error)
    res.status(500).json({ message: 'Failed to fetch payment history' })
  }
})

// Get subscriptions (client)
router.get('/client/subscriptions', requireRole(['client']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.amount, s.currency, s.billing_cycle, s.status,
              s.current_period_start, s.current_period_end,
              u.name as trainer_name
       FROM subscriptions s
       JOIN users u ON s.trainer_id = u.id
       WHERE s.client_id = $1
       ORDER BY s.created_at DESC`,
      [req.user.id]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching subscriptions:', error)
    res.status(500).json({ message: 'Failed to fetch subscriptions' })
  }
})

// Cancel subscription
router.post('/subscriptions/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params

    // Get subscription
    const subResult = await pool.query(
      'SELECT stripe_subscription_id, client_id FROM subscriptions WHERE id = $1',
      [id]
    )

    if (subResult.rows.length === 0) {
      return res.status(404).json({ message: 'Subscription not found' })
    }

    const subscription = subResult.rows[0]

    // Verify ownership
    if (subscription.client_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    // Cancel in Stripe
    await stripe.subscriptions.cancel(subscription.stripe_subscription_id)

    // Update in database
    await pool.query(
      `UPDATE subscriptions 
       SET status = 'cancelled', cancelled_at = NOW()
       WHERE id = $1`,
      [id]
    )

    res.json({ message: 'Subscription cancelled successfully' })
  } catch (error) {
    console.error('Error cancelling subscription:', error)
    res.status(500).json({ message: 'Failed to cancel subscription' })
  }
})

export default router

