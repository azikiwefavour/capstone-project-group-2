import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { mapMessagingResponse, mapMessagingUsageResponse, safeMessageRecipient } from '../src/super-admin/messagingResponse.js'

const row = (id = 'isolated') => ({ id, rawTime: '2026-10-28T09:20:00Z', time: 'Wrong display time', facility: 'Full isolated hospital name', facilityShort: 'Wrong short name', to: '+234802****447', rawTo: '+2348021234447', message: 'Staff invite', channel: 'SMS', rawStatus: 'failed', status: 'Delivered', failureReason: 'private-detail', metadata: { private: true } })
const payload = () => ({
  summary: { sentInOctober: { count: 3366 }, deliveryRate: { rate: 97.6 }, failed: { count: 81 }, termiiCredit: { balance: 48000, currency: 'NGN' } },
  messages: { breakdown: [{ type: 'Staff invites', count: 1120 }] }, usage: { items: [{ facilityName: 'Static facility', used: 640, quota: 1000 }] },
  counts: { all: 6, failed: 1, queued: 1, delivered: 4 }, logs: [row()], pagination: { total: 1, page: 1, limit: 7, totalPages: 1 },
})

test('maps raw log identity/time/full name/status and privacy-safe fields only', () => {
  const input = payload(), before = structuredClone(input), output = mapMessagingResponse(input)
  assert.deepEqual(output.data.messageLog[0], { id: 'isolated', time: '2026-10-28T09:20:00Z', facilityName: 'Full isolated hospital name', maskedRecipient: '+234802****447', messageLabel: 'Staff invite', channel: 'sms', status: 'failed' })
  assert.equal(JSON.stringify(output).includes('private'), false)
  assert.equal(JSON.stringify(output).includes('+2348021234447'), false)
  assert.deepEqual(input, before)
})

test('maps live summary, credit, category, and usage from messaging response', () => {
  for (const value of [0, 3366, 48000, 123456]) {
    const input = payload()
    input.summary.sentInOctober.count = value; input.summary.termiiCredit.balance = value
    input.messages.breakdown[0].count = value; input.usage.items[0].used = value; input.counts.failed = value
    const data = mapMessagingResponse(input).data
    assert.equal(data.credit, value)
    assert.equal(data.categories[0].count, value)
    assert.equal(data.usage[0].used, value)
  }
})

test('recipient masking accepts approved masked phone/email forms and never falls back to rawTo', () => {
  for (const value of ['+234802****447', 'jo****9@example.test', 'a****@example.test']) assert.equal(safeMessageRecipient(value), value)
  for (const value of ['+2348021234447', 'john@example.test', 'john****doe@example.test', 'bad', null]) assert.equal(safeMessageRecipient(value), null)
  const input = payload(); input.logs[0].to = 'john@example.test'
  assert.equal(mapMessagingResponse(input).data.messageLog[0].maskedRecipient, null)
})

test('Email/WhatsApp/SMS and sent statuses remain accurate; raw message contents and invalid dates are withheld', () => {
  const input = payload(); Object.assign(input.logs[0], { channel: 'Email', rawStatus: 'sent', message: 'Sensitive prescription content', rawTime: '2026-02-31T09:00:00Z' })
  const record = mapMessagingResponse(input).data.messageLog[0]
  assert.equal(record.channel, 'email'); assert.equal(record.status, 'sent'); assert.equal(record.messageLabel, null); assert.equal(record.time, null)
  for (const value of ['toString', 'Unknown', null]) {
    input.logs[0].channel = value; assert.equal(mapMessagingResponse(input).data.messageLog[0].channel, null)
  }
})

test('empty data keeps valid pagination and malformed/duplicate collections fail explicitly', () => {
  const empty = payload(); empty.logs = []; empty.pagination = { total: 0, page: 1, limit: 7, totalPages: 1 }
  assert.equal(mapMessagingResponse(empty).status, 'empty')
  assert.equal(mapMessagingResponse(empty).pagination.totalPages, 1)
  for (const value of [null, {}, { ...payload(), logs: null }, { ...payload(), logs: [{}] }, { ...payload(), pagination: { total: -1 } }]) assert.throws(() => mapMessagingResponse(value))
  const duplicate = payload(); duplicate.logs = [row(), row()]; duplicate.pagination.total = 2
  assert.throws(() => mapMessagingResponse(duplicate), /duplicate/)
})

test('View all response maps facility usage records', () => {
  for (const facilities of [[], [{ facilityName: 'Static name', used: 910, quota: 1000, percentage: 91 }]]) {
    const res = mapMessagingUsageResponse({ facilities })
    assert.equal(res.status, facilities.length ? 'ready' : 'empty')
  }
  for (const value of [null, {}, { facilities: 'wrong' }]) assert.throws(() => mapMessagingUsageResponse(value), /unexpected/)
})

const source = await readFile(new URL('../src/super-admin/messagingApi.js', import.meta.url), 'utf8')
async function load(fetch) {
  let token = 'isolated-token', cleared = 0
  const context = vm.createContext({ fetch, Error, DOMException, URLSearchParams })
  const auth = new vm.SyntheticModule(['getSuperAdminAccessToken', 'setSuperAdminAccessToken'], function () {
    this.setExport('getSuperAdminAccessToken', () => token)
    this.setExport('setSuperAdminAccessToken', value => { token = value; cleared++ })
  }, { context })
  const mapper = new vm.SyntheticModule(['mapMessagingResponse', 'mapMessagingUsageResponse'], function () {
    this.setExport('mapMessagingResponse', mapMessagingResponse); this.setExport('mapMessagingUsageResponse', mapMessagingUsageResponse)
  }, { context })
  const module = new vm.SourceTextModule(source, { context, initializeImportMeta(meta) { meta.env = { VITE_API_BASE_URL: 'https://api.example.test///' } } })
  await module.link(name => name === './authentication' ? auth : mapper)
  await module.evaluate()
  return { api: module.namespace, setToken(value) { token = value }, current: () => token, cleared: () => cleared }
}
const response = (body, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status })

test('GET /api route uses all registered params, seven rows, Bearer, no-store and cancellation', async () => {
  let request
  const controller = new AbortController(), { api } = await load(async (url, options) => { request = { url, ...options }; return response(payload()) })
  await api.getSuperAdminMessaging({ tab: 'queued', channel: 'WhatsApp', search: '  A & B  ', facility: 'Hospital', messageType: 'Staff invite', sortBy: 'facility', sortOrder: 'ASC' }, controller.signal)
  const url = new URL(request.url)
  assert.equal(url.pathname, '/api/super-admin/messaging')
  for (const [key, value] of Object.entries({ tab: 'queued', channel: 'WhatsApp', search: 'A & B', facility: 'Hospital', messageType: 'Staff invite', sortBy: 'facility', sortOrder: 'ASC', page: '1', limit: '7' })) assert.equal(url.searchParams.get(key), value)
  assert.equal(request.headers.Authorization, 'Bearer isolated-token'); assert.equal(request.signal, controller.signal); assert.equal(request.cache, 'no-store'); assert.equal(request.method, 'GET'); assert.equal(request.body, undefined)
})

test('all channel/status tabs serialize to supported backend values without a POST API', async () => {
  const requests = []
  const { api } = await load(async (url, options) => { requests.push({ url, ...options }); return response(payload()) })
  for (const channel of ['all', 'Email', 'SMS', 'WhatsApp']) for (const tab of ['all', 'failed', 'queued']) {
    await api.getSuperAdminMessaging({ channel, tab })
    const url = new URL(requests.at(-1).url)
    assert.equal(url.searchParams.get('tab'), tab)
    assert.equal(url.searchParams.get('channel'), channel === 'all' ? null : channel)
  }
  assert.ok(requests.every(request => request.method === 'GET' && !request.url.includes('/log')))
})

test('View all uses the registered GET usage endpoint with authenticated session', async () => {
  let request
  const { api } = await load(async (url, options) => { request = { url, ...options }; return response({ facilities: [] }) })
  assert.deepEqual(await api.getSuperAdminMessagingUsage(), { status: 'empty', records: [] })
  assert.equal(request.url, 'https://api.example.test/api/super-admin/messaging/usage')
  assert.equal(request.method, 'GET'); assert.equal(request.headers.Authorization, 'Bearer isolated-token')
})

for (const status of [401, 403, 500]) test(`HTTP ${status} handles list/usage safely and never reveals backend error fields`, async () => {
  for (const usage of [false, true]) {
    const session = await load(async () => response({ message: 'private-backend-error' }, status))
    await assert.rejects(usage ? session.api.getSuperAdminMessagingUsage() : session.api.getSuperAdminMessaging(), error => !error.message.includes('private-backend-error'))
    assert.equal(session.cleared(), status === 500 ? 0 : 1)
  }
})

test('late list/usage and aborted responses cannot publish or clear a newer session', async () => {
  for (const usage of [false, true]) for (const status of [200, 401]) {
    let finish
    const session = await load(() => new Promise(resolve => { finish = resolve }))
    const pending = usage ? session.api.getSuperAdminMessagingUsage() : session.api.getSuperAdminMessaging()
    session.setToken('new-token'); finish(response(usage ? { facilities: [] } : payload(), status))
    await assert.rejects(pending, { name: 'AbortError' })
    assert.equal(session.current(), 'new-token'); assert.equal(session.cleared(), 0)
  }
  const controller = new AbortController(); controller.abort()
  const session = await load(() => { throw Error('must not fetch') })
  await assert.rejects(session.api.getSuperAdminMessaging({}, controller.signal), { name: 'AbortError' })
})

test('no auth, offline, malformed JSON, missing success and wrong pagination fail safely', async () => {
  const missing = await load(() => { throw Error('must not fetch') }); missing.setToken(null)
  await assert.rejects(missing.api.getSuperAdminMessaging(), /log in/)
  for (const fetch of [async () => { throw Error('offline') }, async () => new Response('{'), async () => response(null, 204), async () => response({ ...payload(), pagination: { total: 1, page: 1, limit: 20, totalPages: 1 } })]) {
    const session = await load(fetch); await assert.rejects(session.api.getSuperAdminMessaging())
  }
})

test('out-of-range pages re-request the last valid server page', async () => {
  const pages = []
  const { api } = await load(async url => {
    const page = Number(new URL(url).searchParams.get('page')); pages.push(page)
    return response({ ...payload(), logs: page === 1 ? [row()] : [], pagination: { total: 1, page, limit: 7, totalPages: 1 } })
  })
  assert.equal((await api.getSuperAdminMessaging({ page: 3 })).pagination.page, 1)
  assert.deepEqual(pages, [3, 1])
})
