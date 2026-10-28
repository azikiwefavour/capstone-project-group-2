import assert from 'node:assert/strict'
import test from 'node:test'
import { formatRenewalDate, futureRenewals, integrationHealth } from '../src/super-admin/overviewData.js'

const now = Date.parse('2026-10-26T12:00:00Z')
test('all future renewals are sorted without mutating or truncating the underlying list', () => {
  const records = [6, 2, 7, 1, 4, 3, 5, -1].map(days => ({ id: days, renewalDate: new Date(now + days * 86400000).toISOString() }))
  const snapshot = JSON.stringify(records)
  const upcoming = futureRenewals(records, now)
  assert.deepEqual(upcoming.map(record => record.id), [1, 2, 3, 4, 5, 6, 7])
  assert.equal(JSON.stringify(records), snapshot)
  assert.equal(upcoming.length, 7)
})

test('past, present, malformed dates and invalid calendars are excluded with deterministic UTC dates', () => {
  const records = ['2026-10-25', '2026-10-26T12:00:00Z', '2026-10-27', '2026-10-26T14:00:00+01:00', '2027-02-30', '2027-02-30T12:00:00Z', 'invalid', null].map(renewalDate => ({ renewalDate }))
  assert.deepEqual(futureRenewals([...records, null], now).map(record => record.renewalDate), ['2026-10-26T14:00:00+01:00', '2026-10-27'])
  assert.deepEqual(futureRenewals([], now), [])
  assert.deepEqual(futureRenewals(null, now), [])
  assert.equal(formatRenewalDate('invalid'), 'Unavailable')
  assert.match(formatRenewalDate('2026-10-27'), /27 Oct 2026/)
})

test('health status is explicit and never inferred from favorable metrics', () => {
  assert.equal(integrationHealth({ uptimePercentage: 100, responseTimeMs: 0 }).status, 'unavailable')
  for (const status of ['operational', 'degraded', 'down']) assert.equal(integrationHealth({ status }).status, status)
  assert.equal(integrationHealth({ status: 'down', uptimePercentage: 100 }).status, 'down')
  assert.equal(integrationHealth({ status: 'unknown' }).status, 'unavailable')
  assert.equal(integrationHealth(null).uptime, 'Uptime unavailable')
})

test('missing or invalid metrics are unavailable rather than fabricated zeroes', () => {
  for (const value of [null, undefined, -1, Infinity, '100']) {
    const health = integrationHealth({ uptimePercentage: value, responseTimeMs: value })
    assert.equal(health.uptime, 'Uptime unavailable')
    assert.equal(health.response, 'Response time unavailable')
  }
  assert.equal(integrationHealth({ uptimePercentage: 101 }).uptime, 'Uptime unavailable')
  assert.equal(integrationHealth({ uptimePercentage: 0, responseTimeMs: 0 }).uptime, '0.00% uptime')
  assert.equal(integrationHealth({ responseTimeMs: 0 }).response, '0 ms')
})
