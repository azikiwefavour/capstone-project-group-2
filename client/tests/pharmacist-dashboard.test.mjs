import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const sources = {}
for (const [name, path] of Object.entries({ session: 'auth/session', pharmacistSession: 'auth/pharmacistSession', api: 'pharmacist/api', dashboard: 'pharmacist/dashboard' })) {
  sources[name] = await readFile(new URL(`../src/${path}.js`, import.meta.url), 'utf8')
}
// Backend-contract fixtures stay in tests and are never imported by application pages.
const token = (role = 'pharmacist', sub = 'pharmacist-fixture', exp = Math.floor(Date.now() / 1000) + 600) => `test.${Buffer.from(JSON.stringify({ sub, role, exp })).toString('base64url')}.test`
const prescription = (id = 'rx-1', patientId = 'patient-1') => ({ id, patientId, patientName: 'Patient fixture', patientEmail: 'patient@example.test', status: 'pending', medicationName: 'Private medication', createdAt: '2026-10-19T10:00:00Z' })
const dashboard = () => ({ pharmacist: { id: 'pharmacist-fixture', name: 'Pharmacist fixture' }, stats: { total: 15, pending: 6, awaitingClarification: 3, dispensed: 4 }, recentPrescriptions: [prescription()] })
const response = (data, status = 200) => new Response(JSON.stringify(data), { status })

async function load(fetch, env = {}) {
  const entries = new Map()
  const store = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) }
  const context = vm.createContext({ fetch, sessionStorage: store, atob, Date, Error })
  const modules = {}
  for (const name of Object.keys(sources)) modules[name] = new vm.SourceTextModule(sources[name], { context, initializeImportMeta(meta) { meta.env = env } })
  await modules.session.link(() => { throw Error('Unexpected import') })
  await modules.session.evaluate()
  await modules.pharmacistSession.link(() => modules.session)
  await modules.pharmacistSession.evaluate()
  await modules.api.link(() => modules.pharmacistSession)
  await modules.api.evaluate()
  await modules.dashboard.link(specifier => specifier === './api' ? modules.api : modules.pharmacistSession)
  await modules.dashboard.evaluate()
  return { api: modules.dashboard.namespace, pharmacist: modules.pharmacistSession.namespace, admin: modules.session.namespace, store }
}

test('dashboard uses the existing pharmacy GET endpoint and only the Pharmacist bearer token', async () => {
  let request
  const { api, pharmacist, admin } = await load(async (url, options) => { request = { url, ...options }; return response(dashboard()) }, { VITE_API_BASE_URL: 'https://api.example.test///' })
  const jwt = token()
  pharmacist.setPharmacistAccessToken(jwt)
  admin.setAccessToken(token('admin'), 'admin')
  const controller = new AbortController()
  const result = await api.getPharmacistDashboard(controller.signal)
  assert.equal(request.url, 'https://api.example.test/api/pharmacy/dashboard')
  assert.equal(request.method, 'GET')
  assert.equal(request.headers.Authorization, `Bearer ${jwt}`)
  assert.equal(request.cache, 'no-store')
  assert.equal(request.signal, controller.signal)
  assert.equal(request.body, undefined)
  assert.equal(result.stats.awaitingClarification, 3)
  assert.equal(result.stats.dispensedMedications, 4)
})

test('missing, expired, Admin and Doctor sessions cannot request Pharmacist records', async () => {
  let calls = 0
  const { api, pharmacist, admin } = await load(async () => { calls++; return response(dashboard()) })
  admin.setAccessToken(token('admin'), 'admin')
  for (const candidate of [null, 'broken', token('doctor'), token('admin'), token('pharmacist', 'pharmacist-fixture', 1)]) {
    pharmacist.setPharmacistAccessToken(candidate)
    await assert.rejects(api.getPharmacistDashboard(), /log in as a pharmacist/)
  }
  assert.equal(calls, 0)
})

test('patient rows come only from recent prescriptions and are deduplicated in backend recency order', async () => {
  const body = dashboard()
  body.recentPrescriptions = [prescription('rx-1', 'patient-2'), prescription('rx-2', 'patient-1'), { ...prescription('rx-3', 'patient-2'), patientName: 'Older name', patientEmail: 'older@example.test' }]
  const { api, pharmacist } = await load(async () => response(body))
  pharmacist.setPharmacistAccessToken(token())
  const result = await api.getPharmacistDashboard()
  assert.deepEqual(Array.from(result.recentPatients, patient => patient.id), ['patient-2', 'patient-1'])
  assert.equal(result.recentPatients[0].name, 'Patient fixture')
  assert.equal(result.recentPatients[0].email, 'patient@example.test')
  assert.equal(JSON.stringify(result).includes('Private medication'), false)
  assert.equal(result.recentPatients[0].status, undefined)
})

test('unavailable verified count and activity feed are never inferred from unrelated fields', async () => {
  const { api, pharmacist } = await load(async () => response(dashboard()))
  pharmacist.setPharmacistAccessToken(token())
  const result = await api.getPharmacistDashboard()
  assert.equal(result.stats.verifiedPrescriptions, null)
  assert.equal(result.recentActivities, null)
})

test('zero counts and empty patient records stay empty, with no invented data', async () => {
  const { api, pharmacist } = await load(async () => response({ ...dashboard(), stats: { total: 0, pending: 0, awaitingClarification: 0, dispensed: 0 }, recentPrescriptions: [] }))
  pharmacist.setPharmacistAccessToken(token())
  const result = await api.getPharmacistDashboard()
  assert.equal(result.stats.awaitingClarification, 0)
  assert.equal(result.stats.dispensedMedications, 0)
  assert.equal(result.recentPatients.length, 0)
  assert.equal(result.recentActivities, null)
})

test('wrong identities, malformed statistics, and malformed prescription lists fail visibly', async () => {
  for (const body of [null, {}, { ...dashboard(), pharmacist: { id: 'another-pharmacist' } }, { ...dashboard(), stats: { awaitingClarification: '3', dispensed: 4 } }, { ...dashboard(), stats: { awaitingClarification: -1, dispensed: 0 } }, { ...dashboard(), recentPrescriptions: null }, { ...dashboard(), recentPrescriptions: [{ id: 'missing-patient' }] }, { ...dashboard(), recentPrescriptions: [prescription(), prescription()] }]) {
    const { api, pharmacist } = await load(async () => response(body))
    pharmacist.setPharmacistAccessToken(token())
    await assert.rejects(api.getPharmacistDashboard(), /unexpected dashboard/)
  }
})

test('401 clears only the Pharmacist session; other backend errors preserve it', async () => {
  for (const status of [401, 403, 404, 503]) {
    const { api, pharmacist, admin, store } = await load(async () => response({ message: ['Dashboard unavailable'] }, status))
    const jwt = token()
    pharmacist.setPharmacistAccessToken(jwt)
    admin.setAccessToken(token('admin'), 'admin')
    const savedAdmin = store.getItem('medtrailAdminSession')
    await assert.rejects(api.getPharmacistDashboard(), /Dashboard unavailable/)
    assert.equal(pharmacist.getPharmacistAccessToken(), status === 401 ? null : jwt)
    assert.equal(store.getItem('medtrailAdminSession'), savedAdmin)
  }
})

test('network failures preserve a candidate Pharmacist session for retry', async () => {
  const { api, pharmacist } = await load(async () => { throw Error('Offline') })
  const jwt = token()
  pharmacist.setPharmacistAccessToken(jwt)
  await assert.rejects(api.getPharmacistDashboard(), /check your connection/)
  assert.equal(pharmacist.getPharmacistAccessToken(), jwt)
})

test('aborted and logged-out responses cannot publish patient records or clear a newer session', async () => {
  for (const action of ['abort', 'logout', 'new-login']) {
    let finish
    const { api, pharmacist } = await load(() => new Promise(resolve => { finish = resolve }))
    const jwt = token()
    const newer = token('pharmacist', 'new-pharmacist')
    pharmacist.setPharmacistAccessToken(jwt)
    const controller = new AbortController()
    const pending = api.getPharmacistDashboard(controller.signal)
    if (action === 'abort') controller.abort()
    else pharmacist.setPharmacistAccessToken(action === 'logout' ? null : newer)
    finish(response({}, 401))
    await assert.rejects(pending, error => error.name === 'AbortError')
    assert.equal(pharmacist.getPharmacistAccessToken(), action === 'logout' ? null : action === 'new-login' ? newer : jwt)
  }
})
