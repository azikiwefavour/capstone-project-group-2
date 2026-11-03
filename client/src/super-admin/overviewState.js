// Frontend presentation state only. This is not an assumed backend API contract.
// 'ready' is the existing success state used by Overview's presentation components.
export const OVERVIEW_STATUSES = Object.freeze({ UNAVAILABLE: 'unavailable', LOADING: 'loading', SUCCESS: 'ready', EMPTY: 'empty', ERROR: 'error' })

/** @template T @param {string} status @param {T} data */
export function overviewSectionState(status = OVERVIEW_STATUSES.UNAVAILABLE, data = null) {
  return { status: Object.values(OVERVIEW_STATUSES).includes(status) ? status : OVERVIEW_STATUSES.UNAVAILABLE, data }
}

/**
 * Independent section states, ready for a future confirmed API adapter.
 * Revenue months: {label, amount}[]; plans: {name, count, share}[] (share in percent).
 * Renewals: {id, hospitalName, plan, amount, renewalDate}[] (ISO date/time).
 * Integrations: {id, uptimePercentage, responseTimeMs, status}[]; IDs match service labels.
 * Activities: {occurredAt, actionType, actor:{kind,name?}, facilityName}[];
 * approved actionType values and timezone-qualified dates follow activityData.js.
 * Null numbers are unknown. Empty collections with status 'unavailable' are not
 * confirmed empty results. Use 'empty' only after a successful empty response.
 */
export function createOverviewState(status = OVERVIEW_STATUSES.UNAVAILABLE) {
  return {
    statisticsState: overviewSectionState(status, { monthlyRevenue: null, previousMonthlyRevenue: null, months: [], plans: [] }),
    platformState: overviewSectionState(status, {
      registeredFacilities: null, activeSubscribers: null, messagesSent: null, patientsOnRecord: null,
      pendingApplications: null, trialSubscriptions: null, overdueSubscriptions: null,
      deliveryPercentage: null, liveFacilities: null,
    }),
    renewalsState: overviewSectionState(status, []),
    integrationsState: overviewSectionState(status, []),
    activitiesState: overviewSectionState(status, []),
  }
}

const amount = value => Number.isFinite(value) && value >= 0 ? value : null
// Safely prepare partial presentation data without calculating missing values.
export function overviewRevenueData(data) {
  return {
    monthlyRevenue: amount(data?.monthlyRevenue), previousMonthlyRevenue: amount(data?.previousMonthlyRevenue),
    months: Array.isArray(data?.months) ? data.months.filter(month => typeof month?.label === 'string' && month.label.trim() && amount(month.amount) !== null) : [],
    plans: Array.isArray(data?.plans) ? data.plans.filter(plan => typeof plan?.name === 'string' && plan.name.trim() && Number.isSafeInteger(plan.count) && plan.count >= 0 && amount(plan.share) !== null && plan.share <= 100) : [],
  }
}
