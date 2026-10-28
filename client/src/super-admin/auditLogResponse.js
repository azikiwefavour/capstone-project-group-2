const text = value => typeof value === 'string' && value.trim() ? value : null
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null
function rawTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null
  const day = value.slice(0, 10), timestamp = Date.parse(day)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === day && Number.isFinite(Date.parse(value)) ? value : null
}

export function mapAuditLogResponse(value) {
  if (!value || !Array.isArray(value.activities) || count(value.total) === null || !Number.isSafeInteger(value.page) || value.page < 1
    || !Number.isSafeInteger(value.limit) || value.limit < 1 || value.limit > 100 || count(value.totalPages) === null
    || value.totalPages !== Math.ceil(value.total / value.limit) || value.activities.length > Math.min(value.limit, value.total)) {
    throw new Error('The server returned an unexpected audit log response.')
  }
  const records = value.activities.map(row => {
    if (!text(row?.id)) throw new Error('The server returned an unexpected audit record.')
    // Select only approved table fields. Backend action is literal display text,
    // not an enum. Never copy metadata, severity, descriptions or contact fields.
    return {
      id: row.id, timestamp: rawTimestamp(row.rawDate),
      actorName: text(row.who?.name), actorRole: text(row.who?.role),
      action: text(row.action), facilityName: text(row.facility),
    }
  })
  if (new Set(records.map(row => row.id)).size !== records.length) throw new Error('The server returned duplicate audit records.')
  return {
    status: records.length ? 'ready' : 'empty', records,
    pagination: { total: value.total, page: value.page, limit: value.limit, totalPages: Math.max(1, value.totalPages) },
  }
}
