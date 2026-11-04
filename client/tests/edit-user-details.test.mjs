import assert from 'node:assert/strict'
import test from 'node:test'
import { getUserEdits } from '../src/admin/editUserDetails.js'

const user = { id: 'user-fixture', name: 'Edit test fixture', email: 'edit@example.test', phone: '+2348000000000', role: 'Doctor' }

test('unchanged details produce no update; surrounding whitespace is trimmed', () => {
  assert.deepEqual(getUserEdits(user, user).changes, {})
  const result = getUserEdits(user, { ...user, name: '  Changed fixture  ' })
  assert.deepEqual(result.changes, { name: 'Changed fixture' })
  assert.deepEqual(result.errors, {})
})

test('only permitted changes are included; role, ID and private fields cannot be submitted', () => {
  const result = getUserEdits(user, { ...user, id: 'another-user', role: 'Admin', password: 'test-only', email: 'changed@example.test', phone: '+44 7700 900000' })
  assert.deepEqual(result.changes, { email: 'changed@example.test', phone: '+44 7700 900000' })
  assert.equal(user.role, 'Doctor')
  assert.equal(user.id, 'user-fixture')
})

test('name and existing email cannot be emptied; malformed emails and phone numbers fail', () => {
  assert.ok(getUserEdits(user, { ...user, name: ' ' }).errors.name)
  for (const email of ['', 'invalid', 'a@b', 'a b@example.test', 'a@' + 'b'.repeat(255) + '.test']) {
    assert.ok(getUserEdits(user, { ...user, email }).errors.email)
  }
  for (const phone of ['+12', '1234567890123456', 'phone letters', '234+8000000000']) {
    assert.ok(getUserEdits(user, { ...user, phone }).errors.phone)
  }
  assert.ok(getUserEdits(user, { ...user, name: 'x'.repeat(256) }).errors.name)
})

test('existing international country codes and local phone numbers are preserved without guessing', () => {
  for (const phone of ['+2348000000000', '+44 7700 900000', '(020) 7946-0000', '08000000000']) {
    const result = getUserEdits(user, { ...user, phone })
    assert.deepEqual(result.errors, {})
    assert.equal(result.values.phone, phone)
  }
})

test('users with absent contact details can still edit their name without inventing contacts', () => {
  const result = getUserEdits({ ...user, email: '', phone: '' }, { name: 'Changed offline fixture', email: '', phone: '' })
  assert.deepEqual(result.errors, {})
  assert.deepEqual(result.changes, { name: 'Changed offline fixture' })
})
