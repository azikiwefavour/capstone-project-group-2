import assert from 'node:assert/strict'
import test from 'node:test'
import { maskedMessageRecipient, messageDescriptions, messageLogPage, messageLogTime } from '../src/super-admin/messageLogModel.js'
// Isolated filter inputs only; no application preview records.
const records = ['delivered', 'delivered', 'failed', 'queued', 'delivered', 'queued', 'failed'].map((status, id) => ({ id, status }))

test('only approved privacy-safe message descriptions are supported', () => {
  assert.deepEqual(messageDescriptions, { staff_invite: 'Staff invite', verification: 'Verification code', prescription: 'Prescription notification sent' })
  assert.equal(maskedMessageRecipient('+234800****001'), '+234800****001')
})

test('All, Failed and Queued filter before pagination without mutating records', () => {
  const copy = structuredClone(records)
  assert.equal(messageLogPage(records).records.length, 7)
  for (const status of ['failed', 'queued']) {
    const result = messageLogPage(records, status)
    assert.equal(result.total, 2)
    assert.ok(result.records.every(row => row.status === status))
    assert.equal(result.totalPages, 1)
  }
  assert.deepEqual(records, copy)
})

test('future-sized isolated data pages at seven records and clamps invalid pages', () => {
  const rows = Array.from({ length: 25 }, (_, index) => ({ id: index, status: index % 2 ? 'queued' : 'failed' }))
  const first = messageLogPage(rows, 'all', 1), second = messageLogPage(rows, 'all', 2), last = messageLogPage(rows, 'all', 99)
  assert.equal(first.totalPages, 4)
  assert.equal(first.records.length, 7)
  assert.equal(second.records[0].id, 7)
  assert.equal(last.page, 4)
  assert.equal(last.records.length, 4)
  assert.equal(messageLogPage(rows, 'failed', 2).records.length, 6)
  assert.equal(messageLogPage(rows, 'queued', 2).records.length, 5)
  for (const page of [-1, 0, 1.5, NaN]) assert.equal(messageLogPage(rows, 'all', page).page, 1)
})

test('empty or unmatched data has a valid first page and no fabricated records', () => {
  assert.deepEqual(messageLogPage([], 'all', 5), { page: 1, totalPages: 1, total: 0, records: [] })
  assert.equal(messageLogPage([{ status: 'delivered' }], 'failed', 5).total, 0)
})

test('unmasked or malformed recipients never reach the display', () => {
  for (const value of ['not a phone', '+2348000000000', null, undefined]) assert.equal(maskedMessageRecipient(value), 'Recipient unavailable')
})

test('message dates use consistent UTC date and 24-hour time', () => {
  assert.equal(messageLogTime('2026-10-27T09:20:00Z'), 'Oct 27, 09:20')
  assert.equal(messageLogTime('2026-10-26T16:30:00Z'), 'Oct 26, 16:30')
  assert.equal(messageLogTime('invalid'), 'Not available')
  assert.equal(messageLogTime(null), 'Not available')
})
