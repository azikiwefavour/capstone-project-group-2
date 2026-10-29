const text = value => typeof value === 'string' && value.trim() ? value : null
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null
const amount = value => Number.isFinite(value) && value >= 0 ? value : null
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
  if (new Set(messageLog.map(row => row.id)).size !== recordsLength(messageLog)) throw new Error('The server returned duplicate messages.')

  const now = new Date()
  const curKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const prevDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const prevKey = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}`

  const months = Array.isArray(value.months) && value.months.length
    ? value.months.map(m => ({
        month: m.month,
        sms: {
          delivered: count(m.sms?.delivered) ?? 0,
          failed: count(m.sms?.failed) ?? 0,
          queued: count(m.sms?.queued) ?? 0,
        },
        whatsapp: {
          delivered: count(m.whatsapp?.delivered) ?? 0,
          failed: count(m.whatsapp?.failed) ?? 0,
          queued: count(m.whatsapp?.queued) ?? 0,
        },
      }))
    : [
        {
          month: curKey,
          sms: {
            delivered: count(value.summary?.sentInOctober?.count) ?? 0,
            failed: count(value.summary?.failed?.count) ?? 0,
            queued: count(value.counts?.queued) ?? 0,
          },
          whatsapp: { delivered: 0, failed: 0, queued: 0 },
        },
        {
          month: prevKey,
          sms: { delivered: 0, failed: 0, queued: 0 },
          whatsapp: { delivered: 0, failed: 0, queued: 0 },
        },
      ]

  const categories = Array.isArray(value.messages?.breakdown)
    ? value.messages.breakdown.map(item => ({
        name: item.name || item.category || item.type,
        label: item.category || item.type,
        count: item.count,
      }))
    : [
        { name: 'Staff invites', label: 'Staff invites', count: 0 },
        { name: 'Verification codes', label: 'Verification codes', count: 0 },
        { name: 'Prescription details', label: 'Prescription details', count: 0 },
      ]

  const usage = Array.isArray(value.usage?.items)
    ? value.usage.items.map(item => ({
        name: item.facilityName || item.name,
        facilityName: item.facilityName || item.name,
        used: item.used,
        allowance: item.quota || item.allowance || 1000,
        warning: ((item.used || 0) / (item.quota || item.allowance || 1000)) >= 0.9,
      }))
    : []

  const credit = amount(value.summary?.termiiCredit?.balance) ?? 48000

  return {
    status: messageLog.length ? 'ready' : 'empty',
    data: {
      months,
      credit,
      failureExplanation: value.summary?.failed?.subtext || 'Mostly DND registered numbers',
      categories,
      usage,
      messageLog,
    },
    pagination: { total: pagination.total, page: pagination.page, limit: pagination.limit, totalPages: Math.max(1, pagination.totalPages) },
  }
}

function recordsLength(arr) {
  return arr.length
}

export function mapMessagingUsageResponse(value) {
  if (!value || !Array.isArray(value.facilities)) throw new Error('The server returned an unexpected messaging usage response.')
  const records = value.facilities.map(item => ({
    name: item.facilityName || item.name,
    facilityName: item.facilityName || item.name,
    used: item.used,
    allowance: item.quota || item.allowance || 1000,
    warning: ((item.used || 0) / (item.quota || item.allowance || 1000)) >= 0.9,
  }))
  return { status: records.length ? 'ready' : 'empty', records }
}
