import assert from 'node:assert/strict'
import test from 'node:test'
import { patientDate, prescriptionCounts, searchDiagnoses, sortDiagnoses, paginateDiagnoses } from '../src/patient/dashboard.js'

test('text sorting is numeric, case-insensitive, stable and does not mutate records', () => {
  for (const key of ['diagnosis', 'treatedWith', 'status']) {
    const records = [{ id: 1, [key]: ' Test 10 ' }, { id: 2, [key]: 'test 2' }, { id: 3, [key]: 'TEST 2' }, { id: 4 }, { id: 5, [key]: '' }]
    assert.deepEqual(sortDiagnoses(records, key).map(row => row.id), [2, 3, 1, 4, 5])
    assert.deepEqual(sortDiagnoses(records, key, 'descending').map(row => row.id), [1, 2, 3, 4, 5])
    assert.deepEqual(records.map(row => row.id), [1, 2, 3, 4, 5])
  }
})

test('date sorting is chronological and missing or invalid dates stay last', () => {
  const records = [{ id: 1, firstRecorded: '2026-10-01' }, { id: 2, firstRecorded: '2025-12-31T23:00:00Z' }, { id: 3, firstRecorded: '2026-02-30' }, { id: 4 }]
  assert.deepEqual(sortDiagnoses(records, 'firstRecorded').map(row => row.id), [2, 1, 3, 4])
  assert.deepEqual(sortDiagnoses(records, 'firstRecorded', 'descending').map(row => row.id), [1, 2, 3, 4])
  assert.deepEqual(sortDiagnoses([], 'diagnosis'), [])
  assert.equal(sortDiagnoses(records, null), records)
})

test('sorting filters before slicing pages', () => {
  const records = Array.from({ length: 25 }, (_, index) => ({ id: index + 1, diagnosis: `Diagnosis ${25 - index}`, status: index < 12 ? 'active' : 'resolved' }))
  const sorted = sortDiagnoses(searchDiagnoses(records, 'active'), 'diagnosis')
  assert.equal(sorted.length, 12)
  assert.deepEqual(paginateDiagnoses(sorted, 2, 10).records.map(row => row.diagnosis), ['Diagnosis 24', 'Diagnosis 25'])
})

test('pagination slices records and clamps empty, reduced and out-of-range lists', () => {
  const records = Array.from({ length: 25 }, (_, id) => ({ id }))
  assert.deepEqual(paginateDiagnoses(records, 2, 10), { page: 2, records: records.slice(10, 20) })
  assert.deepEqual(paginateDiagnoses(records, 5, 5), { page: 5, records: records.slice(20) })
  assert.deepEqual(paginateDiagnoses([], 3, 10), { page: 1, records: [] })
  assert.deepEqual(paginateDiagnoses(records.slice(0, 3), 3, 10), { page: 1, records: records.slice(0, 3) })
  assert.equal(paginateDiagnoses(records, 0, 10).page, 1)
})

test('unavailable prescription counts stay distinct from confirmed zero counts', () => {
  assert.equal(prescriptionCounts(null), null)
  assert.equal(prescriptionCounts(undefined), null)
  assert.deepEqual(prescriptionCounts([]), { pending: 0, active: 0, all: 0, discontinued: 0 })
})

test('summary counts reflect complete supplied records without relabeling other statuses', () => {
  const records = ['active', 'pending', 'active', 'discontinued', 'dispensed', 'awaiting_clarification'].map((status, id) => ({ id, status }))
  assert.deepEqual(prescriptionCounts(records), { pending: 1, active: 2, all: 6, discontinued: 1 })
})

test('diagnosis search is case-insensitive, trimmed, and handles unavailable fields', () => {
  const records = [{ id: 1, diagnosis: 'Condition A', treatedWith: 'Medication A', status: 'active' }, { id: 2, diagnosis: 'Condition B', treatedWith: null }, { id: 3 }]
  assert.deepEqual(searchDiagnoses(records, ' CONDITION b '), [records[1]])
  assert.deepEqual(searchDiagnoses(records, 'medication a'), [records[0]])
  assert.deepEqual(searchDiagnoses(records, 'active'), [records[0]])
  assert.deepEqual(searchDiagnoses(records, 'missing'), [])
  assert.deepEqual(searchDiagnoses(records, ''), records)
})

test('record dates never substitute today for missing or invalid dates', () => {
  for (const value of [null, '', 'invalid', '2026', '2026-02-30', '2026-13-01']) assert.equal(patientDate(value), null)
  assert.equal(patientDate('2026-10-17').label, '17 Oct 2026')
  assert.equal(patientDate('2026-10-17T09:30:00Z').dateTime, '2026-10-17T09:30:00Z')
})
