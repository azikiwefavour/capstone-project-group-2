import assert from 'node:assert/strict'
import test from 'node:test'
import { createPharmacistNotificationExamples } from '../src/pharmacist/previews/pharmacistNotificationExamples.js'
import { formatDoctorNotificationTime as formatNotificationTime } from '../src/components/notifications/doctorNotificationTime.js'
import { notificationsForRole } from '../src/components/notifications/notificationModel.js'

const now = new Date(2026, 10, 4, 12).getTime()

test('Pharmacist design fixtures contain five examples with exactly one unread record', () => {
  const examples = createPharmacistNotificationExamples(now)
  assert.equal(examples.length, 5)
  assert.deepEqual(examples.map(record => record.read), [false, true, true, true, true])
  assert.ok(examples.every(record => record.title === 'Verification' && record.description === 'From Dr. Adewale.'))
  assert.deepEqual(examples.map(record => formatNotificationTime(record.createdAt, now)), [
    '10 minutes ago', '30 minutes ago', '8 hours ago', '17 hours ago', '31 October 2026, 01:12 PM',
  ])
})

test('Pharmacist fixtures cannot enter Admin or Doctor notification state', () => {
  const examples = createPharmacistNotificationExamples(now)
  assert.equal(notificationsForRole(examples, 'pharmacist').length, 5)
  assert.deepEqual(notificationsForRole(examples, 'doctor'), [])
  assert.deepEqual(notificationsForRole(examples, 'admin'), [])
  assert.equal(new Set(examples.map(record => record.id)).size, 5)
})
