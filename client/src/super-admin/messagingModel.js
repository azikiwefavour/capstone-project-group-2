import { formatStatistic } from './statisticsMetrics.js'

const count = value => Number.isSafeInteger(value) && value >= 0
export function messagingMonths(referenceDate) {
  const year = referenceDate.getUTCFullYear(), month = referenceDate.getUTCMonth()
  const previous = new Date(Date.UTC(year, month - 1, 1))
  const key = date => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
  const label = date => new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' }).format(date)
  return { currentKey: key(referenceDate), previousKey: key(previous), currentLabel: label(referenceDate), previousLabel: label(previous) }
}

function channelStats(channel) {
  if (!channel || !count(channel.delivered) || !count(channel.failed) || !count(channel.queued)) return { attempted: null, delivered: null, failed: null, deliveryRate: null }
  // This aggregate model contains delivered, failed and queued only. Completed
  // attempts are delivered + failed; queued messages have not been attempted.
  const attempted = channel.delivered + channel.failed
  const deliveryRate = channel.failed === 0 ? 100 : (attempted ? channel.delivered / attempted * 100 : 0)
  return { attempted, delivered: channel.delivered, failed: channel.failed, deliveryRate }
}
function monthStats(month) {
  const sms = channelStats(month?.sms), whatsapp = channelStats(month?.whatsapp)
  if (sms.attempted === null || whatsapp.attempted === null) return { sms, whatsapp, sent: null, failed: null, deliveryRate: null }
  const sent = sms.attempted + whatsapp.attempted
  const failed = sms.failed + whatsapp.failed
  const deliveryRate = sent ? (failed === 0 ? 100 : (sms.delivered + whatsapp.delivered) / sent * 100) : null
  return { sms, whatsapp, sent, failed, deliveryRate }
}
export function messagingSummary(months, referenceDate) {
  const context = messagingMonths(referenceDate)
  const current = monthStats(months?.find(month => month.month === context.currentKey))
  const previous = monthStats(months?.find(month => month.month === context.previousKey))
  const comparison = current.sent !== null && previous.sent > 0 ? (current.sent - previous.sent) / previous.sent * 100 : null
  return { ...context, ...current, comparison }
}
export const messagingPercent = value => Number.isFinite(value) ? `${value.toFixed(1)}%` : '—'

export function messagingUsage(used, allowance) {
  if (!count(used)) return { text: 'Usage unavailable', percentage: null }
  if (allowance === null) return { text: `${formatStatistic(used)} · Unlimited`, percentage: null }
  if (!count(allowance) || allowance === 0) return { text: `${formatStatistic(used)} / allowance unavailable`, percentage: null }
  return { text: `${formatStatistic(used)} / ${formatStatistic(allowance)}`, percentage: Math.min(100, used / allowance * 100) }
}
