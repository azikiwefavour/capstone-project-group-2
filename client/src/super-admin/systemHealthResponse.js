const text = value => typeof value === 'string' && value.trim() ? value : null
const milliseconds = value => Number.isFinite(value) && value >= 0 ? value : null
function timestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null
  const day = value.slice(0, 10), time = Date.parse(day)
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === day && Number.isFinite(Date.parse(value)) ? value : null
}

export function mapSystemHealthPing(value) {
  if (!value || value.status !== 'UP' || !Number.isSafeInteger(value.uptime) || value.uptime < 0 || !timestamp(value.timestamp)) throw new Error('The server returned an unexpected health-check response.')
  return {
    status: 'ready',
    data: {
      // The known application handler responded. This says nothing about its
      // dependencies, historical uptime, request latency or incident state.
      services: [{ id: 'medtrail', name: 'Medtrail API', description: 'Current API liveness', status: null,
        liveness: 'UP', uptimePercentage: null, responseTimeMs: null }],
      observedAt: value.timestamp,
    },
  }
}

// Audited combined-response adapter, ready for a future read-only backend route.
// Production does NOT request /system-health: it calls a seeding routine on GET.
export function mapSystemHealthOverview(value) {
  if (!value || (!Object.hasOwn(value, 'platform') && !Object.hasOwn(value, 'incidents'))) throw new Error('The server returned an unexpected monitoring response.')
  const data = { reportingPeriodUnavailable: true }
  if (value.platform !== undefined) {
    if (!Array.isArray(value.platform)) throw new Error('The server returned an unexpected service list.')
    data.services = value.platform.map(row => {
      if (!text(row?.id) || !text(row.name)) throw new Error('The server returned an unexpected service record.')
      const isDatabase = row.id === 'database'
      const status = isDatabase && ['operational', 'degraded', 'down'].includes(row.status) ? row.status : null
      return {
        id: row.id === 'medtrail-api' ? 'medtrail' : row.id === 'auth-sessions' ? 'signin' : row.id,
        name: row.name, reference: text(row.reference), description: text(row.description),
        uptimePercentage: null,
        // All uptime values are constants. DB success latency is measured but
        // floored at 8 ms; DB failure latency 9999 is a sentinel, not a sample.
        responseTimeMs: isDatabase && status && status !== 'down' ? milliseconds(row.latencyMs) : null,
        status,
      }
    })
    if (new Set(data.services.map(row => row.id)).size !== data.services.length) throw new Error('The server returned duplicate services.')
  }
  if (value.incidents !== undefined) {
    if (!Array.isArray(value.incidents?.items)) throw new Error('The server returned an unexpected incident list.')
    data.incidents = value.incidents.items.map(row => {
      if (!text(row?.id) || !text(row.title)) throw new Error('The server returned an unexpected incident record.')
      const time = timestamp(row.rawTime)
      return {
        id: row.id, title: row.title, serviceName: text(row.serviceName), timestamp: time,
        displayTime: time ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' }).format(new Date(time)) + ' UTC' : null,
        // The repository query selects open incidents, but the formatter rewrites
        // Investigating/Identified/Monitoring to Investigating. Phase is unknown.
        status: 'open',
      }
    })
    if (new Set(data.incidents.map(row => row.id)).size !== data.incidents.length) throw new Error('The server returned duplicate incidents.')
  }
  // Summary constants, faux auth timings, claims of external service health,
  // reporting month, resolution counts and alert text are deliberately omitted.
  return { status: 'ready', data }
}
