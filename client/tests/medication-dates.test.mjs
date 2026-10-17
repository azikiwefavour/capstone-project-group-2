import assert from 'node:assert/strict'
import test from 'node:test'
import { formatMedicationTimestamp } from '../src/doctor/medicationDates.js'

test('formats explicit UTC timestamps with the requested date, comma, and AM/PM time', () => {
  assert.deepEqual(formatMedicationTimestamp('2026-10-17T10:30:00Z', 'UTC'), {
    dateTime: '2026-10-17T10:30:00.000Z', label: '17 Oct 2026, 10:30 AM',
  })
  assert.equal(formatMedicationTimestamp('2026-10-17T22:30:00Z', 'UTC').label, '17 Oct 2026, 10:30 PM')
  assert.equal(formatMedicationTimestamp('2026-10-17T00:00:00Z', 'UTC').label, '17 Oct 2026, 12:00 AM')
  assert.equal(formatMedicationTimestamp('2026-10-17T12:00:00Z', 'UTC').label, '17 Oct 2026, 12:00 PM')
})

test('converts offsets, daylight saving, and date boundaries using the display timezone', () => {
  assert.equal(formatMedicationTimestamp('2026-10-17T08:30:00Z', 'Europe/Malta').label, '17 Oct 2026, 10:30 AM')
  assert.equal(formatMedicationTimestamp('2026-01-17T08:30:00Z', 'Europe/Malta').label, '17 Jan 2026, 09:30 AM')
  assert.equal(formatMedicationTimestamp('2026-10-17T23:30:00Z', 'Europe/Malta').label, '18 Oct 2026, 01:30 AM')
  assert.equal(formatMedicationTimestamp('2026-10-17T10:30:00+02:00', 'Europe/Malta').label, '17 Oct 2026, 10:30 AM')
})

test('missing, malformed, ambiguous, and numeric values do not invent timestamps', () => {
  for (const value of [null, undefined, '', 'invalid', '2026-10-17', '2026-10-17T10:30:00', 0, 1792233000, new Date('invalid')]) {
    assert.equal(formatMedicationTimestamp(value, 'UTC'), null)
  }
})

test('uses the local timezone by default and does not mutate the original prescription timestamp', () => {
  const value = new Date('2026-10-17T10:30:00Z')
  const original = value.toISOString()
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  assert.deepEqual(formatMedicationTimestamp(value), formatMedicationTimestamp(value, localZone))
  assert.equal(value.toISOString(), original)
  const prescription = formatMedicationTimestamp('2026-08-01T08:45:00Z', 'UTC')
  const discontinuation = formatMedicationTimestamp('2026-08-04T13:15:00Z', 'UTC')
  assert.equal(prescription.label, '01 Aug 2026, 08:45 AM')
  assert.equal(discontinuation.label, '04 Aug 2026, 01:15 PM')
})
