import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { mapFacilitiesResponse, mapFacilityResponse } from '../src/super-admin/facilitiesResponse.js'

const row = (id = 'isolated') => ({ id, name: `Test ${id}`, plan: 'Growth Plan', billingCycle: 'Monthly', status: 'active', monthlyFee: 70000, renewalDate: '2099-11-02' })
const list = (records = [row()]) => ({ facilities: records, total: records.length, page: 1, limit: 7, totalPages: Math.ceil(records.length / 7), counts: { all: 10, active: 4, trial: 3, past_due: 3 } })

test('maps actual list fields/counts; never passes fallback stats, admin, payment or private fields', () => {
  const input = list([{ ...row(), clinicians: 123, patients: 456, messages: 789, doctorsCount: 5, pharmacistsCount: 3, adminName: 'Fallback', adminEmail: 'fallback@test.invalid', paymentMethod: 'Fallback', certificateUrl: 'secret' }])
  const before = structuredClone(input), output = mapFacilitiesResponse(input)
  assert.deepEqual(output.counts, [10, 4, 3, 3])
  assert.equal(output.records[0].nextRenewalDate, '2099-11-02')
  assert.equal(output.records[0].subscriptionAmount, 70000)
  for (const field of ['doctors', 'pharmacists', 'patients', 'smsSent', 'whatsappSent', 'admin', 'paymentMethod', 'subscriptionDate']) assert.equal(output.records[0][field], null)
  assert.equal(JSON.stringify(output).includes('secret'), false)
  assert.deepEqual(input, before)
})

test('details ignore synthesized renewal, percentages, yearly amounts and preserve missing values', () => {
  const value = mapFacilityResponse({ ...row(), renewalDate: null, monthlyValue: 84000, billingCycle: 'Yearly', facilityAdmin: { name: 'Fallback' }, renewal: { date: '2026-11-02' }, cards: { patients: { count: 50, percentage: 25 }, messages: { label: 'Messages (Nov)' } } })
  assert.equal(value.nextRenewalDate, null)
  assert.equal(value.subscriptionAmount, null)
  assert.equal(value.messagesLabel, 'Messages (Nov)')
  assert.deepEqual(value.progress, { clinicians: null, patients: null, messages: null })
  assert.equal(mapFacilityResponse({ ...row(), status: 'bad' }).status, null)
  assert.equal(mapFacilityResponse({ ...row(), status: 'pending_review' }).statusLabel, 'Pending review')
})

test('empty counts remain zero; missing counts remain unknown; invalid schemas fail', () => {
  const empty = mapFacilitiesResponse({ ...list([]), counts: { all: 0, active: 0, trial: 0, past_due: 0 } })
  assert.equal(empty.status, 'empty'); assert.equal(empty.totalPages, 1)
  assert.deepEqual(empty.counts, [0, 0, 0, 0])
  assert.deepEqual(mapFacilitiesResponse({ ...list(), counts: null }).counts, [null, null, null, null])
  for (const value of [null, [], {}, { ...list(), facilities: null }, { ...list(), total: -1 }, { ...list(), totalPages: 8 }, list([row(), row()]), list([{}])]) assert.throws(() => mapFacilitiesResponse(value))
})

const source = await readFile(new URL('../src/super-admin/facilitiesApi.js', import.meta.url), 'utf8')
async function load(fetch) {
  let token = 'isolated-token', cleared = 0
  const context = vm.createContext({ fetch, Error, DOMException, URLSearchParams })
  const auth = new vm.SyntheticModule(['getSuperAdminAccessToken', 'setSuperAdminAccessToken'], function () {
    this.setExport('getSuperAdminAccessToken', () => token)
    this.setExport('setSuperAdminAccessToken', value => { token = value; cleared++ })
  }, { context })
  const mapper = new vm.SyntheticModule(['mapFacilitiesResponse', 'mapFacilityResponse'], function () {
    this.setExport('mapFacilitiesResponse', mapFacilitiesResponse); this.setExport('mapFacilityResponse', mapFacilityResponse)
  }, { context })
  const module = new vm.SourceTextModule(source, { context, initializeImportMeta(meta) { meta.env = { VITE_API_BASE_URL: 'https://api.example.test///' } } })
  await module.link(name => name === './authentication' ? auth : mapper)
  await module.evaluate()
  return { api: module.namespace, setToken(value) { token = value }, current: () => token, cleared: () => cleared }
}
const response = (body, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status })

test('uses registered prefix, supported search/status/plan/page/limit, Bearer and abort signal; GET only', async () => {
  const calls = [], controller = new AbortController()
  const { api } = await load(async (url, options) => { calls.push({ url, ...options }); return response(url.includes('?') ? list() : row('a/b')) })
  await api.getSuperAdminFacilities({ query: '  clinic & state  ', status: 'past_due', plan: 'Growth Plan' }, controller.signal)
  const url = new URL(calls[0].url)
  assert.equal(url.pathname, '/api/super-admin/facilities')
  assert.equal(url.searchParams.get('search'), 'clinic & state')
  assert.equal(url.searchParams.get('status'), 'past_due')
  assert.equal(url.searchParams.get('plan'), 'Growth Plan')
  assert.equal(url.searchParams.get('limit'), '7')
  assert.equal(url.searchParams.has('sortBy'), false)
  assert.equal(calls[0].headers.Authorization, 'Bearer isolated-token')
  assert.equal(calls[0].signal, controller.signal); assert.equal(calls[0].cache, 'no-store')
  await api.getSuperAdminFacility('a/b')
  assert.equal(calls[1].url, 'https://api.example.test/api/super-admin/facilities/a%2Fb')
  assert.ok(calls.every(call => call.method === 'GET' && !call.body))
})

test('sorting collects all matching pages and rejects inconsistent snapshots', async () => {
  const pages = []
  const { api } = await load(async url => {
    const params = new URL(url).searchParams, page = Number(params.get('page')); pages.push(page)
    assert.equal(params.get('limit'), '100'); assert.equal(params.get('search'), 'clinic')
    return response({ ...list(), facilities: Array.from({ length: page === 1 ? 100 : 1 }, (_, i) => row(`${page}-${i}`)), total: 101, totalPages: 2, limit: 100, page })
  })
  assert.equal((await api.getFacilitiesForSorting({ query: 'clinic' })).records.length, 101)
  assert.deepEqual(pages, [1, 2])
})

for (const status of [401, 403, 404, 500]) test(`HTTP ${status} is safe and clears only rejected sessions`, async () => {
  const session = await load(async () => response({ message: 'private-backend-error' }, status))
  await assert.rejects(session.api.getSuperAdminFacilities(), error => !error.message.includes('private-backend-error'))
  assert.equal(session.cleared(), [401, 403].includes(status) ? 1 : 0)
})

test('late list/detail responses and aborts never affect a newer session', async () => {
  for (const detail of [true, false]) for (const status of [200, 401]) {
    let finish
    const session = await load(() => new Promise(resolve => { finish = resolve }))
    const pending = detail ? session.api.getSuperAdminFacility('isolated') : session.api.getSuperAdminFacilities()
    session.setToken('new-token'); finish(response(detail ? row() : list(), status))
    await assert.rejects(pending, { name: 'AbortError' })
    assert.equal(session.current(), 'new-token'); assert.equal(session.cleared(), 0)
  }
  const controller = new AbortController(), session = await load(async () => { controller.abort(); return response(list()) })
  await assert.rejects(session.api.getSuperAdminFacilities({}, controller.signal), { name: 'AbortError' })
})

test('missing auth, offline, malformed and empty success responses fail safely', async () => {
  const missing = await load(() => { throw Error('must not fetch') }); missing.setToken(null)
  await assert.rejects(missing.api.getSuperAdminFacilities(), /log in/)
  for (const fetch of [async () => { throw Error('offline') }, async () => new Response('{'), async () => response(null, 204)]) {
    const session = await load(fetch)
    await assert.rejects(session.api.getSuperAdminFacilities())
  }
})

test('changing totals or duplicate IDs across sort pages fail rather than display an incomplete sort', async () => {
  for (const changedTotal of [true, false]) {
    const { api } = await load(async url => {
      const page = Number(new URL(url).searchParams.get('page'))
      return response({ ...list(), facilities: page === 1 ? Array.from({ length: 100 }, (_, i) => row(String(i))) : [row('0')], total: page === 2 && changedTotal ? 102 : 101, totalPages: 2, limit: 100, page })
    })
    await assert.rejects(api.getFacilitiesForSorting({}), /changed while loading/)
  }
})

test('an out-of-range server page re-requests the last valid page', async () => {
  const pages = []
  const { api } = await load(async url => {
    const page = Number(new URL(url).searchParams.get('page')); pages.push(page)
    return response({ ...list(), facilities: page === 1 ? [row()] : [], page })
  })
  assert.equal((await api.getSuperAdminFacilities({ page: 3 })).page, 1)
  assert.deepEqual(pages, [3, 1])
})
