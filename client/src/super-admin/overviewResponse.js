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
  // Invalid records are unavailable, not a confirmed empty dataset.
  return overviewSectionState(records.length ? 'ready' : 'unavailable', records)
}

// Contract audited at backend origin/main 0817372. Never infer provenance from
// a number's value: the whole field is withheld when its source uses demo defaults.
export function mapDashboardResponse(payload) {
  if (payload == null || (object(payload) && !Object.keys(payload).length)) {
    return { ...createOverviewState('empty'), facilityReviewState: overviewSectionState('empty') }
  }
  if (!object(payload) || !['stats', 'revenue', 'planMix', 'upcomingRenewals', 'integrations', 'recentPlatformActivities', 'facilityReviewAlert'].some(key => Object.hasOwn(payload, key))) {
    throw new Error('The server returned an unexpected dashboard response.')
  }
  const state = createOverviewState()
  // MRR, comparisons, chart, message counts/rate, patient floor/live-facility
  // count and all four displayed integration services are hardcoded upstream.
  // Facility/subscriber/trial/overdue totals have ambiguous nonzero fallbacks.
  // Plan Mix includes inactive facilities, so cannot populate the existing
  // "active hospital subscriptions" presentation truthfully. Keep unavailable.
  const pending = count(payload.stats?.registeredFacilities?.awaitingReview)
  if (pending !== null) {
    state.platformState.status = 'ready'
    state.platformState.data.pendingApplications = pending
  }
  state.renewalsState = recordsState(payload.upcomingRenewals, record => {
    if (!object(record) || !text(record.id) || !text(record.facilityName) || formatRenewalDate(record.rawRenewalDate) === 'Unavailable') return null
    return { id: record.id, hospitalName: record.facilityName, plan: text(record.plan),
      amount: Number.isFinite(record.amount) && record.amount >= 0 ? record.amount : null,
      renewalDate: record.rawRenewalDate }
  })
  state.activitiesState = { ...recordsState(payload.recentPlatformActivities, normalizeDashboardActivity), source: 'dashboard-api' }
  const alert = payload.facilityReviewAlert
  state.facilityReviewState = alert === null ? overviewSectionState('empty')
    : object(alert) && count(alert.pendingCount) !== null && text(alert.facilityName)
      ? overviewSectionState('ready', { pendingCount: alert.pendingCount, facilityName: alert.facilityName })
      : overviewSectionState()
  return state
}
