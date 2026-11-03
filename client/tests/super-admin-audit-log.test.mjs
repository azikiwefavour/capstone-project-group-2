import assert from 'node:assert/strict'
import test from 'node:test'
import { auditLogPage, nextAuditSort } from '../src/super-admin/auditLogModel.js'
import { createAuditLogState } from '../src/super-admin/auditLogState.js'

test('default timestamp ordering is newest first and explicit ascending uses actual dates', () => {
  const rows = [{ id: 'dec', timestamp: '2026-12-31T23:59:00Z' }, { id: 'jan', timestamp: '2027-01-01T00:01:00Z' }]
  assert.equal(auditLogPage(rows).records[0].id, 'jan')
  assert.equal(auditLogPage(rows, { column: 'when', direction: 'asc' }).records[0].id, 'dec')
})

test('Who sorts primary names, ignoring roles, with stable equal-name ordering both ways', () => {
  const rows = [{ id: 'a', actorName: 'Zed', actorRole: 'AAA' }, { id: 'b', actorName: 'Ada', actorRole: 'ZZZ' }, { id: 'c', actorName: 'ada', actorRole: 'AAA' }]
  assert.deepEqual(auditLogPage(rows, { column: 'who', direction: 'asc' }).records.map(r => r.id), ['b', 'c', 'a'])
  assert.deepEqual(auditLogPage(rows, { column: 'who', direction: 'desc' }).records.map(r => r.id), ['a', 'b', 'c'])
})

test('Action and Facility sort both ways, including null facilities', () => {
  const rows = [{ id: 1, action: 'Zulu', facilityName: 'Zulu' }, { id: 2, action: 'Alpha', facilityName: null }, { id: 3, action: 'Beta', facilityName: 'Alpha' }]
  assert.deepEqual(auditLogPage(rows, { column: 'action', direction: 'asc' }).records.map(r => r.id), [2, 3, 1])
  assert.deepEqual(auditLogPage(rows, { column: 'action', direction: 'desc' }).records.map(r => r.id), [1, 3, 2])
  assert.deepEqual(auditLogPage(rows, { column: 'facility', direction: 'asc' }).records.map(r => r.id), [2, 3, 1])
  assert.deepEqual(auditLogPage(rows, { column: 'facility', direction: 'desc' }).records.map(r => r.id), [1, 3, 2])
})

test('equal timestamps retain input order, invalid dates stay last and source records are unchanged', () => {
  const rows = [{ id: 1, timestamp: '2026-10-27T12:00:00Z' }, { id: 2, timestamp: '2026-10-27T13:00:00+01:00' }, { id: 3, timestamp: 'invalid' }]
  const before = structuredClone(rows)
  for (const direction of ['asc', 'desc']) assert.deepEqual(auditLogPage(rows, { column: 'when', direction }).records.map(r => r.id), [1, 2, 3])
  assert.deepEqual(rows, before)
})

test('headings toggle directions; new text headings start A-Z and When starts newest', () => {
  assert.deepEqual(nextAuditSort({ column: 'when', direction: 'desc' }, 'when'), { column: 'when', direction: 'asc' })
  assert.deepEqual(nextAuditSort({ column: 'when', direction: 'asc' }, 'when'), { column: 'when', direction: 'desc' })
  assert.deepEqual(nextAuditSort({ column: 'when', direction: 'desc' }, 'who'), { column: 'who', direction: 'asc' })
  assert.deepEqual(nextAuditSort({ column: 'who', direction: 'asc' }, 'when'), { column: 'when', direction: 'desc' })
})

test('sorting precedes seven-row pagination and future-sized isolated fixtures clamp correctly', () => {
  const rows = Array.from({ length: 25 }, (_, i) => ({ id: i, action: String(25 - i).padStart(2, '0') }))
  const sort = { column: 'action', direction: 'asc' }
  assert.equal(auditLogPage(rows, sort, 1).records.length, 7)
  assert.equal(auditLogPage(rows, sort, 2).records[0].action, '08')
  const last = auditLogPage(rows, sort, 99)
  assert.equal(last.page, 4); assert.equal(last.records.length, 4)
  for (const page of [-1, 0, 1.2, NaN]) assert.equal(auditLogPage(rows, sort, page).page, 1)
  assert.deepEqual(auditLogPage([]), { page: 1, totalPages: 1, total: 0, records: [] })
})


test('missing/invalid data stays empty; loading/error cannot show stale records', () => {
  const empty = { page: 1, totalPages: 1, total: 0, records: [] }
  for (const records of [undefined, null, {}, [null, undefined]]) assert.deepEqual(auditLogPage(records, null), empty)
  assert.deepEqual(createAuditLogState(), { status: 'unavailable', records: [] })
  for (const status of ['unavailable', 'loading', 'error', 'empty']) assert.deepEqual(createAuditLogState(status, [{ id: 'isolated' }]), { status, records: [] })
  assert.deepEqual(createAuditLogState('ready', null), { status: 'error', records: [] })
  assert.deepEqual(createAuditLogState('ready', []), { status: 'ready', records: [] })
  const records = [{ id: 'isolated', actorName: 'Test actor', actorRole: 'Test role' }]
  assert.equal(createAuditLogState('ready', records).records, records)
})
