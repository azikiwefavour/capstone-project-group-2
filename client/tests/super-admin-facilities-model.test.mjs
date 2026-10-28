import assert from 'node:assert/strict'
import test from 'node:test'
import { createFacilitiesState, facilitiesView, nextFacilitySort } from '../src/super-admin/facilitiesModel.js'

const rows = [
  { id: 'a', name: 'Alpha Hospital', status: 'active', plan: 'Growth', doctors: 1, pharmacists: 2, patients: 30, smsSent: 5, whatsappSent: 6, admin: { email: 'hidden@example.test' } },
  { id: 'b', name: 'Beta Hospital', status: 'trial', plan: 'Starter', doctors: 0, pharmacists: 0, patients: 0, smsSent: 0, whatsappSent: 0 },
  { id: 'c', name: 'Gamma Clinic', status: 'past_due', plan: 'Growth' },
]

test('unavailable facility defaults contain no records; empty pagination stays valid', () => {
  assert.deepEqual(createFacilitiesState(), { status: 'unavailable', records: [] })
  assert.equal(createFacilitiesState('bad').status, 'unavailable')
  for (const status of ['loading', 'empty', 'ready', 'error']) assert.equal(createFacilitiesState(status).status, status)
  const result = facilitiesView([])
  assert.equal(result.page, 1); assert.equal(result.totalPages, 1); assert.equal(result.total, 0)
})

test('name-only case-insensitive search combines with each status without mutating records', () => {
  const before = structuredClone(rows)
  assert.deepEqual(facilitiesView(rows, { query: '  ALPHA  ', status: 'active' }).records.map(r => r.id), ['a'])
  assert.equal(facilitiesView(rows, { query: 'alpha', status: 'trial' }).total, 0)
  for (const query of ['hidden@example', 'Growth', 'active']) assert.equal(facilitiesView(rows, { query }).total, 0)
  for (const status of ['active', 'trial', 'past_due']) assert.equal(facilitiesView(rows, { status }).total, 1)
  assert.deepEqual(facilitiesView(rows).counts, [3, 1, 1, 1])
  assert.deepEqual(rows, before)
})

test('text and numeric sorting is stable, reversible, and preserves missing aggregate values', () => {
  for (const [column, ascending, descending] of [['name', ['a', 'b', 'c'], ['c', 'b', 'a']], ['plan', ['a', 'c', 'b'], ['b', 'a', 'c']], ['status', ['a', 'b', 'c'], ['c', 'b', 'a']]]) {
    const asc = facilitiesView(rows, { sort: { column, direction: 'asc' } })
    const desc = facilitiesView(rows, { sort: { column, direction: 'desc' } })
    assert.deepEqual(asc.records.map(r => r.id), ascending); assert.deepEqual(desc.records.map(r => r.id), descending)
  }
  for (const column of ['clinicians', 'patients', 'messages']) {
    assert.deepEqual(facilitiesView(rows, { sort: { column, direction: 'asc' } }).records.map(r => r.id), ['b', 'a', 'c'])
    assert.deepEqual(facilitiesView(rows, { sort: { column, direction: 'desc' } }).records.map(r => r.id), ['a', 'b', 'c'])
  }
  const equal = [{ id: 'first', name: 'Equal' }, { id: 'second', name: 'equal' }]
  assert.deepEqual(facilitiesView(equal, { sort: { column: 'name', direction: 'desc' } }).records.map(r => r.id), ['first', 'second'])
  assert.deepEqual(nextFacilitySort({ column: null }, 'name'), { column: 'name', direction: 'asc' })
  assert.deepEqual(nextFacilitySort({ column: 'name', direction: 'asc' }, 'name'), { column: 'name', direction: 'desc' })
})

test('pagination uses seven filtered/sorted records, clamps pages and does not mutate records', () => {
  const records = Array.from({ length: 25 }, (_, i) => ({ id: i, name: `Hospital ${String(i).padStart(2, '0')}`, status: i % 2 ? 'trial' : 'active' }))
  const options = { sort: { column: 'name', direction: 'desc' }, page: 2 }
  assert.equal(facilitiesView(records, options).records.length, 7)
  assert.equal(facilitiesView(records, options).records[0].name, 'Hospital 17')
  assert.equal(facilitiesView(records, { status: 'active', page: 2 }).records.length, 6)
  assert.equal(facilitiesView(records, { page: 99 }).page, 4)
  assert.equal(facilitiesView(records, { page: 4 }).records.length, 4)
  assert.equal(facilitiesView(records, { query: 'absent', page: 4 }).page, 1)
  assert.deepEqual(facilitiesView([null, {}, { id: 'x', name: '' }]).records, [])
})
