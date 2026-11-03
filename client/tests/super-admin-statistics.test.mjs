import assert from 'node:assert/strict'
import test from 'node:test'
import { formatStatistic, summarizePreviewStatistics } from '../src/super-admin/statisticsMetrics.js'

const base = { hospitals: [], pendingApplications: 0, smsSent: 0, whatsappSent: 0, patientsOnRecord: 0, liveFacilities: 0 }

test('registered facilities include previously subscribed expired hospitals; only active hospitals count as active', () => {
  const hospital = (id, subscriptionStatus, everSubscribed = true, facilityType = 'hospital') => ({ id, subscriptionStatus, everSubscribed, facilityType })
  const result = summarizePreviewStatistics({ ...base, hospitals: [
    hospital('one', 'active'), hospital('one', 'active'), hospital('two', 'expired'),
    hospital('three', 'overdue'), hospital('four', 'trial', false), hospital('five', 'pending', false),
    hospital('six', 'cancelled'), hospital('seven', 'active', true, 'pharmacy'),
  ] })
  assert.equal(result.registeredFacilities, 4)
  assert.equal(result.activeSubscribers, 1)
  assert.equal(result.trialSubscriptions, 1)
  assert.equal(result.overdueSubscriptions, 1)
})

test('SMS and WhatsApp totals combine and delivery percentage uses sent messages', () => {
  const result = summarizePreviewStatistics({ ...base, smsSent: 3200, whatsappSent: 4800, deliveredMessages: 7600, patientsOnRecord: 12840, liveFacilities: 12, pendingApplications: 3 })
  assert.equal(result.messagesSent, 8000)
  assert.equal(result.deliveryPercentage, 95)
  assert.equal(result.patientsOnRecord, 12840)
  assert.equal(result.liveFacilities, 12)
  assert.equal(result.pendingApplications, 3)
  assert.equal(summarizePreviewStatistics({ ...base }).deliveryPercentage, null)
  assert.equal(summarizePreviewStatistics({ ...base, smsSent: 5, deliveredMessages: 10 }).deliveryPercentage, null)
})

test('confirmed zero counts remain zero while unknown or invalid counts are unavailable', () => {
  const result = summarizePreviewStatistics(base)
  assert.equal(result.registeredFacilities, 0)
  assert.equal(result.activeSubscribers, 0)
  assert.equal(formatStatistic(0), '0')
  assert.equal(formatStatistic(12840), '12,840')
  for (const value of [null, undefined, NaN, -1, 2.5, '100']) assert.equal(formatStatistic(value), '—')
})
