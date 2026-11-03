import assert from 'node:assert/strict'
import test from 'node:test'
import { formatDoctorNotificationTime } from '../src/components/notifications/doctorNotificationTime.js'
import { createDoctorNotificationExamples } from '../src/doctor/previews/doctorNotificationExamples.js'
import { notificationsForRole } from '../src/components/notifications/notificationModel.js'

const now = new Date(2026, 10, 3, 12).getTime()

test('Doctor timestamps show minutes and hours up to one day, then a full local date', () => {
  for (const [age, expected] of [
    [0, 'Just now'], [59000, 'Just now'], [60000, '1 minute ago'],
    [10 * 60000, '10 minutes ago'], [30 * 60000, '30 minutes ago'],
    [3600000, '1 hour ago'], [8 * 3600000, '8 hours ago'], [17 * 3600000, '17 hours ago'],
  ]) assert.equal(formatDoctorNotificationTime(new Date(now - age).toISOString(), now), expected)
  assert.equal(formatDoctorNotificationTime(new Date(2026, 9, 31, 13, 12).toISOString(), now), '31 October 2026, 01:12 PM')
  assert.equal(formatDoctorNotificationTime(new Date(now + 60000).toISOString(), now), 'Just now')
})

test('design examples have exactly one unread record and are restricted to the Doctor role', () => {
  const examples = createDoctorNotificationExamples(now)
  assert.equal(examples.length, 5)
  assert.equal(examples.filter(record => !record.read).length, 1)
  assert.equal(notificationsForRole(examples, 'doctor').length, 5)
  assert.deepEqual(notificationsForRole(examples, 'admin'), [])
  assert.deepEqual(notificationsForRole(examples, 'pharmacist'), [])
  assert.deepEqual(examples.map(record => formatDoctorNotificationTime(record.createdAt, now)), [
    '10 minutes ago', '30 minutes ago', '8 hours ago', '17 hours ago', '31 October 2026, 01:12 PM',
  ])
})
