import assert from 'node:assert/strict'
import test from 'node:test'
import { formatActivityTimestamp, normalizePlatformActivity, recentPlatformActivities } from '../src/super-admin/activityData.js'

const fixture = (occurredAt, actionType = 'payment_successful') => ({ occurredAt, actionType, actor: { kind: 'system' }, facilityName: 'Isolated test facility' })

test('activities sort newest first without mutating or truncating the full internal list', () => {
  const records = [3, 7, 1, 5, 8, 2, 6, 4].map(hour => fixture(`2026-10-26T0${hour}:00:00Z`))
  const snapshot = JSON.stringify(records)
  const sorted = recentPlatformActivities(records)
  assert.equal(sorted.length, 8)
  assert.equal(sorted[0].occurredAt, '2026-10-26T08:00:00Z')
  assert.equal(sorted[7].occurredAt, '2026-10-26T01:00:00Z')
  assert.equal(JSON.stringify(records), snapshot)
})

test('only approved platform actions and safe display fields are mapped', () => {
  const actions = ['facility_application_submitted', 'facility_approved', 'facility_rejected', 'payment_successful', 'payment_failed', 'payment_retry_scheduled', 'subscription_renewed', 'subscription_expired']
  for (const action of actions) assert.ok(normalizePlatformActivity(fixture('2026-10-26T08:00:00Z', action)))
  const record = normalizePlatformActivity({ ...fixture('2026-10-26T08:00:00Z'), patientName: 'Private fixture', description: 'Private clinical description', email: 'private@example.test' })
  assert.deepEqual(Object.keys(record).sort(), ['action', 'actor', 'facility', 'occurredAt', 'timestamp'])
  assert.ok(!JSON.stringify(record).includes('Private'))
  assert.equal(normalizePlatformActivity(fixture('2026-10-26T08:00:00Z', 'prescription_created')), null)
  assert.equal(normalizePlatformActivity(fixture('2026-10-26T08:00:00Z', 'toString')), null)
})

test('System requires an explicit automated actor; missing identities stay unavailable', () => {
  const record = fixture('2026-10-26T08:00:00Z')
  assert.equal(normalizePlatformActivity(record).actor, 'System')
  assert.equal(normalizePlatformActivity({ ...record, actor: null }).actor, 'Unavailable')
  assert.equal(normalizePlatformActivity({ ...record, actor: { kind: 'user', name: '  Preview operator  ' } }).actor, 'Preview operator')
  assert.equal(normalizePlatformActivity({ ...record, actor: { kind: 'user', name: ' ' }, facilityName: null }).facility, 'Facility unavailable')
})

test('timestamps require real calendar dates and explicit timezones; display is deterministic UTC', () => {
  for (const value of ['2026-10-26', '2026-10-26T08:00:00', '2027-02-30T08:00:00Z', 'invalid', null]) assert.equal(normalizePlatformActivity(fixture(value)), null)
  assert.deepEqual(recentPlatformActivities([null, fixture('invalid')]), [])
  assert.deepEqual(recentPlatformActivities(null), [])
  assert.match(formatActivityTimestamp('2026-10-26T09:00:00+01:00'), /26 Oct 2026.*08:00 UTC/)
  assert.equal(formatActivityTimestamp('invalid'), 'Unavailable')
})
