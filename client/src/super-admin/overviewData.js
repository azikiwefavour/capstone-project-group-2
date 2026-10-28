// Internal presentation model pending confirmed API contracts. No network requests.
function renewalTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:$|T.*(?:Z|[+-]\d{2}:\d{2})$)/.test(value)) return NaN
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return NaN
  const calendarDate = value.slice(0, 10)
  const calendarTimestamp = Date.parse(calendarDate)
  if (!Number.isFinite(calendarTimestamp) || new Date(calendarTimestamp).toISOString().slice(0, 10) !== calendarDate) return NaN
  return timestamp
}

export function futureRenewals(records, now = Date.now()) {
  if (!Array.isArray(records)) return []
  return records.filter(record => record && renewalTimestamp(record.renewalDate) > now)
    .slice().sort((a, b) => renewalTimestamp(a.renewalDate) - renewalTimestamp(b.renewalDate))
}

export function formatRenewalDate(value) {
  const timestamp = renewalTimestamp(value)
  return Number.isFinite(timestamp) ? new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(timestamp) : 'Unavailable'
}

export function integrationHealth(record) {
  // Never infer operational status from uptime, latency or missing health data.
  const status = ['operational', 'degraded', 'down'].includes(record?.status) ? record.status : 'unavailable'
  return {
    status,
    uptime: Number.isFinite(record?.uptimePercentage) && record.uptimePercentage >= 0 && record.uptimePercentage <= 100 ? `${record.uptimePercentage.toFixed(2)}% uptime` : 'Uptime unavailable',
    response: Number.isFinite(record?.responseTimeMs) && record.responseTimeMs >= 0 ? `${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 1 }).format(record.responseTimeMs)} ms` : 'Response time unavailable',
  }
}
