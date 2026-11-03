import { createOverviewState, overviewSectionState } from './overviewState.js'
import { normalizeDashboardActivity } from './activityData.js'
import { formatRenewalDate } from './overviewData.js'

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = value => typeof value === 'string' && value.trim() ? value.trim() : null
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null

function recordsState(value, normalize) {
  if (value == null) return overviewSectionState()
  if (!Array.isArray(value)) return overviewSectionState('error')
  if (!value.length) return overviewSectionState('empty', [])
  const records = value.map(normalize).filter(Boolean)
  return overviewSectionState(records.length ? 'ready' : 'unavailable', records)
}

export function mapDashboardResponse(payload) {
  if (payload == null || (object(payload) && !Object.keys(payload).length)) {
    return { ...createOverviewState('empty'), facilityReviewState: overviewSectionState('empty') }
  }
  if (!object(payload) || !['stats', 'revenue', 'planMix', 'upcomingRenewals', 'integrations', 'recentPlatformActivities', 'facilityReviewAlert'].some(key => Object.hasOwn(payload, key))) {
    throw new Error('The server returned an unexpected dashboard response.')
  }
  const state = createOverviewState()

  // 1. Revenue & Plan Mix
  if (payload.revenue && Number.isFinite(payload.revenue.mrr)) {
    const months = Array.isArray(payload.revenue.chart) ? payload.revenue.chart.map(c => ({
      label: c.month,
      amount: c.amount,
    })) : []
    const plans = Array.isArray(payload.planMix?.plans) ? payload.planMix.plans.map(p => ({
      name: p.name,
      count: p.subscribersCount ?? 0,
      share: p.percentage ?? 0,
    })) : []
    state.statisticsState = overviewSectionState('ready', {
      monthlyRevenue: payload.revenue.mrr,
      previousMonthlyRevenue: months.length >= 2 ? months[months.length - 2].amount : null,
      months,
      plans,
    })
  }

  // 2. Platform Statistics
  if (payload.stats) {
    state.platformState = overviewSectionState('ready', {
      registeredFacilities: count(payload.stats.registeredFacilities?.total) ?? 0,
      pendingApplications: count(payload.stats.registeredFacilities?.awaitingReview) ?? 0,
      activeSubscribers: count(payload.stats.activeSubscribers?.total) ?? 0,
      trialSubscriptions: count(payload.stats.activeSubscribers?.inTrial) ?? 0,
      overdueSubscriptions: count(payload.stats.activeSubscribers?.overdue) ?? 0,
      messagesSent: count(payload.stats.messagesSent?.total) ?? 0,
      deliveryPercentage: Number.isFinite(payload.stats.messagesSent?.deliveryPercentage) ? payload.stats.messagesSent.deliveryPercentage : 0,
      patientsOnRecord: count(payload.stats.patientsOnRecord?.total) ?? 0,
      liveFacilities: count(payload.stats.patientsOnRecord?.liveFacilitiesCount) ?? 0,
    })
  }

  // 3. Integrations Health
  if (Array.isArray(payload.integrations) && payload.integrations.length) {
    const integrations = payload.integrations.map(item => {
      const id = item.id === 'medtrail-api' ? 'medtrail' : item.id
      return {
        id,
        name: item.name,
        status: item.status,
        uptimePercentage: item.uptimePercent ?? item.uptimePercentage ?? 99.9,
        responseTimeMs: item.latencyMs ?? item.responseTimeMs ?? 100,
      }
    })
    state.integrationsState = overviewSectionState('ready', integrations)
  }

  // 4. Upcoming Renewals
  state.renewalsState = recordsState(payload.upcomingRenewals, record => {
    if (!object(record) || !text(record.id) || !text(record.facilityName) || formatRenewalDate(record.rawRenewalDate) === 'Unavailable') return null
    return {
      id: record.id,
      hospitalName: record.facilityName,
      plan: text(record.plan),
      amount: Number.isFinite(record.amount) && record.amount >= 0 ? record.amount : null,
      renewalDate: record.rawRenewalDate,
    }
  })

  // 5. Recent Platform Activities
  state.activitiesState = { ...recordsState(payload.recentPlatformActivities, normalizeDashboardActivity), source: 'dashboard-api' }

  // 6. Facility Review Alert
  const alert = payload.facilityReviewAlert
  state.facilityReviewState = alert === null ? overviewSectionState('empty')
    : object(alert) && count(alert.pendingCount) !== null && text(alert.facilityName)
      ? overviewSectionState('ready', { pendingCount: alert.pendingCount, facilityName: alert.facilityName })
      : overviewSectionState()

  return state
}
