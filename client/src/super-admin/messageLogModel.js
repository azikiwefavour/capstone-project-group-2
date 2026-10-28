export const MESSAGE_LOG_PAGE_SIZE = 7
export const messageDescriptions = {
  staff_invite: 'Staff invite',
  verification: 'Verification code',
  prescription: 'Prescription notification sent',
}

export function messageLogPage(records, filter = 'all', requestedPage = 1) {
  const filtered = ['failed', 'queued'].includes(filter) ? records.filter(record => record.status === filter) : records
  const totalPages = Math.max(1, Math.ceil(filtered.length / MESSAGE_LOG_PAGE_SIZE))
  const page = Math.max(1, Math.min(Number.isInteger(requestedPage) ? requestedPage : 1, totalPages))
  return { page, totalPages, total: filtered.length, records: filtered.slice((page - 1) * MESSAGE_LOG_PAGE_SIZE, page * MESSAGE_LOG_PAGE_SIZE) }
}

export function maskedMessageRecipient(value) {
  return typeof value === 'string' && /^\+234\d{3}\*{4}\d{3}$/.test(value) ? value : 'Recipient unavailable'
}

export function messageLogTime(value) {
  const date = new Date(value)
  if (!value || !Number.isFinite(date.getTime())) return 'Not available'
  const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date)
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' }).format(date)
  return `${day}, ${time}`
}
