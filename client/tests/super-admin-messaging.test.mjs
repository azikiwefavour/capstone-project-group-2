import assert from 'node:assert/strict'
import test from 'node:test'
import { messagingMonths, messagingPercent, messagingSummary, messagingUsage } from '../src/super-admin/messagingModel.js'
import { createMessagingState } from '../src/super-admin/messagingState.js'

const reference = new Date('2026-10-27T12:00:00Z')
// Isolated aggregate inputs, never imported by application code.
const months = [
  { month: '2026-10', sms: { delivered: 4, failed: 1, queued: 3 }, whatsapp: { delivered: 4, failed: 1, queued: 2 } },
  { month: '2026-09', sms: { delivered: 2, failed: 1, queued: 0 }, whatsapp: { delivered: 2, failed: 0, queued: 0 } },
]

test('supplied calendar-month aggregates calculate sent, failed and delivery metrics', () => {
  const summary = messagingSummary(months, reference)
  assert.equal(summary.sent, 10)
  assert.equal(summary.failed, 2)
  assert.equal(messagingPercent(summary.deliveryRate), '80.0%')
  assert.equal(messagingPercent(summary.whatsapp.deliveryRate), '80.0%')
  assert.equal(messagingPercent(summary.sms.deliveryRate), '80.0%')
  assert.equal(summary.comparison, 100)
  assert.equal(summary.currentLabel, 'October')
  assert.equal(summary.previousLabel, 'September')
})

test('queued messages do not enter sent counts or delivery denominators', () => {
  const changed = structuredClone(months)
  changed[0].sms.queued = 200
  changed[0].whatsapp.queued = 400
  assert.deepEqual(messagingSummary(changed, reference), messagingSummary(months, reference))
})

test('unknown totals differ from confirmed zero; rates and comparisons avoid division by zero', () => {
  const missing = messagingSummary([], reference)
  assert.equal(missing.sent, null)
  assert.equal(missing.failed, null)
  assert.equal(missing.comparison, null)
  assert.equal(messagingPercent(missing.deliveryRate), '—')
  const zero = months.map(month => ({ ...month, sms: { delivered: 0, failed: 0, queued: 5 }, whatsapp: { delivered: 0, failed: 0, queued: 2 } }))
  const summary = messagingSummary(zero, reference)
  assert.equal(summary.sent, 0)
  assert.equal(summary.failed, 0)
  assert.equal(summary.deliveryRate, null)
  assert.equal(summary.comparison, null)
})

test('calendar context handles January/December rollover and ignores unrelated months', () => {
  assert.deepEqual(messagingMonths(new Date('2027-01-01T00:00:00Z')), { currentKey: '2027-01', previousKey: '2026-12', currentLabel: 'January', previousLabel: 'December' })
  assert.deepEqual(messagingSummary([...months, { ...months[0], month: '2025-10' }], reference), messagingSummary(months, reference))
})

test('each facility allowance drives its own progress, including unlimited and missing limits', () => {
  assert.deepEqual(messagingUsage(1, 10), { text: '1 / 10', percentage: 10 })
  assert.deepEqual(messagingUsage(1, 20), { text: '1 / 20', percentage: 5 })
  assert.deepEqual(messagingUsage(25, 20), { text: '25 / 20', percentage: 100 })
  assert.deepEqual(messagingUsage(20, null), { text: '20 · Unlimited', percentage: null })
  assert.equal(messagingUsage(5, undefined).percentage, null)
  assert.equal(messagingUsage(5, 0).percentage, null)
  assert.equal(messagingUsage(-1, 10).text, 'Usage unavailable')
})

test('presentation states never expose stale data during loading or errors', () => {
  const data = { months, credit: { remainingNaira: 0 }, categories: [{ name: 'Staff invites', count: 0 }], usage: [{ name: 'Test facility', used: 1, allowance: 10 }], messageLog: [{ id: 'isolated' }] }
  const emptyData = { months: [], credit: null, failureExplanation: null, categories: [], usage: [], messageLog: [] }
  assert.deepEqual(createMessagingState(), { status: 'unavailable', data: emptyData })
  for (const status of ['loading', 'error', 'unavailable']) assert.deepEqual(createMessagingState(status, data), { status, data: emptyData })
  assert.deepEqual(createMessagingState('ready', data).data, { ...data, failureExplanation: null })
  assert.deepEqual(createMessagingState('empty', data).data.messageLog, [])
  assert.deepEqual(createMessagingState('ready', { months: null, usage: 'invalid', messageLog: {} }).data, emptyData)
})
