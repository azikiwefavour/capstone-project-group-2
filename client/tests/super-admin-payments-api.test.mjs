import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { mapPaymentsResponse, parsePaymentsCsv, verifiedPaymentsCsv, formatPaymentAmount } from '../src/super-admin/paymentsResponse.js'

const transaction = (id = 'isolated') => ({ id, reference: 'rewritten-display', fullReference: `PSK_${id}`, facility: 'Isolated hospital', facilityShort: 'Wrong short name', amount: 12345.67, channel: 'Card', gateway: 'Paystack', rawDate: '2099-11-02T12:34:56Z', date: 'Wrong display date', rawStatus: 'successful', status: 'Wrong display status', customerEmail: 'private' })
const payload = (limit = 7) => ({ transactions: [transaction()], pagination: { total: 1, page: 1, limit, totalPages: 1 }, counts: { all: 99, failed: 0 }, summary: { collectedLast90Days: { amount: 1500000 }, pendingSettlement: { amount: 70000 }, failedCharges: { count: 2 } } })
const csvHeader = 'Reference,Facility,Amount (NGN),Channel,Gateway,Date,Status,Status Reason,Plan,Billing Cycle,Retries'
const backendCsv = (reference = 'PSK_isolated') => `${csvHeader}\r\n"${reference}","Isolated hospital",12345.67,"Card","Paystack","02 Nov 2099","Successful","Fallback reason","Growth","Monthly",0`

test('maps full reference/name, actual decimal amount, raw UTC date and raw status, discarding private/default fields', () => {
  const input = payload(), before = structuredClone(input), result = mapPaymentsResponse(input)
  assert.deepEqual(result.records[0], { id: 'isolated', reference: 'PSK_isolated', facilityName: 'Isolated hospital', amount: 12345.67, channel: 'Card', gateway: 'Paystack', date: '2099-11-02', status: 'successful' })
  assert.equal(JSON.stringify(result).includes('private'), false)
  assert.deepEqual(input, before)
})

test('ambiguous monetary totals remain unavailable; direct failed count preserves zero, never uses summary fallback', () => {
  for (const value of [0, 2, 123456]) {
    const input = payload(); input.summary.collectedLast90Days.amount = value; input.summary.pendingSettlement.amount = value; input.summary.failedCharges.count = value
    input.counts.failed = value
    assert.deepEqual(mapPaymentsResponse(input).summary, { collectedLast90Days: null, pendingSettlement: null, failedCharges: value })
  }
  const input = payload(); delete input.counts
  assert.equal(mapPaymentsResponse(input).summary.failedCharges, null)
})

test('raw dates validate calendars and timezone, unknown fields remain unknown, not fabricated zeroes', () => {
  for (const rawDate of [null, 'bad', '2026-02-31T12:00:00Z', '2026-10-28T12:00:00']) {
    const input = payload(); input.transactions[0].rawDate = rawDate
    assert.equal(mapPaymentsResponse(input).records[0].date, null)
  }
  const input = payload(); Object.assign(input.transactions[0], { rawDate: '2099-11-02T00:30:00+02:00', amount: '123', channel: null, rawStatus: 'unknown' })
  const record = mapPaymentsResponse(input).records[0]
  assert.equal(record.date, '2099-11-01'); assert.equal(record.amount, null); assert.equal(record.channel, null); assert.equal(record.status, null)
})

test('empty list retains valid pagination and invalid/duplicate collections fail explicitly', () => {
  const empty = payload(); empty.transactions = []; empty.pagination = { total: 0, page: 1, limit: 7, totalPages: 1 }
  assert.equal(mapPaymentsResponse(empty).status, 'empty')
  assert.equal(mapPaymentsResponse(empty).pagination.totalPages, 1)
  for (const value of [null, {}, { ...payload(), transactions: null }, { ...payload(), transactions: [{}] }, { ...payload(), pagination: { total: -1 } }]) assert.throws(() => mapPaymentsResponse(value))
  const duplicate = payload(); duplicate.transactions = [transaction(), transaction()]; duplicate.pagination.total = 2
  assert.throws(() => mapPaymentsResponse(duplicate), /duplicate/)
  const distinct = payload(); distinct.transactions = [transaction('one'), transaction('two')]; distinct.pagination.total = 2
  assert.equal(mapPaymentsResponse(distinct).records.length, 2)
})

test('CSV parser handles quoted commas/newlines/escaped quotes and rejects malformed content', () => {
  assert.deepEqual(parsePaymentsCsv('\uFEFFa,b\r\n"comma, name","line\nwith ""quotes"""\r\n'), [['a', 'b'], ['comma, name', 'line\nwith "quotes"']])
  for (const value of ['"unfinished', 'a"bad,b', '"a"bad,b']) assert.throws(() => parsePaymentsCsv(value), /invalid/)
})

test('CSV downloads only seven fields verified against raw records, omitting backend synthetic extras', () => {
  const csv = verifiedPaymentsCsv(backendCsv(), mapPaymentsResponse(payload()).records)
  assert.equal(parsePaymentsCsv(csv)[0].length, 7)
  assert.equal(parsePaymentsCsv(csv)[1][0], 'PSK_isolated')
  assert.equal(csv.includes('Fallback reason'), false)
  assert.equal(csv.includes('Growth'), false)
})

test('CSV altered references, partial/duplicate results, missing fields and mismatched amounts cannot download', () => {
  const records = mapPaymentsResponse(payload()).records
  for (const csv of [csvHeader, backendCsv('rewritten-display'), backendCsv().replace('12345.67', '99999'), backendCsv() + '\r\n' + backendCsv().split('\r\n')[1]]) assert.throws(() => verifiedPaymentsCsv(csv, records))
  assert.throws(() => verifiedPaymentsCsv(backendCsv(), [{ ...records[0], date: null }]), /unavailable/)
  assert.equal(parsePaymentsCsv(verifiedPaymentsCsv(csvHeader, [])).length, 1)
})

test('verified CSV safely quotes names and neutralizes spreadsheet formulas', () => {
  const records = mapPaymentsResponse(payload()).records
  const name = '=HYPERLINK("test")'
  records[0].facilityName = name
  const csv = backendCsv().replace('"Isolated hospital"', '"=HYPERLINK(""test"")"')
  assert.equal(parsePaymentsCsv(verifiedPaymentsCsv(csv, records))[1][1], `'${name}`)
})

const source = await readFile(new URL('../src/super-admin/paymentsApi.js', import.meta.url), 'utf8')
async function load(fetch) {
  let token = 'isolated-token', cleared = 0
  const context = vm.createContext({ fetch, Error, DOMException, URLSearchParams })
  const auth = new vm.SyntheticModule(['getSuperAdminAccessToken', 'setSuperAdminAccessToken'], function () {
    this.setExport('getSuperAdminAccessToken', () => token)
    this.setExport('setSuperAdminAccessToken', value => { token = value; cleared++ })
  }, { context })
  const mapper = new vm.SyntheticModule(['mapPaymentsResponse', 'verifiedPaymentsCsv'], function () {
    this.setExport('mapPaymentsResponse', mapPaymentsResponse); this.setExport('verifiedPaymentsCsv', verifiedPaymentsCsv)
  }, { context })
  const module = new vm.SourceTextModule(source, { context, initializeImportMeta(meta) { meta.env = { VITE_API_BASE_URL: 'https://api.example.test///' } } })
  await module.link(name => name === './authentication' ? auth : mapper)
  await module.evaluate()
  return { api: module.namespace, setToken(value) { token = value }, current: () => token, cleared: () => cleared }
}
const response = (body, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status })
const csvResponse = csv => new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8' } })

test('registered /api route, filters/sort, seven rows, Bearer token, cancellation, no-store and GET only', async () => {
  let request
  const controller = new AbortController(), { api } = await load(async (url, options) => { request = { url, ...options }; return response(payload()) })
  await api.getSuperAdminPayments({ search: '  hospital & card  ', status: 'failed', channel: 'Bank Transfer', gateway: 'Paystack', sortBy: 'amount', sortOrder: 'ASC' }, controller.signal)
  const url = new URL(request.url)
  assert.equal(url.pathname, '/api/super-admin/payments')
  for (const [key, value] of Object.entries({ search: 'hospital & card', status: 'failed', channel: 'Bank Transfer', gateway: 'Paystack', sortBy: 'amount', sortOrder: 'ASC', limit: '7', page: '1' })) assert.equal(url.searchParams.get(key), value)
  assert.equal(request.headers.Authorization, 'Bearer isolated-token'); assert.equal(request.signal, controller.signal); assert.equal(request.cache, 'no-store'); assert.equal(request.method, 'GET'); assert.equal(request.body, undefined)
})

for (const status of [401, 403, 500]) test(`HTTP ${status} safely handles list and export session rejection`, async () => {
  for (const exporting of [false, true]) {
    const session = await load(async url => exporting && !url.includes('/export') ? response(payload(100)) : response({ message: 'private-backend-error' }, status))
    await assert.rejects(exporting ? session.api.exportSuperAdminPayments() : session.api.getSuperAdminPayments(), error => !error.message.includes('private-backend-error'))
    assert.equal(session.cleared(), status === 500 ? 0 : 1)
  }
})

test('CSV export rechecks the filtered full set and sends only supported filters to export', async () => {
  const requests = []
  const { api } = await load(async (url, options) => {
    requests.push({ url, ...options })
    return url.includes('/export') ? csvResponse(backendCsv()) : response(payload(100))
  })
  const csv = await api.exportSuperAdminPayments({ search: 'test', status: 'successful', channel: 'Card', gateway: 'Paystack', sortBy: 'amount', sortOrder: 'ASC', page: 4 })
  assert.equal(parsePaymentsCsv(csv).length, 2)
  const list = new URL(requests[0].url), exportUrl = new URL(requests[1].url)
  assert.equal(list.searchParams.get('limit'), '100'); assert.equal(list.searchParams.get('page'), '1'); assert.equal(list.searchParams.get('sortBy'), 'date')
  assert.equal(exportUrl.pathname, '/api/super-admin/payments/export')
  assert.deepEqual([...exportUrl.searchParams.keys()], ['search', 'status', 'channel', 'gateway'])
  assert.ok(requests.every(request => request.method === 'GET' && !request.body))
})

test('CSV export refuses silent 100-row truncation, wrong content type and altered references', async () => {
  let csvCalls = 0
  const capped = await load(async url => {
    if (url.includes('/export')) { csvCalls++; return csvResponse(backendCsv()) }
    return response({ ...payload(100), pagination: { total: 101, page: 1, limit: 100, totalPages: 2 } })
  })
  await assert.rejects(capped.api.exportSuperAdminPayments(), /at most 100/); assert.equal(csvCalls, 0)
  for (const output of [response({ error: 'secret' }), csvResponse(backendCsv('altered'))]) {
    const session = await load(async url => url.includes('/export') ? output : response(payload(100)))
    await assert.rejects(session.api.exportSuperAdminPayments())
  }
})

test('stale list and CSV responses cannot clear a newer session or publish a download', async () => {
  for (const exporting of [false, true]) for (const status of [200, 401]) {
    let finish
    const session = await load(url => exporting && !url.includes('/export') ? Promise.resolve(response(payload(100))) : new Promise(resolve => { finish = resolve }))
    const pending = exporting ? session.api.exportSuperAdminPayments() : session.api.getSuperAdminPayments()
    while (!finish) await new Promise(resolve => setTimeout(resolve, 0))
    session.setToken('new-token'); finish(exporting && status === 200 ? csvResponse(backendCsv()) : response(payload(), status))
    await assert.rejects(pending, { name: 'AbortError' })
    assert.equal(session.current(), 'new-token'); assert.equal(session.cleared(), 0)
  }
})

test('no auth, abort, offline, malformed JSON and empty success are handled safely', async () => {
  const missing = await load(() => { throw Error('must not fetch') }); missing.setToken(null)
  await assert.rejects(missing.api.getSuperAdminPayments(), /log in/)
  const controller = new AbortController(); controller.abort()
  const aborted = await load(() => { throw Error('must not fetch') })
  await assert.rejects(aborted.api.getSuperAdminPayments({}, controller.signal), { name: 'AbortError' })
  for (const fetch of [async () => { throw Error('offline') }, async () => new Response('{'), async () => response(null, 204)]) {
    const session = await load(fetch); await assert.rejects(session.api.getSuperAdminPayments())
  }
})

test('out-of-range server pagination re-requests the last valid page', async () => {
  const pages = []
  const { api } = await load(async url => {
    const page = Number(new URL(url).searchParams.get('page')); pages.push(page)
    return response({ ...payload(), transactions: page === 1 ? [transaction()] : [], pagination: { total: 1, page, limit: 7, totalPages: 1 } })
  })
  assert.equal((await api.getSuperAdminPayments({ page: 3 })).pagination.page, 1)
  assert.deepEqual(pages, [3, 1])
})

test('payment amounts retain kobo without adding decimals to whole-naira values', () => {
  assert.equal(formatPaymentAmount(12345.67), '₦12,345.67')
  assert.equal(formatPaymentAmount(70000), '₦70,000')
})
