const text = value => typeof value === 'string' && value.trim() ? value : null
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null
const messageLabels = new Set(['Staff invite', 'Verification code', 'Prescription details', 'General notification'])

export function safeMessageRecipient(value) {
  if (typeof value !== 'string') return null
  return /^\+234\d{3}\*{4}\d{3}$/.test(value) || /^[^@\s*]{1,2}\*{4}[^@\s*]?@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value) ? value : null
}
function rawTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null
  const day = value.slice(0, 10), timestamp = Date.parse(day)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === day && Number.isFinite(Date.parse(value)) ? value : null
}

export function mapMessagingResponse(value) {
  const pagination = value?.pagination
  if (!value || !Array.isArray(value.logs) || !pagination || count(pagination.total) === null
    || !Number.isSafeInteger(pagination.page) || pagination.page < 1 || !Number.isSafeInteger(pagination.limit)
    || pagination.limit < 1 || pagination.limit > 100 || count(pagination.totalPages) === null
    || Math.max(1, pagination.totalPages) !== Math.max(1, Math.ceil(pagination.total / pagination.limit))
    || value.logs.length > Math.min(pagination.limit, pagination.total)) throw new Error('The server returned an unexpected messaging response.')
  const messageLog = value.logs.map(row => {
    if (!text(row?.id)) throw new Error('The server returned an unexpected message record.')
    return {
      id: row.id, time: rawTime(row.rawTime), facilityName: text(row.facility),
      maskedRecipient: safeMessageRecipient(row.to),
      messageLabel: messageLabels.has(row.message) ? row.message : null,
      channel: ['SMS', 'WhatsApp', 'Email'].includes(row.channel) ? row.channel.toLowerCase() : null,
      status: ['delivered', 'failed', 'queued', 'sent'].includes(row.rawStatus) ? row.rawStatus : null,
    }
  })
  if (new Set(messageLog.map(row => row.id)).size !== messageLog.length) throw new Error('The server returned duplicate messages.')
  return {
    status: messageLog.length ? 'ready' : 'empty',
    data: {
      // Audited summary/category/usage numbers are demonstration constants.
      // Termii balance has an indistinguishable 48000 fallback. Tab counts also
      // substitute nonzero defaults, and are not calendar-month/channel metrics.
      months: [], credit: null, failureExplanation: null, categories: [], usage: [], messageLog,
    },
    pagination: { total: pagination.total, page: pagination.page, limit: pagination.limit, totalPages: Math.max(1, pagination.totalPages) },
  }
}

export function mapMessagingUsageResponse(value) {
  if (!value || !Array.isArray(value.facilities)) throw new Error('The server returned an unexpected messaging usage response.')
  // This entire endpoint is a static facility/quota array, without provenance or
  // billing-month data. Never map its records/percentages into live presentation.
  return { status: 'unavailable', records: [] }
}
