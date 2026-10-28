// Internal presentation model; not an assumed or connected backend API contract.
const actionLabels = {
  facility_application_submitted: 'Facility application submitted',
  facility_approved: 'Facility approved',
  facility_rejected: 'Facility rejected',
  payment_successful: 'Payment successful',
  payment_failed: 'Payment failed',
  payment_retry_scheduled: 'Payment retry scheduled',
  subscription_renewed: 'Subscription renewed',
  subscription_expired: 'Subscription expired',
}

function activityTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return NaN
  const calendar = value.slice(0, 10)
  const calendarTime = Date.parse(calendar)
  const timestamp = Date.parse(value)
  return Number.isFinite(calendarTime) && new Date(calendarTime).toISOString().slice(0, 10) === calendar && Number.isFinite(timestamp) ? timestamp : NaN
}

export function normalizePlatformActivity(record) {
  if (!record || !Object.hasOwn(actionLabels, record.actionType)) return null
  const timestamp = activityTimestamp(record.occurredAt)
  if (!Number.isFinite(timestamp)) return null
  const actor = record.actor?.kind === 'system' ? 'System'
    : record.actor?.kind === 'user' && typeof record.actor.name === 'string' && record.actor.name.trim() ? record.actor.name.trim() : 'Unavailable'
  // Explicitly select safe display fields. Never copy descriptions, emails or patient data.
  return {
    occurredAt: record.occurredAt, timestamp, actor,
    action: actionLabels[record.actionType],
    facility: typeof record.facilityName === 'string' && record.facilityName.trim() ? record.facilityName.trim() : 'Facility unavailable',
  }
}

// Dashboard API actions are display text, not the older internal action enum.
// Select only table fields; never retain metadata or descriptions.
export function normalizeDashboardActivity(record) {
  const timestamp = activityTimestamp(record?.rawDate)
  if (!Number.isFinite(timestamp) || typeof record?.action !== 'string' || !record.action.trim()) return null
  return {
    occurredAt: record.rawDate, timestamp, action: record.action.trim(),
    actor: typeof record.who?.name === 'string' && record.who.name.trim() ? record.who.name.trim() : 'Unavailable',
    facility: typeof record.facility === 'string' && record.facility.trim() ? record.facility.trim() : 'Facility unavailable',
  }
}

export function recentPlatformActivities(records) {
  return Array.isArray(records) ? records.map(normalizePlatformActivity).filter(Boolean).sort((a, b) => b.timestamp - a.timestamp) : []
}

export function formatActivityTimestamp(value) {
  const timestamp = activityTimestamp(value)
  return Number.isFinite(timestamp) ? new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' }).format(timestamp) + ' UTC' : 'Unavailable'
}
