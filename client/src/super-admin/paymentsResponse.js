import { formatSubscriberDate } from './subscriberTableModel.js'

export const formatPaymentAmount = value => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)

const text = value => typeof value === 'string' && value.trim() ? value : null
const amount = value => Number.isFinite(value) && value >= 0 ? value : null
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null
export const paymentStatusLabels = { successful: 'Successful', pending: 'Pending', failed: 'Failed' }

function transactionDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return null
  const day = value.slice(0, 10), timestamp = Date.parse(day)
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== day || !Number.isFinite(Date.parse(value))) return null
  return new Date(value).toISOString().slice(0, 10)
}

export function mapPaymentsResponse(value) {
  const pagination = value?.pagination
  if (!value || !Array.isArray(value.transactions) || !pagination || count(pagination.total) === null
    || !Number.isSafeInteger(pagination.page) || pagination.page < 1 || !Number.isSafeInteger(pagination.limit)
    || pagination.limit < 1 || pagination.limit > 100 || count(pagination.totalPages) === null
    || Math.max(1, pagination.totalPages) !== Math.max(1, Math.ceil(pagination.total / pagination.limit))
    || value.transactions.length > Math.min(pagination.limit, pagination.total)) throw new Error('The server returned an unexpected payments response.')
  const records = value.transactions.map(row => {
    if (!text(row?.id) || !text(row?.fullReference)) throw new Error('The server returned an unexpected payment transaction.')
    return {
      id: row.id, reference: row.fullReference, facilityName: text(row.facility), amount: amount(row.amount),
      channel: text(row.channel), gateway: text(row.gateway), date: transactionDate(row.rawDate),
      status: Object.hasOwn(paymentStatusLabels, row.rawStatus) ? row.rawStatus : null,
    }
  })
  if (new Set(records.map(row => row.id)).size !== records.length || new Set(records.map(row => row.reference)).size !== records.length) throw new Error('The server returned duplicate payment transactions.')
  return {
    status: records.length ? 'ready' : 'empty', records,
    summary: {
      // These service amounts use nonzero fallbacks. Pending also measures overdue
      // subscription fees, not unsettled payments. Never publish them as live totals.
      collectedLast90Days: null, pendingSettlement: null,
      // counts.failed is a direct repository count; summary.failedCharges uses || 2.
      failedCharges: count(value.counts?.failed),
    },
    pagination: { total: pagination.total, page: pagination.page, limit: pagination.limit, totalPages: Math.max(1, pagination.totalPages) },
  }
}

// Strict quoted CSV reader: handles quoted commas/newlines/escaped quotes and
// rejects malformed fields instead of downloading a misleading partial file.
export function parsePaymentsCsv(csv) {
  const rows = [], row = []
  let field = '', quoted = false, closed = false
  const input = csv.replace(/^\uFEFF/, '')
  for (let index = 0; index < input.length; index++) {
    const char = input[index]
    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') { field += '"'; index++ } else { quoted = false; closed = true }
      } else field += char
    } else if (char === ',' || char === '\n' || char === '\r') {
      row.push(field); field = ''; closed = false
      if (char !== ',') {
        rows.push([...row]); row.length = 0
        if (char === '\r' && input[index + 1] === '\n') index++
      }
    } else if (char === '"' && !field && !closed) quoted = true
    else if (closed || char === '"') throw new Error('The server returned invalid payment CSV.')
    else field += char
  }
  if (quoted) throw new Error('The server returned invalid payment CSV.')
  if (field || row.length || closed) { row.push(field); rows.push([...row]) }
  return rows
}

const exportHeaders = ['Reference', 'Facility', 'Amount (NGN)', 'Channel', 'Gateway', 'Date', 'Status', 'Status Reason', 'Plan', 'Billing Cycle', 'Retries']
function exportValues(record) {
  if ([record.reference, record.facilityName, record.channel, record.gateway, record.date, record.status].some(value => !value) || record.amount === null) throw new Error('Some payment fields are unavailable. The list cannot be exported accurately.')
  return [record.reference, record.facilityName, String(record.amount), record.channel, record.gateway, formatSubscriberDate(record.date), paymentStatusLabels[record.status]]
}

export function verifiedPaymentsCsv(csv, records) {
  const rows = parsePaymentsCsv(csv)
  if (JSON.stringify(rows[0]) !== JSON.stringify(exportHeaders) || rows.length !== records.length + 1) throw new Error('The payment export is incomplete. Please try again.')
  const expected = new Map(records.map(record => [record.reference, exportValues(record)]))
  for (const row of rows.slice(1)) {
    const values = expected.get(row[0])
    if (row.length !== exportHeaders.length || !values || JSON.stringify(row.slice(0, 7)) !== JSON.stringify(values)) throw new Error('The payment export contains altered references or inconsistent records. Please try again.')
    expected.delete(row[0])
  }
  // Export only the seven verified table fields. The endpoint's remaining fields
  // contain synthetic reason/plan/cycle defaults. Neutralize spreadsheet formulas.
  const cell = value => `"${(/^[\s]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`
  return [exportHeaders.slice(0, 7).map(cell).join(','), ...rows.slice(1).map(row => row.slice(0, 7).map(cell).join(','))].join('\r\n')
}
