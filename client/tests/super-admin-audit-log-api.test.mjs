import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { mapAuditLogResponse } from '../src/super-admin/auditLogResponse.js'
import { auditLogPage } from '../src/super-admin/auditLogModel.js'

const activity = (id = 'isolated') => ({ id, rawDate: '2026-10-28T09:00:00Z', when: 'Wrong formatted date', who: { name: 'Isolated actor', role: 'Super admin', email: 'private-email' }, action: 'Literal backend action', facility: 'Isolated hospital', metadata: { secret: 'private-metadata' }, status: 'success' })
const payload = (limit = 7, records = [activity()]) => ({ activities: records, total: records.length, page: 1, limit, totalPages: Math.ceil(records.length / limit) })

test('maps exact audit table fields, preserving literal action and actor role while dropping private metadata', () => {
  const input = payload(), before = structuredClone(input), result = mapAuditLogResponse(input)
  assert.deepEqual(result.records[0], { id: 'isolated', timestamp: '2026-10-28T09:00:00Z', actorName: 'Isolated actor', actorRole: 'Super admin', action: 'Literal backend action', facilityName: 'Isolated hospital' })
  assert.equal(JSON.stringify(result).includes('private'), false)
  assert.deepEqual(input, before)
})

test('optional missing/invalid audit fields remain unknown, without fabricated names, roles, actions or dates', () => {
  const input = payload(); Object.assign(input.activities[0], { rawDate: '2026-02-31T09:00:00Z', who: null, action: ' ', facility: null })
  assert.deepEqual(mapAuditLogResponse(input).records[0], { id: 'isolated', timestamp: null, actorName: null, actorRole: null, action: null, facilityName: null })
  for (const value of ['invalid', '2026-10-28T09:00:00', null]) {
    input.activities[0].rawDate = value; assert.equal(mapAuditLogResponse(input).records[0].timestamp, null)
  }
  input.activities[0].rawDate = '2026-10-28T10:00:00+01:00'
  assert.equal(mapAuditLogResponse(input).records[0].timestamp, '2026-10-28T10:00:00+01:00')
})

test('empty collections and unknown data are distinct; bad schemas, pagination and duplicate identities fail', () => {
  const result = mapAuditLogResponse(payload(7, []))
  assert.equal(result.status, 'empty'); assert.equal(result.pagination.total, 0); assert.equal(result.pagination.totalPages, 1)
  for (const input of [null, {}, [], { ...payload(), activities: null }, payload(7, [{}]), payload(7, [activity(), activity()]), { ...payload(), total: -1 }, { ...payload(), totalPages: 2 }, { ...payload(), limit: 101 }]) assert.throws(() => mapAuditLogResponse(input))
})

const source = await readFile(new URL('../src/super-admin/auditLogApi.js', import.meta.url), 'utf8')
async function load(fetch) {
  let token = 'isolated-token', cleared = 0
  const context = vm.createContext({ fetch, Error, DOMException, URLSearchParams })
  const auth = new vm.SyntheticModule(['getSuperAdminAccessToken', 'setSuperAdminAccessToken'], function () {
    this.setExport('getSuperAdminAccessToken', () => token)
    this.setExport('setSuperAdminAccessToken', value => { token = value; cleared++ })
  }, { context })
  const mapper = new vm.SyntheticModule(['mapAuditLogResponse'], function () { this.setExport('mapAuditLogResponse', mapAuditLogResponse) }, { context })
  const module = new vm.SourceTextModule(source, { context, initializeImportMeta(meta) { meta.env = { VITE_API_BASE_URL: 'https://api.example.test///' } } })
  await module.link(name => name === './authentication' ? auth : mapper)
  await module.evaluate()
  return { api: module.namespace, setToken(value) { token = value }, current: () => token, cleared: () => cleared }
}
const response = (body, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status })

test('uses registered /api/super-admin/activities, supported facility/role filters, seven records and Super Admin session', async () => {
  let request
  const controller = new AbortController(), { api } = await load(async (url, options) => { request = { url, ...options }; return response(payload()) })
  await api.getSuperAdminAuditLog({ facility: '  A & B  ', role: '  Super admin ' }, controller.signal)
  const url = new URL(request.url)
  assert.equal(url.pathname, '/api/super-admin/activities')
  for (const [key, value] of Object.entries({ facility: 'A & B', role: 'Super admin', page: '1', limit: '7' })) assert.equal(url.searchParams.get(key), value)
  assert.equal(url.searchParams.has('search'), false); assert.equal(url.searchParams.has('sortBy'), false)
  assert.equal(request.method, 'GET'); assert.equal(request.body, undefined)
  assert.equal(request.headers.Authorization, 'Bearer isolated-token'); assert.equal(request.cache, 'no-store'); assert.equal(request.signal, controller.signal)
})

test('sorting gathers every matching server page before all four stable sorts and seven-row pagination', async () => {
  const requests = []
  const { api } = await load(async url => {
    const params = new URL(url).searchParams, page = Number(params.get('page')); requests.push(page)
    assert.equal(params.get('limit'), '100'); assert.equal(params.get('facility'), 'Test')
    const records = Array.from({ length: page === 1 ? 100 : 5 }, (_, i) => {
      const index = (page - 1) * 100 + i
      return { ...activity(`row-${index}`), rawDate: new Date(Date.UTC(2026, 9, 28, 0, index)).toISOString(), who: { name: `Actor ${String(104 - index).padStart(3, '0')}`, role: 'Backend role' }, action: `Action ${String(104 - index).padStart(3, '0')}`, facility: `Facility ${String(104 - index).padStart(3, '0')}` }
    })
    return response({ activities: records, total: 105, page, limit: 100, totalPages: 2 })
  })
  const result = await api.getAuditLogForSorting({ facility: 'Test' })
  assert.equal(result.records.length, 105); assert.deepEqual(requests, [1, 2])
  for (const column of ['when', 'who', 'action', 'facility']) {
    const asc = auditLogPage(result.records, { column, direction: 'asc' })
    assert.equal(asc.totalPages, 15); assert.equal(asc.records.length, 7)
    assert.equal(asc.records[0].id, column === 'when' ? 'row-0' : 'row-104')
    assert.equal(auditLogPage(result.records, { column, direction: 'desc' }).records[0].id, column === 'when' ? 'row-104' : 'row-0')
  }
})

test('sorting rejects changing totals, duplicate IDs and incomplete snapshots instead of showing a partial sort', async () => {
  for (const mode of ['changed', 'duplicate', 'incomplete']) {
    const { api } = await load(async url => {
      const page = Number(new URL(url).searchParams.get('page'))
      const records = page === 1 ? Array.from({ length: mode === 'incomplete' ? 99 : 100 }, (_, i) => activity(`row-${i}`)) : [activity(mode === 'duplicate' ? 'row-0' : 'last')]
      return response({ activities: records, total: page === 2 && mode === 'changed' ? 102 : 101, page, limit: 100, totalPages: 2 })
    })
    await assert.rejects(api.getAuditLogForSorting(), /changed while loading/)
  }
})

for (const status of [401, 403, 500]) test(`HTTP ${status} is retryable/safe and only auth rejection clears the session`, async () => {
  const session = await load(async () => response({ message: 'private-backend-error' }, status))
  await assert.rejects(session.api.getSuperAdminAuditLog(), error => !error.message.includes('private-backend-error'))
  assert.equal(session.cleared(), status === 500 ? 0 : 1)
})

test('late/aborted responses cannot clear a newer session or publish stale records', async () => {
  for (const status of [200, 401]) {
    let finish
    const session = await load(() => new Promise(resolve => { finish = resolve }))
    const pending = session.api.getSuperAdminAuditLog()
    session.setToken('new-token'); finish(response(payload(), status))
    await assert.rejects(pending, { name: 'AbortError' })
    assert.equal(session.current(), 'new-token'); assert.equal(session.cleared(), 0)
  }
  const controller = new AbortController(); controller.abort()
  const session = await load(() => { throw Error('must not fetch') })
  await assert.rejects(session.api.getSuperAdminAuditLog({}, controller.signal), { name: 'AbortError' })
})

test('missing auth, offline, malformed JSON, missing responses and unexpected pagination fail safely', async () => {
  const missing = await load(() => { throw Error('must not fetch') }); missing.setToken(null)
  await assert.rejects(missing.api.getSuperAdminAuditLog(), /log in/)
  for (const fetch of [async () => { throw Error('offline') }, async () => new Response('{'), async () => response(null, 204), async () => response({ ...payload(), limit: 20 })]) {
    const session = await load(fetch); await assert.rejects(session.api.getSuperAdminAuditLog())
  }
})

test('out-of-range server page re-requests the last valid page, without changing audit records', async () => {
  const pages = []
  const { api } = await load(async (url, options) => {
    assert.equal(options.method, 'GET')
    const page = Number(new URL(url).searchParams.get('page')); pages.push(page)
    return response({ ...payload(), activities: page === 1 ? [activity()] : [], page })
  })
  assert.equal((await api.getSuperAdminAuditLog({ page: 3 })).pagination.page, 1)
  assert.deepEqual(pages, [3, 1])
})
