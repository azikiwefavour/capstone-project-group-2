import assert from 'node:assert/strict'
import test from 'node:test'
import { averageResponseTime, degradedServiceAlert, filterHealthServices, monitoringPercentage, openHealthIncidents, systemHealthSummary } from '../src/super-admin/systemHealthModel.js'
import { healthTestData as data } from './fixtures/systemHealthData.js'
import { createSystemHealthState } from '../src/super-admin/systemHealthState.js'

test('supplied monitoring snapshot computes summary values without default statistics', () => {
  const summary = systemHealthSummary(data)
  assert.equal(summary.apiUptime.toFixed(2), '80.00')
  assert.equal(summary.apiResponseTime, 15)
  assert.equal(summary.paymentWebhooks.toFixed(1), '75.0')
  assert.equal(summary.openIncidents, 1)
})

test('all six services have stable IDs, computed metrics and explicit preview statuses', () => {
  assert.deepEqual(data.services.map(s => s.name), ['Test API', 'Test database', 'Test access', 'Test payments', 'Test SMS', 'Test WhatsApp'])
  assert.equal(new Set(data.services.map(s => s.id)).size, 6)
  for (const service of data.services) {
    assert.equal(service.uptimePercentage, monitoringPercentage(service.monitoring.availableSeconds, service.monitoring.totalSeconds))
    assert.equal(service.responseTimeMs, averageResponseTime(service.responseTimesMs))
    assert.equal(service.status, service.id === 'termii-sms' ? 'degraded' : 'operational')
  }
})

test('API summaries use monitoring duration and averaged measurements rather than displayed cached fields', () => {
  const changed = structuredClone(data)
  changed.services[0].monitoring = { availableSeconds: 90, totalSeconds: 100 }
  changed.services[0].responseTimesMs = [100, 200, 600]
  assert.equal(systemHealthSummary(changed).apiUptime, 90)
  assert.equal(systemHealthSummary(changed).apiResponseTime, 300)
})

test('webhook summary measures processing events, independent of customer payment statistics', () => {
  const changed = { ...data, webhooks: { successful: 3, totalProcessed: 4 }, payments: { successful: 1, total: 100 } }
  assert.equal(systemHealthSummary(changed).paymentWebhooks, 75)
})

test('all non-Resolved incidents count as open; resolved and genuinely empty lists do not', () => {
  const incidents = ['Investigating', 'Monitoring', 'Identified', 'Resolved', 'resolved'].map((status, id) => ({ id, status }))
  assert.equal(systemHealthSummary({ incidents }).openIncidents, 3)
  assert.equal(systemHealthSummary({ incidents: [] }).openIncidents, 0)
  assert.equal(data.incidents.length, 1)
  assert.equal(data.incidents[0].status, 'Investigating')
})

test('degradation warning derives names and singular/plural from service status', () => {
  assert.equal(degradedServiceAlert(data.services), '1 service degraded: Test SMS. Facilities and Patients may experience delays.')
  const multiple = data.services.map(s => s.id === 'paystack' ? { ...s, status: 'degraded' } : s)
  assert.equal(degradedServiceAlert(multiple), '2 services degraded: Test payments, Test SMS. Facilities and Patients may experience delays.')
  assert.equal(degradedServiceAlert(data.services.map(s => ({ ...s, status: 'operational' }))), null)
  assert.equal(degradedServiceAlert(undefined), null)
})

test('missing, malformed and empty monitoring avoids fabricated uptime or incident totals', () => {
  assert.deepEqual(systemHealthSummary(undefined), { apiUptime: null, apiResponseTime: null, paymentWebhooks: null, openIncidents: null })
  assert.equal(systemHealthSummary({ incidents: [null] }).openIncidents, null)
  assert.equal(systemHealthSummary({ incidents: [{ status: '' }] }).openIncidents, null)
  for (const pair of [[0, 0], [1, 0], [101, 100], [-1, 100], [undefined, 10], [null, 10]]) assert.equal(monitoringPercentage(...pair), null)
  for (const measurements of [[], null, [1, NaN], [-1, 2], [undefined], [null]]) assert.equal(averageResponseTime(measurements), null)
  assert.equal(averageResponseTime([0]), 0)
  assert.equal(monitoringPercentage(0, 100), 0)
})


test('Platform filters select the existing status records without mutating monitoring data', () => {
  const before = structuredClone(data)
  assert.equal(filterHealthServices(data.services, 'all').length, 6)
  assert.equal(filterHealthServices(data.services, 'operational').length, 5)
  assert.deepEqual(filterHealthServices(data.services, 'degraded').map(s => s.id), ['termii-sms'])
  assert.deepEqual(filterHealthServices([], 'degraded'), [])
  assert.deepEqual(filterHealthServices(undefined), [])
  assert.deepEqual(data, before)
})

test('all four incident statuses share the summary rule and keep service status independent', () => {
  const before = structuredClone(data)
  const incidents = ['Investigating', 'Identified', 'Monitoring', 'Resolved'].map((status, i) => ({ ...data.incidents[0], id: `isolated-${i}`, status }))
  assert.deepEqual(openHealthIncidents(incidents).map(i => i.status), ['Investigating', 'Identified', 'Monitoring'])
  assert.equal(systemHealthSummary({ ...data, incidents }).openIncidents, openHealthIncidents(incidents).length)
  const resolved = [{ ...data.incidents[0], status: 'Resolved' }]
  assert.deepEqual(openHealthIncidents(resolved), [])
  assert.equal(systemHealthSummary({ ...data, incidents: resolved }).openIncidents, 0)
  assert.match(degradedServiceAlert(data.services), /Test SMS/)
  const operational = data.services.map(s => ({ ...s, status: 'operational' }))
  assert.equal(degradedServiceAlert(operational), null)
  assert.equal(systemHealthSummary({ ...data, services: operational }).openIncidents, 1)
  assert.deepEqual(data, before)
  assert.equal(openHealthIncidents(undefined), null)
})


test('supporting Figma metrics stay separate from the unchanged main summary calculations', () => {
  assert.deepEqual(data.summaryDetails, { uptimeTargetPercent: 90, requestsFasterPercent: 75, resolvedThisMonth: 0 })
  assert.deepEqual(systemHealthSummary({ ...data, summaryDetails: { resolvedThisMonth: 100 } }), systemHealthSummary(data))
  assert.equal(data.incidents.length, 1)
})


test('presentation state preserves unknown versus confirmed empty monitoring and hides stale snapshots', () => {
  assert.deepEqual(createSystemHealthState(), { status: 'unavailable', data: undefined })
  for (const status of ['loading', 'error', 'unavailable']) assert.deepEqual(createSystemHealthState(status, data), { status, data: undefined })
  assert.equal(createSystemHealthState('ready', data).data, data)
  assert.equal(systemHealthSummary(createSystemHealthState('empty').data).openIncidents, null)
  assert.equal(systemHealthSummary(createSystemHealthState('empty', { incidents: [] }).data).openIncidents, 0)
  for (const value of [undefined, null, 0, 'invalid']) assert.equal(createSystemHealthState('ready', value).data, undefined)
  assert.deepEqual(filterHealthServices([null, undefined, {}, { id: 'missing-name' }]), [])
})
