import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { mapDashboardResponse } from '../src/super-admin/overviewResponse.js'

// Isolated fixtures only; never imported by application runtime.
const payload = () => ({
  revenue: { mrr: 676667, growthPercentage: 7.4, chart: [{ month: 'Oct', amount: 676667 }] },
  stats: { registeredFacilities: { total: 8, awaitingReview: 0 }, activeSubscribers: { total: 4, inTrial: 1, overdue: 2 }, messagesSent: { total: 3366, deliveryPercentage: 97.6 }, patientsOnRecord: { total: 5638, liveFacilitiesCount: 5 } },
  planMix: { plans: [{ name: 'Growth Plan', subscribersCount: 5, percentage: 100 }] },
  integrations: [{ id: 'medtrail-api', status: 'operational', uptimePercent: 99.98, latencyMs: 182 }],
  upcomingRenewals: [{ id: 'isolated', facilityName: 'Test facility', plan: 'Growth Plan', amount: 0, rawRenewalDate: '2099-11-01', renewalDate: 'Never use formatted fallback' }],
  recentPlatformActivities: [{ rawDate: '2026-10-27T09:00:00Z', who: { name: 'Test actor', role: 'Super admin' }, action: 'Facility approved for trial', facility: 'Test facility', metadata: { private: 'must not retain' } }],
  facilityReviewAlert: null,
})

test('maps live revenue, platform statistics, and integrations from dashboard payload', () => {
  for (const total of [0, 4, 123456]) {
    const input = payload()
    input.stats.activeSubscribers.total = total
    const before = JSON.stringify(input), state = mapDashboardResponse(input)
    assert.equal(state.statisticsState.status, 'ready')
    assert.equal(state.statisticsState.data.monthlyRevenue, 676667)
    assert.equal(state.platformState.status, 'ready')
    assert.equal(state.platformState.data.activeSubscribers, total)
    assert.equal(state.integrationsState.status, 'ready')
    assert.equal(state.integrationsState.data[0].id, 'medtrail')
    assert.equal(JSON.stringify(input), before)
  }
})

test('maps raw renewal dates, zero amounts and selected safe activity/alert fields', () => {
  const input = payload()
  input.facilityReviewAlert = { pendingCount: 2, facilityName: 'Test facility', cacNumber: 'private', certificateUrl: 'private' }
  const state = mapDashboardResponse(input)
  assert.equal(state.renewalsState.data[0].renewalDate, '2099-11-01')
  assert.equal(state.renewalsState.data[0].amount, 0)
  assert.equal(state.activitiesState.source, 'dashboard-api')
  assert.equal(state.activitiesState.data[0].action, 'Facility approved for trial')
  assert.equal(state.activitiesState.data[0].actor, 'Test actor')
  assert.ok(!JSON.stringify(state).includes('private'))
  assert.deepEqual(state.facilityReviewState.data, { pendingCount: 2, facilityName: 'Test facility' })
})

test('empty, missing and invalid sections stay distinct and no fallback dates are invented', () => {
  for (const input of [null, {}]) assert.equal(mapDashboardResponse(input).renewalsState.status, 'empty')
  const state = mapDashboardResponse({ upcomingRenewals: [], recentPlatformActivities: [], facilityReviewAlert: null })
  assert.equal(state.renewalsState.status, 'empty')
  assert.equal(state.activitiesState.status, 'empty')
  assert.equal(state.facilityReviewState.status, 'empty')
  assert.equal(state.platformState.status, 'unavailable')
  assert.equal(mapDashboardResponse({ upcomingRenewals: {} }).renewalsState.status, 'error')
  assert.equal(mapDashboardResponse({ upcomingRenewals: [{ ...payload().upcomingRenewals[0], rawRenewalDate: null }] }).renewalsState.status, 'unavailable')
  assert.equal(mapDashboardResponse({ recentPlatformActivities: [{ rawDate: 'invalid', action: 'Test' }] }).activitiesState.status, 'unavailable')
  for (const input of [[], 'broken', { unexpected: true }]) assert.throws(() => mapDashboardResponse(input), /unexpected/)
})

const source = await readFile(new URL('../src/super-admin/overviewApi.js', import.meta.url), 'utf8')
async function load(fetch, env = {}) {
  let token = 'isolated-token', cleared = 0
  const context = vm.createContext({ fetch, Error, DOMException })
  const auth = new vm.SyntheticModule(['getSuperAdminAccessToken', 'setSuperAdminAccessToken'], function () {
    this.setExport('getSuperAdminAccessToken', () => token)
    this.setExport('setSuperAdminAccessToken', value => { token = value; cleared++ })
  }, { context })
  const mapper = new vm.SyntheticModule(['mapDashboardResponse'], function () { this.setExport('mapDashboardResponse', mapDashboardResponse) }, { context })
  const module = new vm.SourceTextModule(source, { context, initializeImportMeta(meta) { meta.env = env } })
  await module.link(name => name === './authentication' ? auth : mapper)
  await module.evaluate()
  return { api: module.namespace, setToken(value) { token = value }, current: () => token, cleared: () => cleared }
}
const response = (body, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status })

test('GET uses the configured origin, Super Admin Bearer token, no-store and cancellation', async () => {
  let request
  const controller = new AbortController()
  const { api } = await load(async (url, options) => { request = { url, ...options }; return response(payload()) }, { VITE_API_BASE_URL: 'https://api.example.test///' })
  await api.getSuperAdminOverview(controller.signal)
  assert.equal(request.url, 'https://api.example.test/api/super-admin/dashboard')
  assert.equal(request.headers.Authorization, 'Bearer isolated-token')
  assert.equal(request.cache, 'no-store')
  assert.equal(request.signal, controller.signal)
})

test('auth rejection clears only the current Super Admin session; errors never echo backend secrets', async () => {
  for (const status of [401, 403, 500]) {
    const session = await load(async () => response({ message: 'backend-secret' }, status))
    await assert.rejects(session.api.getSuperAdminOverview(), error => !error.message.includes('backend-secret'))
    assert.equal(session.cleared(), status === 500 ? 0 : 1)
  }
})

test('stale/aborted responses cannot clear a newer session or publish stale data', async () => {
  for (const status of [200, 401]) {
    let finish
    const session = await load(() => new Promise(resolve => { finish = resolve }))
    const pending = session.api.getSuperAdminOverview()
    session.setToken('newer-token')
    finish(response(payload(), status))
    await assert.rejects(pending, { name: 'AbortError' })
    assert.equal(session.current(), 'newer-token')
    assert.equal(session.cleared(), 0)
  }
})

test('missing auth, offline, malformed JSON, empty responses, and request abort are handled', async () => {
  const noAuth = await load(() => { throw Error('must not request') })
  noAuth.setToken(null)
  await assert.rejects(noAuth.api.getSuperAdminOverview(), /log in/)
  const offline = await load(async () => { throw Error('Offline') })
  await assert.rejects(offline.api.getSuperAdminOverview(), /Unable to connect/)
  const malformed = await load(async () => new Response('invalid json'))
  await assert.rejects(malformed.api.getSuperAdminOverview(), /unexpected/)
  const empty = await load(async () => response(null, 204))
  assert.equal((await empty.api.getSuperAdminOverview()).activitiesState.status, 'empty')
  const aborted = await load(async () => { throw new DOMException('Aborted', 'AbortError') })
  await assert.rejects(aborted.api.getSuperAdminOverview(), { name: 'AbortError' })
})
