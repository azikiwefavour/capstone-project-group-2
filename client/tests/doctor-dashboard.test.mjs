import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const sources = {}
for (const [name, path] of Object.entries({ session: 'auth/session', doctorSession: 'auth/doctorSession', dashboard: 'doctor/dashboard' })) {
  sources[name] = await readFile(new URL(`../src/${path}.js`, import.meta.url), 'utf8')
}
// Isolated backend-contract fixtures only; never included in application data or authentication.
const token = (role = 'doctor', sub = 'doctor-fixture') => `test.${Buffer.from(JSON.stringify({ sub, role, exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')}.test`
const dashboard = () => ({
  doctor: { id: 'doctor-fixture', name: 'Contract fixture', role: 'doctor' },
  stats: { patients: 3, awaitingClarification: 1, prescriptions: 5 },
  recentPatients: [{ id: 'patient-fixture', name: 'Patient fixture', email: 'patient@example.test', initials: 'PF', lastPrescription: { date: '2026-10-17T09:30:00Z', formattedDate: 'Do not use server-local formatted dates' }, password: 'must-not-retain' }],
  recentActivities: [{ id: 'activity-fixture', description: 'Contract fixture activity', createdAt: '2026-10-17T09:30:00Z', privateField: 'must-not-retain' }],
})
const response = (body, status = 200) => new Response(JSON.stringify(body), { status })

async function load(fetch, env = {}) {
  const entries = new Map()
  const store = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) }
  const context = vm.createContext({ sessionStorage: store, fetch, atob, Date, Error })
  const modules = {}
  for (const name of Object.keys(sources)) modules[name] = new vm.SourceTextModule(sources[name], { context, initializeImportMeta(meta) { meta.env = env } })
  await modules.session.link(() => { throw Error('Unexpected import') })
  await modules.session.evaluate()
  await modules.doctorSession.link(() => modules.session)
  await modules.doctorSession.evaluate()
  await modules.dashboard.link(() => modules.doctorSession)
  await modules.dashboard.evaluate()
  return { api: modules.dashboard.namespace, doctor: modules.doctorSession.namespace, admin: modules.session.namespace, store }
}

test('dashboard sends only the Doctor bearer token to the configured GET endpoint', async () => {
  let request
  const { api, doctor, admin } = await load(async (url, options) => { request = { url, ...options }; return response(dashboard()) }, { VITE_API_BASE_URL: 'http://api.example.test///' })
  admin.setAccessToken(token('admin'), 'admin')
  doctor.setDoctorAccessToken(token())
  const controller = new AbortController()
  const result = await api.getDoctorDashboard(controller.signal)
  assert.equal(request.url, 'http://api.example.test/api/doctor/dashboard')
  assert.equal(request.method, 'GET')
  assert.equal(request.headers.Authorization, `Bearer ${token()}`)
  assert.deepEqual(Object.keys(request.headers), ['Authorization'])
  assert.equal(request.body, undefined)
  assert.equal(request.cache, 'no-store')
  assert.equal(request.signal, controller.signal)
  assert.deepEqual(JSON.parse(JSON.stringify(result.stats)), dashboard().stats)
  assert.equal(result.recentPatients[0].id, 'patient-fixture')
  assert.equal(result.recentPatients[0].lastPrescription.date, '2026-10-17T09:30:00Z')
  assert.equal(result.recentActivities[0].description, 'Contract fixture activity')
  assert.equal(result.recentActivities[0].createdAt, '2026-10-17T09:30:00Z')
  assert.equal(JSON.stringify(result).includes('must-not-retain'), false)
  assert.equal(JSON.stringify(result).includes('Do not use'), false)
})

test('missing, expired, and Admin-only sessions never send a Doctor dashboard request', async () => {
  let requests = 0
  const { api, doctor, admin } = await load(async () => { requests++; return response(dashboard()) })
  admin.setAccessToken(token('admin'), 'admin')
  await assert.rejects(api.getDoctorDashboard(), /log in as a doctor/)
  doctor.setDoctorAccessToken('invalid-token')
  await assert.rejects(api.getDoctorDashboard(), /log in as a doctor/)
  doctor.setDoctorAccessToken(`test.${Buffer.from(JSON.stringify({ sub: 'doctor-fixture', role: 'doctor', exp: 1 })).toString('base64url')}.test`)
  await assert.rejects(api.getDoctorDashboard(), /log in as a doctor/)
  assert.equal(requests, 0)
})

test('successful empty dashboards preserve actual zero counts and empty arrays', async () => {
  const body = { ...dashboard(), stats: { patients: 0, awaitingClarification: 0, prescriptions: 0 }, recentPatients: [], recentActivities: [] }
  const { api, doctor } = await load(async () => response(body))
  doctor.setDoctorAccessToken(token())
  const result = await api.getDoctorDashboard()
  assert.equal(result.stats.patients, 0)
  assert.equal(result.recentPatients.length, 0)
  assert.equal(result.recentActivities.length, 0)
})

test('unexpected response shapes fail rather than fabricating counts or empty lists', async () => {
  for (const body of [null, {}, { ...dashboard(), doctor: { id: 'admin', role: 'admin' } }, { ...dashboard(), stats: { patients: '3', awaitingClarification: 1, prescriptions: 5 } }, { ...dashboard(), stats: { patients: -1, awaitingClarification: 1, prescriptions: 5 } }, { ...dashboard(), recentPatients: null }, { ...dashboard(), recentPatients: [{ name: 'Missing ID' }] }, { ...dashboard(), recentActivities: [{}] }]) {
    const { api, doctor } = await load(async () => response(body))
    doctor.setDoctorAccessToken(token())
    await assert.rejects(api.getDoctorDashboard(), /unexpected dashboard response/)
    assert.ok(doctor.getDoctorAccessToken())
  }
})

test('missing dates are not replaced by the current time', async () => {
  const body = { ...dashboard(), recentPatients: [{ id: 'patient-fixture', lastPrescription: null }], recentActivities: [{ id: 'activity-fixture' }] }
  const { api, doctor } = await load(async () => response(body))
  doctor.setDoctorAccessToken(token())
  const result = await api.getDoctorDashboard()
  assert.equal(result.recentPatients[0].lastPrescription, null)
  assert.equal(result.recentActivities[0].createdAt, undefined)
})

test('401 clears only the current Doctor session, never the Admin session', async () => {
  const { api, doctor, admin, store } = await load(async () => response({ message: 'Session expired' }, 401))
  admin.setAccessToken(token('admin'), 'admin')
  const saved = store.getItem('medtrailAdminSession')
  doctor.setDoctorAccessToken(token())
  await assert.rejects(api.getDoctorDashboard(), /Session expired/)
  assert.equal(doctor.getDoctorAccessToken(), null)
  assert.equal(store.getItem('medtrailAdminSession'), saved)
})

test('403, unavailable endpoint, validation and server errors preserve the candidate session', async () => {
  for (const [status, body, message] of [[403, {}, /permission/], [404, { message: 'Cannot GET /api/doctor/dashboard' }, /not available/], [400, { message: ['First error', 'Second error'] }, /First error Second error/], [503, {}, /Unable to load/]]) {
    const { api, doctor } = await load(async () => response(body, status))
    doctor.setDoctorAccessToken(token())
    await assert.rejects(api.getDoctorDashboard(), message)
    assert.equal(doctor.getDoctorAccessToken(), token())
  }
})

test('network errors are retryable and do not log the Doctor out', async () => {
  const { api, doctor } = await load(async () => { throw Error('Offline') })
  doctor.setDoctorAccessToken(token())
  await assert.rejects(api.getDoctorDashboard(), /check your connection/)
  assert.ok(doctor.getDoctorAccessToken())
})

test('cancelled, logged-out and stale requests cannot publish data or invalidate a newer session', async () => {
  for (const action of ['abort', 'logout', 'new-login']) {
    let finish
    const { api, doctor } = await load(() => new Promise(resolve => { finish = resolve }))
    doctor.setDoctorAccessToken(token())
    const controller = new AbortController()
    const pending = api.getDoctorDashboard(controller.signal)
    const newer = token('doctor', 'new-doctor-fixture')
    if (action === 'abort') controller.abort()
    if (action === 'logout') doctor.setDoctorAccessToken(null)
    if (action === 'new-login') doctor.setDoctorAccessToken(newer)
    finish(response({}, 401))
    await assert.rejects(pending, error => error.name === 'AbortError')
    assert.equal(doctor.getDoctorAccessToken(), action === 'logout' ? null : action === 'new-login' ? newer : token())
  }
})

test('cancellation before starting or during response parsing never publishes data', async () => {
  let requests = 0, finish, parseStarted
  const started = new Promise(resolve => { parseStarted = resolve })
  const { api, doctor } = await load(async () => { requests++; return { ok: true, json: () => new Promise(resolve => { finish = resolve; parseStarted() }) } })
  doctor.setDoctorAccessToken(token())
  const aborted = new AbortController()
  aborted.abort()
  await assert.rejects(api.getDoctorDashboard(aborted.signal), error => error.name === 'AbortError')
  assert.equal(requests, 0)
  const controller = new AbortController()
  const pending = api.getDoctorDashboard(controller.signal)
  await started
  controller.abort()
  finish(dashboard())
  await assert.rejects(pending, error => error.name === 'AbortError')
})
