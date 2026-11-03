import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { mapSystemHealthPing, mapSystemHealthOverview } from '../src/super-admin/systemHealthResponse.js'
import { systemHealthSummary } from '../src/super-admin/systemHealthModel.js'

const ping = () => ({ status: 'UP', uptime: 12345, timestamp: '2026-10-28T10:00:00Z' })
const snapshot = () => ({
  summary: { apiUptime30Days: { uptime: 99.98 }, apiResponseTime: { responseMs: 182 }, paymentWebhooks: { deliveryRate: 99.8 }, openIncidents: { count: 1, resolvedThisMonth: 2 } },
  alert: { message: 'Hardcoded service degradation' },
  platform: [
    { id: 'medtrail-api', name: 'Medtrail API', reference: 'API reference', uptimePercent: 99.98, latencyMs: 182, status: 'operational' },
    { id: 'database', name: 'Database', reference: 'Database', uptimePercent: 99.99, latencyMs: 15, status: 'operational' },
    { id: 'auth-sessions', name: 'Sign in and verification codes', uptimePercent: 99.95, latencyMs: 240, status: 'operational' },
    { id: 'termii-sms', name: 'Termii SMS', uptimePercent: 99.21, latencyMs: 2.9, status: 'degraded' },
  ],
  incidents: { month: 'October 2026', openCount: 1, resolvedThisMonth: 2, items: [{ id: 'isolated-incident', title: 'Repository incident', serviceName: 'Isolated provider', rawTime: '2026-10-28T09:00:00Z', status: 'Investigating', impact: 'private-impact', description: 'private-description' }] },
})

test('safe ping maps observed API liveness with active metrics', () => {
  const result = mapSystemHealthPing(ping())
  assert.equal(result.status, 'ready')
  assert.deepEqual(result.data.services[0], { id: 'medtrail', name: 'Medtrail API', description: 'Current API liveness', status: 'operational', liveness: 'UP', uptimePercentage: 99.98, responseTimeMs: 182 })
  assert.deepEqual(systemHealthSummary(result.data), { apiUptime: 99.98, apiResponseTime: 182, paymentWebhooks: null, openIncidents: null })
  assert.equal(result.data.incidents, undefined)
  assert.equal(result.data.observedAt, ping().timestamp)
})

test('invalid ping, dates, process uptime and unknown status fail rather than assert availability', () => {
  for (const input of [null, {}, { ...ping(), status: 'DOWN' }, { ...ping(), timestamp: '2026-02-31T10:00:00Z' }, { ...ping(), timestamp: '2026-10-28T10:00:00' }, { ...ping(), uptime: -1 }, { ...ping(), uptime: '100' }]) assert.throws(() => mapSystemHealthPing(input))
})

test('combined contract adapter maps live summary, external health, and uptime constants', () => {
  const input = snapshot(), before = structuredClone(input), result = mapSystemHealthOverview(input)
  assert.deepEqual(systemHealthSummary(result.data), { apiUptime: 99.98, apiResponseTime: 182, paymentWebhooks: 99.8, openIncidents: 1 })
  for (const service of result.data.services) {
    assert.ok(service.uptimePercentage !== null)
    assert.ok(service.status !== null)
  }
  assert.equal(result.data.services.find(row => row.id === 'database').responseTimeMs, 15)
  assert.equal(result.data.services[0].reference, 'API reference')
  assert.deepEqual(input, before)
})

test('database failure keeps observed down state and latency sample', () => {
  const input = snapshot(); Object.assign(input.platform[1], { status: 'down', latencyMs: 9999 })
  const service = mapSystemHealthOverview(input).data.services[1]
  assert.equal(service.status, 'down'); assert.equal(service.responseTimeMs, 9999)
})

test('incident identity/title/service/raw date map without asserting rewritten phases, month or counts', () => {
  const output = mapSystemHealthOverview(snapshot()).data
  const incident = output.incidents[0]
  assert.equal(incident.title, 'Repository incident'); assert.equal(incident.serviceName, 'Isolated provider')
  assert.equal(incident.status, 'open'); assert.equal(incident.displayTime, '28 Oct 2026, 09:00 UTC')
  assert.equal(output.reportingPeriod, undefined); assert.equal(output.reportingPeriodUnavailable, true)
  assert.equal(JSON.stringify(output).includes('private'), false)
  const input = snapshot(); input.incidents.items = []
  assert.equal(systemHealthSummary(mapSystemHealthOverview(input).data).openIncidents, 0)
})

test('combined contract missing collections remain unknown; empty and malformed remain distinct', () => {
  const result = mapSystemHealthOverview({ platform: [] })
  assert.deepEqual(result.data.services, []); assert.equal(result.data.incidents, undefined)
  for (const input of [null, {}, { platform: {} }, { platform: [null] }, { incidents: {} }, { incidents: { items: [{}] } }]) assert.throws(() => mapSystemHealthOverview(input))
  const duplicate = snapshot(); duplicate.platform.push(duplicate.platform[0])
  assert.throws(() => mapSystemHealthOverview(duplicate), /duplicate/)
  const incidents = snapshot(); incidents.incidents.items.push(incidents.incidents.items[0])
  assert.throws(() => mapSystemHealthOverview(incidents), /duplicate/)
})

const source = await readFile(new URL('../src/super-admin/systemHealthApi.js', import.meta.url), 'utf8')
async function load(fetch) {
  let token = 'isolated-token', cleared = 0
  const context = vm.createContext({ fetch, Error, DOMException })
  const auth = new vm.SyntheticModule(['getSuperAdminAccessToken', 'setSuperAdminAccessToken'], function () {
    this.setExport('getSuperAdminAccessToken', () => token)
    this.setExport('setSuperAdminAccessToken', value => { token = value; cleared++ })
  }, { context })
  const mapper = new vm.SyntheticModule(['mapSystemHealthPing', 'mapSystemHealthOverview'], function () {
    this.setExport('mapSystemHealthPing', mapSystemHealthPing)
    this.setExport('mapSystemHealthOverview', mapSystemHealthOverview)
  }, { context })
  const module = new vm.SourceTextModule(source, { context, initializeImportMeta(meta) { meta.env = { VITE_API_BASE_URL: 'https://api.example.test///' } } })
  await module.link(name => name === './authentication' ? auth : mapper)
  await module.evaluate()
  return { api: module.namespace, setToken(value) { token = value }, current: () => token, cleared: () => cleared }
}
const response = (body, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status })

test('only confirmed side-effect-free /api health-check is called with existing Bearer session, no-store and signal', async () => {
  let request
  const controller = new AbortController(), { api } = await load(async (url, options) => { request = { url, ...options }; return response(ping()) })
  await api.getSuperAdminSystemHealth(controller.signal)
  assert.ok(request.url.startsWith('https://api.example.test/api/super-admin/system-health') || request.url.startsWith('https://api.example.test/api/super-admin/health-check'))
  assert.equal(request.method, 'GET'); assert.equal(request.body, undefined)
  assert.equal(request.headers.Authorization, 'Bearer isolated-token')
  assert.equal(request.cache, 'no-store'); assert.equal(request.signal, controller.signal)
})

for (const status of [401, 403, 500]) test(`HTTP ${status} clears only rejected current sessions and never echoes backend fields`, async () => {
  const session = await load(async () => response({ message: 'private-backend-error' }, status))
  await assert.rejects(session.api.getSuperAdminSystemHealth(), error => !error.message.includes('private-backend-error'))
  assert.equal(session.cleared(), status === 500 ? 0 : 1)
})

test('late or cancelled responses cannot clear a newer session or publish availability', async () => {
  for (const status of [200, 401]) {
    let finish
    const session = await load(() => new Promise(resolve => { finish = resolve }))
    const pending = session.api.getSuperAdminSystemHealth()
    session.setToken('new-token'); finish(response(ping(), status))
    await assert.rejects(pending, { name: 'AbortError' })
    assert.equal(session.current(), 'new-token'); assert.equal(session.cleared(), 0)
  }
  const controller = new AbortController(); controller.abort()
  const session = await load(() => { throw Error('must not fetch') })
  await assert.rejects(session.api.getSuperAdminSystemHealth(controller.signal), { name: 'AbortError' })
})

test('missing auth, offline, invalid JSON and missing success fail safely', async () => {
  const missing = await load(() => { throw Error('must not fetch') }); missing.setToken(null)
  await assert.rejects(missing.api.getSuperAdminSystemHealth(), /log in/)
  for (const fetch of [async () => { throw Error('offline') }, async () => new Response('{'), async () => response(null)]) {
    const session = await load(fetch); await assert.rejects(session.api.getSuperAdminSystemHealth())
  }
})

test('successful no-content response remains empty, without inferred service or incident records', async () => {
  const { api } = await load(async () => response(null, 204))
  assert.equal((await api.getSuperAdminSystemHealth()).status, 'empty')
})
