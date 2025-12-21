import express from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { pool } from '../config/database.js'

const router = express.Router()

router.use(authenticate)
router.use(requireRole(['trainer']))

// Get comprehensive analytics for trainer
router.get('/', async (req, res) => {
  try {
    const trainerId = req.user.id
    const { days = '30' } = req.query

    // Calculate date range
    let dateFilter = ''
    if (days !== 'all') {
      const daysNum = parseInt(days)
      dateFilter = `AND created_at >= NOW() - INTERVAL '${daysNum} days'`
    }

    // Financial Analytics
    const financial = await getFinancialAnalytics(trainerId, dateFilter)

    // Client Analytics
    const clients = await getClientAnalytics(trainerId, dateFilter)

    // Workout Analytics
    const workouts = await getWorkoutAnalytics(trainerId, dateFilter)

    // Check-in Analytics
    const checkIns = await getCheckInAnalytics(trainerId, dateFilter)

    res.json({
      financial,
      clients,
      workouts,
      checkIns
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    res.status(500).json({ message: 'Failed to fetch analytics' })
  }
})

async function getFinancialAnalytics(trainerId, dateFilter) {
  // Total revenue (completed payments only)
  const totalRevenueResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM payments
     WHERE trainer_id = $1 AND status = 'completed' ${dateFilter}`,
    [trainerId]
  )

  // Monthly Recurring Revenue (MRR)
  const mrrResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) as mrr
     FROM subscriptions
     WHERE trainer_id = $1 AND status = 'active'`,
    [trainerId]
  )

  // Active subscriptions
  const activeSubsResult = await pool.query(
    `SELECT COUNT(*) as count
     FROM subscriptions
     WHERE trainer_id = $1 AND status = 'active'`,
    [trainerId]
  )

  // Cancelled subscriptions
  const cancelledSubsResult = await pool.query(
    `SELECT COUNT(*) as count
     FROM subscriptions
     WHERE trainer_id = $1 AND status = 'cancelled' ${dateFilter}`,
    [trainerId]
  )

  // Subscription revenue
  const subRevenueResult = await pool.query(
    `SELECT COALESCE(SUM(p.amount), 0) as total
     FROM payments p
     JOIN subscriptions s ON p.subscription_id = s.id
     WHERE p.trainer_id = $1 AND p.status = 'completed' ${dateFilter}`,
    [trainerId]
  )

  // One-time revenue
  const oneTimeResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM payments
     WHERE trainer_id = $1 AND payment_type = 'one-time' AND status = 'completed' ${dateFilter}`,
    [trainerId]
  )

  // Total payments
  const totalPaymentsResult = await pool.query(
    `SELECT 
       COUNT(*) as total,
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful
     FROM payments
     WHERE trainer_id = $1 ${dateFilter}`,
    [trainerId]
  )

  // Payment success rate
  const totalPayments = parseInt(totalPaymentsResult.rows[0]?.total || 0)
  const successfulPayments = parseInt(totalPaymentsResult.rows[0]?.successful || 0)
  const paymentSuccessRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0

  // Average revenue per client
  const clientCountResult = await pool.query(
    `SELECT COUNT(DISTINCT client_id) as count
     FROM payments
     WHERE trainer_id = $1 AND status = 'completed' ${dateFilter}`,
    [trainerId]
  )
  const clientCount = parseInt(clientCountResult.rows[0]?.count || 0)
  const totalRevenue = parseFloat(totalRevenueResult.rows[0]?.total || 0)
  const avgRevenuePerClient = clientCount > 0 ? totalRevenue / clientCount : 0

  // Churn rate
  const totalSubsResult = await pool.query(
    `SELECT COUNT(*) as total
     FROM subscriptions
     WHERE trainer_id = $1`,
    [trainerId]
  )
  const totalSubs = parseInt(totalSubsResult.rows[0]?.total || 0)
  const cancelledSubs = parseInt(cancelledSubsResult.rows[0]?.count || 0)
  const churnRate = totalSubs > 0 ? (cancelledSubs / totalSubs) * 100 : 0

  // Average subscription duration
  const avgDurationResult = await pool.query(
    `SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(cancelled_at, NOW()) - created_at)) / 86400)::INTEGER) as avg_days
     FROM subscriptions
     WHERE trainer_id = $1 AND cancelled_at IS NOT NULL`,
    [trainerId]
  )

  // Top paying clients
  const topClientsResult = await pool.query(
    `SELECT 
       u.id,
       u.name,
       COALESCE(SUM(p.amount), 0) as total_revenue
     FROM users u
     JOIN payments p ON u.id = p.client_id
     WHERE p.trainer_id = $1 AND p.status = 'completed' ${dateFilter}
     GROUP BY u.id, u.name
     ORDER BY total_revenue DESC
     LIMIT 5`,
    [trainerId]
  )

  return {
    totalRevenue: parseFloat(totalRevenueResult.rows[0]?.total || 0),
    monthlyRecurringRevenue: parseFloat(mrrResult.rows[0]?.mrr || 0),
    activeSubscriptions: parseInt(activeSubsResult.rows[0]?.count || 0),
    cancelledSubscriptions: parseInt(cancelledSubsResult.rows[0]?.count || 0),
    subscriptionRevenue: parseFloat(subRevenueResult.rows[0]?.total || 0),
    oneTimeRevenue: parseFloat(oneTimeResult.rows[0]?.total || 0),
    totalPayments: totalPayments,
    paymentSuccessRate: paymentSuccessRate,
    avgRevenuePerClient: avgRevenuePerClient,
    totalClients: clientCount,
    churnRate: churnRate,
    avgSubscriptionDuration: parseInt(avgDurationResult.rows[0]?.avg_days || 0),
    topClients: topClientsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      totalRevenue: parseFloat(row.total_revenue)
    }))
  }
}

async function getClientAnalytics(trainerId, dateFilter) {
  // Total clients
  const totalClientsResult = await pool.query(
    `SELECT COUNT(*) as count
     FROM clients
     WHERE trainer_id = $1`,
    [trainerId]
  )

  // Active clients (have recent activity)
  const activeClientsResult = await pool.query(
    `SELECT COUNT(DISTINCT c.user_id) as count
     FROM clients c
     LEFT JOIN workout_assignments wa ON c.user_id = wa.client_id
     WHERE c.trainer_id = $1
       AND (wa.completed_date >= NOW() - INTERVAL '30 days' OR wa.assigned_date >= NOW() - INTERVAL '30 days')`,
    [trainerId]
  )

  // New clients
  const newClientsResult = await pool.query(
    `SELECT COUNT(*) as count
     FROM clients
     WHERE trainer_id = $1 ${dateFilter.replace('created_at', 'clients.created_at')}`,
    [trainerId]
  )

  // Average workouts per client
  const avgWorkoutsResult = await pool.query(
    `SELECT 
       COUNT(DISTINCT wa.client_id) as client_count,
       COUNT(wa.id) as workout_count
     FROM clients c
     JOIN workout_assignments wa ON c.user_id = wa.client_id
     WHERE c.trainer_id = $1 ${dateFilter.replace('created_at', 'wa.created_at')}`,
    [trainerId]
  )
  const clientCount = parseInt(avgWorkoutsResult.rows[0]?.client_count || 0)
  const workoutCount = parseInt(avgWorkoutsResult.rows[0]?.workout_count || 0)
  const avgWorkoutsPerClient = clientCount > 0 ? workoutCount / clientCount : 0

  // Average check-ins per client
  const avgCheckInsResult = await pool.query(
    `SELECT 
       COUNT(DISTINCT dc.client_id) as client_count,
       COUNT(dc.id) as checkin_count
     FROM clients c
     JOIN daily_check_ins dc ON c.user_id = dc.client_id
     WHERE c.trainer_id = $1 ${dateFilter.replace('created_at', 'dc.created_at')}`,
    [trainerId]
  )
  const checkInClientCount = parseInt(avgCheckInsResult.rows[0]?.client_count || 0)
  const checkInCount = parseInt(avgCheckInsResult.rows[0]?.checkin_count || 0)
  const avgCheckInsPerClient = checkInClientCount > 0 ? checkInCount / checkInClientCount : 0

  // Clients with goals
  const clientsWithGoalsResult = await pool.query(
    `SELECT COUNT(*) as count
     FROM clients
     WHERE trainer_id = $1 AND primary_goal IS NOT NULL`,
    [trainerId]
  )

  // Retention rate (simplified - clients with activity in last 30 days)
  const retentionResult = await pool.query(
    `SELECT 
       COUNT(DISTINCT c.user_id) as active,
       (SELECT COUNT(*) FROM clients WHERE trainer_id = $1) as total
     FROM clients c
     LEFT JOIN workout_assignments wa ON c.user_id = wa.client_id
     WHERE c.trainer_id = $1
       AND (wa.completed_date >= NOW() - INTERVAL '30 days' OR wa.assigned_date >= NOW() - INTERVAL '30 days')`,
    [trainerId]
  )
  const active = parseInt(retentionResult.rows[0]?.active || 0)
  const total = parseInt(retentionResult.rows[0]?.total || 0)
  const retentionRate = total > 0 ? (active / total) * 100 : 0

  return {
    totalClients: parseInt(totalClientsResult.rows[0]?.count || 0),
    activeClients: parseInt(activeClientsResult.rows[0]?.count || 0),
    newClients: parseInt(newClientsResult.rows[0]?.count || 0),
    retentionRate: retentionRate,
    avgWorkoutsPerClient: avgWorkoutsPerClient,
    avgCheckInsPerClient: avgCheckInsPerClient,
    clientsWithGoals: parseInt(clientsWithGoalsResult.rows[0]?.count || 0),
    goalAchievementRate: 0, // TODO: Calculate based on goal completion
    avgProgressScore: 0, // TODO: Calculate based on progress entries
    mostEngagedClient: null // TODO: Calculate based on activity
  }
}

async function getWorkoutAnalytics(trainerId, dateFilter) {
  // Total assigned
  const totalAssignedResult = await pool.query(
    `SELECT COUNT(*) as count
     FROM workout_assignments wa
     JOIN workouts w ON wa.workout_id = w.id
     WHERE w.trainer_id = $1 ${dateFilter.replace('created_at', 'wa.created_at')}`,
    [trainerId]
  )

  // Total completed
  const totalCompletedResult = await pool.query(
    `SELECT COUNT(*) as count
     FROM workout_assignments wa
     JOIN workouts w ON wa.workout_id = w.id
     WHERE w.trainer_id = $1 AND wa.status = 'completed' ${dateFilter.replace('created_at', 'wa.completed_date')}`,
    [trainerId]
  )

  const totalAssigned = parseInt(totalAssignedResult.rows[0]?.count || 0)
  const totalCompleted = parseInt(totalCompletedResult.rows[0]?.count || 0)
  const completionRate = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0

  // Average rating
  const avgRatingResult = await pool.query(
    `SELECT AVG(dc.workout_rating) as avg_rating
     FROM daily_check_ins dc
     JOIN clients c ON dc.client_id = c.user_id
     WHERE c.trainer_id = $1 AND dc.workout_rating IS NOT NULL ${dateFilter.replace('created_at', 'dc.check_in_date')}`,
    [trainerId]
  )

  // Average duration
  const avgDurationResult = await pool.query(
    `SELECT AVG(dc.workout_duration) as avg_duration
     FROM daily_check_ins dc
     JOIN clients c ON dc.client_id = c.user_id
     WHERE c.trainer_id = $1 AND dc.workout_duration IS NOT NULL ${dateFilter.replace('created_at', 'dc.check_in_date')}`,
    [trainerId]
  )

  return {
    totalAssigned: totalAssigned,
    totalCompleted: totalCompleted,
    completionRate: completionRate,
    avgRating: parseFloat(avgRatingResult.rows[0]?.avg_rating || 0),
    avgDuration: parseInt(avgDurationResult.rows[0]?.avg_duration || 0),
    mostPopularWorkout: null, // TODO: Calculate
    peakWorkoutDay: null // TODO: Calculate
  }
}

async function getCheckInAnalytics(trainerId, dateFilter) {
  // Total check-ins
  const totalCheckInsResult = await pool.query(
    `SELECT COUNT(*) as count
     FROM daily_check_ins dc
     JOIN clients c ON dc.client_id = c.user_id
     WHERE c.trainer_id = $1 ${dateFilter.replace('created_at', 'dc.check_in_date')}`,
    [trainerId]
  )

  // Expected check-ins (simplified - based on active clients)
  const expectedCheckInsResult = await pool.query(
    `SELECT COUNT(DISTINCT c.user_id) * ${dateFilter.includes('30') ? '30' : dateFilter.includes('7') ? '7' : '1'} as expected
     FROM clients c
     WHERE c.trainer_id = $1`,
    [trainerId]
  )
  const totalCheckIns = parseInt(totalCheckInsResult.rows[0]?.count || 0)
  const expectedCheckIns = parseInt(expectedCheckInsResult.rows[0]?.expected || 1)
  const completionRate = expectedCheckIns > 0 ? (totalCheckIns / expectedCheckIns) * 100 : 0

  // Average sleep quality
  const avgSleepQualityResult = await pool.query(
    `SELECT AVG(dc.sleep_quality) as avg_quality
     FROM daily_check_ins dc
     JOIN clients c ON dc.client_id = c.user_id
     WHERE c.trainer_id = $1 AND dc.sleep_quality IS NOT NULL ${dateFilter.replace('created_at', 'dc.check_in_date')}`,
    [trainerId]
  )

  // Average energy level
  const avgEnergyResult = await pool.query(
    `SELECT AVG(dc.energy_level) as avg_energy
     FROM daily_check_ins dc
     JOIN clients c ON dc.client_id = c.user_id
     WHERE c.trainer_id = $1 AND dc.energy_level IS NOT NULL ${dateFilter.replace('created_at', 'dc.check_in_date')}`,
    [trainerId]
  )

  // Average sleep hours
  const avgSleepHoursResult = await pool.query(
    `SELECT AVG(dc.sleep_hours) as avg_hours
     FROM daily_check_ins dc
     JOIN clients c ON dc.client_id = c.user_id
     WHERE c.trainer_id = $1 AND dc.sleep_hours IS NOT NULL ${dateFilter.replace('created_at', 'dc.check_in_date')}`,
    [trainerId]
  )

  // Pain reports
  const painReportsResult = await pool.query(
    `SELECT COUNT(*) as count
     FROM daily_check_ins dc
     JOIN clients c ON dc.client_id = c.user_id
     WHERE c.trainer_id = $1 AND dc.pain_experienced = true ${dateFilter.replace('created_at', 'dc.check_in_date')}`,
    [trainerId]
  )

  // Response rate (check-ins with trainer responses)
  const responseRateResult = await pool.query(
    `SELECT 
       COUNT(*) as total,
       SUM(CASE WHEN dc.trainer_response IS NOT NULL THEN 1 ELSE 0 END) as responded
     FROM daily_check_ins dc
     JOIN clients c ON dc.client_id = c.user_id
     WHERE c.trainer_id = $1 ${dateFilter.replace('created_at', 'dc.check_in_date')}`,
    [trainerId]
  )
  const totalWithResponses = parseInt(responseRateResult.rows[0]?.total || 0)
  const responded = parseInt(responseRateResult.rows[0]?.responded || 0)
  const responseRate = totalWithResponses > 0 ? (responded / totalWithResponses) * 100 : 0

  // Average check-ins per client
  const avgCheckInsPerClientResult = await pool.query(
    `SELECT 
       COUNT(DISTINCT dc.client_id) as client_count,
       COUNT(dc.id) as checkin_count
     FROM daily_check_ins dc
     JOIN clients c ON dc.client_id = c.user_id
     WHERE c.trainer_id = $1 ${dateFilter.replace('created_at', 'dc.check_in_date')}`,
    [trainerId]
  )
  const checkInClientCount = parseInt(avgCheckInsPerClientResult.rows[0]?.client_count || 0)
  const checkInCount = parseInt(avgCheckInsPerClientResult.rows[0]?.checkin_count || 0)
  const avgCheckInsPerClient = checkInClientCount > 0 ? checkInCount / checkInClientCount : 0

  return {
    totalCheckIns: totalCheckIns,
    completionRate: completionRate,
    avgSleepQuality: parseFloat(avgSleepQualityResult.rows[0]?.avg_quality || 0),
    avgEnergyLevel: parseFloat(avgEnergyResult.rows[0]?.avg_energy || 0),
    avgSleepHours: parseFloat(avgSleepHoursResult.rows[0]?.avg_hours || 0),
    painReports: parseInt(painReportsResult.rows[0]?.count || 0),
    responseRate: responseRate,
    avgCheckInsPerClient: avgCheckInsPerClient,
    consistentClients: 0, // TODO: Calculate based on streaks
    bestCheckInDay: null // TODO: Calculate
  }
}

export default router

