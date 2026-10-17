import assert from 'node:assert/strict'
import test from 'node:test'
import { clarificationMatchesId } from '../src/doctor/clarifications.js'

test('clarifications are identified by their unique ID, not the shared patient name', () => {
  const first = { id: 'clarification-one', patient: { name: 'Same test patient' } }
  const second = { id: 'clarification-two', patient: first.patient }
  assert.equal(clarificationMatchesId(first, 'clarification-one'), true)
  assert.equal(clarificationMatchesId(second, 'clarification-one'), false)
  assert.equal(clarificationMatchesId(first, 'Same test patient'), false)
  assert.equal(clarificationMatchesId({ id: 42 }, '42'), true)
})

test('missing or invalid record identities never match a details route', () => {
  for (const record of [null, undefined, {}, { id: null }, { id: '' }, { id: '   ' }]) {
    assert.equal(clarificationMatchesId(record, ''), false)
    assert.equal(clarificationMatchesId(record, 'missing'), false)
  }
})
