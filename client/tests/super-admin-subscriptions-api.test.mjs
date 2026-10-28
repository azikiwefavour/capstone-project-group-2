import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { mapSubscriptionsResponse } from '../src/super-admin/subscriptionsResponse.js'

const subscriber = (id = 'isolated') => ({ id, facility: 'Isolated hospital', plan: 'Starter', cycle: 'Monthly', amount: 30000, status: 'paid', method: 'Bank transfer', rawNextChargeDate: '2099-11-02', nextCharge: '02 Nov 2026' })
const payload = () => ({
  plans: { cycle: 'Monthly', starter: { name: 'Starter Plan', tier: 'Starter', price: 30000, subscribers: 1 }, growth: { name: 'Growth Plan', tier: 'Growth', price: 70000, subscribers: 5 } },
  subscribers: [subscriber()], pagination: { total: 1, page: 1, limit: 7, totalPages: 1 }, summary: { starterSubscribers: 1, growthSubscribers: 5 },
})

test('maps real configuration, identity, status, monthly fee and raw date without leaking private fields', () => {
  const input = payload(), before = structuredClone(input)
  input.subscribers[0].adminEmail = 'private'
  const output = mapSubscriptionsResponse(input)
  assert.deepEqual(output.planPrices, { Starter: 30000, Growth: 70000 })
  assert.equal(output.records[0].facilityName, 'Isolated hospital')
  assert.equal(output.records[0].chargeDate, '2099-11-02')
  assert.equal(output.records[0].amount, 30000)
  assert.equal(JSON.stringify(output).includes('private'), false)
  delete input.subscribers[0].adminEmail; assert.deepEqual(input, before)
})

test('ambiguous subscriber counts and payment methods stay unavailable regardless of value', () => {
  for (const value of [0, 1, 5, 999]) {
    const input = payload()
    input.plans.starter.subscribers = value; input.plans.growth.subscribers = value
    input.summary = { starterSubscribers: value, growthSubscribers: value }
    input.subscribers[0].method = value ? '--' : 'Bank transfer'
    const output = mapSubscriptionsResponse(input)
    assert.deepEqual(output.subscriberCounts, { Starter: null, Growth: null })
    assert.equal(output.records[0].paymentMethod, null)
  }
})

test('recorded payment methods that the service never fabricates remain available', () => {
  for (const method of ['Card', 'Direct debit']) {
    const input = payload(); input.subscribers[0].method = method
    assert.equal(mapSubscriptionsResponse(input).records[0].paymentMethod, method)
  }
})

test('annual and trial charges are unknown; no date fallback or invalid calendar is rendered', () => {
  for (const cycle of ['Annual', 'Monthly']) for (const status of ['paid', 'trial']) {
    const input = payload(); Object.assign(input.subscribers[0], { cycle, status, rawNextChargeDate: null })
    const output = mapSubscriptionsResponse(input)
    assert.equal(output.records[0].amount, cycle === 'Monthly' && status === 'paid' ? 30000 : null)
    assert.equal(output.records[0].chargeDate, null)
  }
  const input = payload(); input.subscribers[0].rawNextChargeDate = '2026-02-31'
  assert.equal(mapSubscriptionsResponse(input).records[0].chargeDate, null)
})

test('missing/invalid plans remain unknown without hiding a valid table or inventing prices', () => {
  const input = payload(); delete input.plans
  assert.deepEqual(mapSubscriptionsResponse(input).planPrices, { Starter: null, Growth: null })
  const wrong = payload(); wrong.plans.cycle = 'Annually'
  assert.deepEqual(mapSubscriptionsResponse(wrong).planPrices, { Starter: null, Growth: null })
  wrong.plans.starter.price = 300000; wrong.plans.growth.price = 700000
  assert.deepEqual(mapSubscriptionsResponse(wrong, 'annually').planPrices, { Starter: 300000, Growth: 700000 })
  wrong.plans.starter.price = -1; wrong.plans.growth.name = 'Unknown plan'
  assert.deepEqual(mapSubscriptionsResponse(wrong, 'annually').planPrices, { Starter: null, Growth: null })
})

test('empty collections are empty, invalid collections and pagination fail explicitly', () => {
  const input = payload(); input.subscribers = []; input.pagination = { total: 0, page: 1, limit: 7, totalPages: 0 }
  assert.equal(mapSubscriptionsResponse(input).status, 'empty')
  assert.equal(mapSubscriptionsResponse(input).pagination.totalPages, 1)
  for (const value of [null, {}, { ...payload(), subscribers: null }, { ...payload(), subscribers: [{}] }, { ...payload(), subscribers: [subscriber(), subscriber()] }, { ...payload(), pagination: { total: -1 } }]) assert.throws(() => mapSubscriptionsResponse(value))
})

const source = await readFile(new URL('../src/super-admin/subscriptionsApi.js', import.meta.url), 'utf8')
async function load(fetch) {
  let token = 'isolated-token', cleared = 0
  const context = vm.createContext({ fetch, Error, DOMException, URLSearchParams })
  const auth = new vm.SyntheticModule(['getSuperAdminAccessToken', 'setSuperAdminAccessToken'], function () {
    this.setExport('getSuperAdminAccessToken', () => token)
    this.setExport('setSuperAdminAccessToken', value => { token = value; cleared++ })
  }, { context })
  const mapper = new vm.SyntheticModule(['mapSubscriptionsResponse'], function () { this.setExport('mapSubscriptionsResponse', mapSubscriptionsResponse) }, { context })
  const module = new vm.SourceTextModule(source, { context, initializeImportMeta(meta) { meta.env = { VITE_API_BASE_URL: 'https://api.example.test///' } } })
  await module.link(name => name === './authentication' ? auth : mapper)
  await module.evaluate()
  return { api: module.namespace, setToken(value) { token = value }, current: () => token, cleared: () => cleared }
}
const response = (body, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status })

test('registered prefix, GET, independent card cycle, server filters, Bearer, no-store and cancellation', async () => {
  let call
  const controller = new AbortController(), input = payload(); input.plans.cycle = 'Annually'
  const { api } = await load(async (url, options) => { call = { url, ...options }; return response(input) })
  await api.getSuperAdminSubscriptions({ cycle: 'annually', search: '  clinic & admin  ', status: 'past_due', plan: 'Growth', sort: 'name_desc' }, controller.signal)
  const url = new URL(call.url)
  assert.equal(url.pathname, '/api/super-admin/subscriptions')
  assert.equal(url.searchParams.get('cycle'), 'Annually')
  assert.equal(url.searchParams.has('cycleFilter'), false)
  assert.equal(url.searchParams.get('search'), 'clinic & admin')
  assert.equal(url.searchParams.get('status'), 'past_due'); assert.equal(url.searchParams.get('plan'), 'Growth')
  assert.equal(url.searchParams.get('sortBy'), 'facility'); assert.equal(url.searchParams.get('sortOrder'), 'DESC')
  assert.equal(url.searchParams.get('limit'), '7')
  assert.equal(call.method, 'GET'); assert.equal(call.headers.Authorization, 'Bearer isolated-token')
  assert.equal(call.cache, 'no-store'); assert.equal(call.signal, controller.signal); assert.equal(call.body, undefined)
})

test('all existing sort options use supported server parameters', async () => {
  for (const [sort, column, order] of [['charge_asc', 'nextCharge', 'ASC'], ['charge_desc', 'nextCharge', 'DESC'], ['amount_asc', 'amount', 'ASC'], ['amount_desc', 'amount', 'DESC'], ['name_asc', 'facility', 'ASC'], ['name_desc', 'facility', 'DESC']]) {
    const { api } = await load(async url => {
      const params = new URL(url).searchParams
      assert.equal(params.get('sortBy'), column); assert.equal(params.get('sortOrder'), order)
      return response(payload())
    })
    await api.getSuperAdminSubscriptions({ sort })
  }
})

for (const status of [401, 403, 500]) test(`HTTP ${status} does not expose backend errors or clear unrelated sessions`, async () => {
  const session = await load(async () => response({ message: 'private-backend' }, status))
  await assert.rejects(session.api.getSuperAdminSubscriptions(), error => !error.message.includes('private-backend'))
  assert.equal(session.cleared(), status === 500 ? 0 : 1)
})

test('late responses and cancellation cannot publish data or clear a newer session', async () => {
  for (const status of [200, 401]) {
    let finish
    const session = await load(() => new Promise(resolve => { finish = resolve }))
    const pending = session.api.getSuperAdminSubscriptions()
    session.setToken('new-token'); finish(response(payload(), status))
    await assert.rejects(pending, { name: 'AbortError' })
    assert.equal(session.current(), 'new-token'); assert.equal(session.cleared(), 0)
  }
  const controller = new AbortController(), session = await load(async () => { controller.abort(); return response(payload()) })
  await assert.rejects(session.api.getSuperAdminSubscriptions({}, controller.signal), { name: 'AbortError' })
})

test('no auth, offline, malformed JSON, missing response and wrong pagination fail safely', async () => {
  const missing = await load(() => { throw Error('must not fetch') }); missing.setToken(null)
  await assert.rejects(missing.api.getSuperAdminSubscriptions(), /log in/)
  for (const fetch of [async () => { throw Error('offline') }, async () => new Response('{'), async () => response(null, 204), async () => response({ ...payload(), pagination: { total: 1, page: 1, limit: 20, totalPages: 1 } })]) {
    const session = await load(fetch); await assert.rejects(session.api.getSuperAdminSubscriptions())
  }
})

test('out-of-range pages re-request the last valid server page', async () => {
  const pages = []
  const { api } = await load(async url => {
    const page = Number(new URL(url).searchParams.get('page')); pages.push(page)
    return response({ ...payload(), subscribers: page === 1 ? [subscriber()] : [], pagination: { total: 1, page, limit: 7, totalPages: 1 } })
  })
  assert.equal((await api.getSuperAdminSubscriptions({ page: 3 })).pagination.page, 1)
  assert.deepEqual(pages, [3, 1])
})
