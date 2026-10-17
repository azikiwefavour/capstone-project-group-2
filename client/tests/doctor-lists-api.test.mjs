import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'
import { filterAndSortPatients, getMedicationCount } from '../src/doctor/patients.js'

const sources = {}
for (const [name, path] of Object.entries({ session: 'auth/session', doctorSession: 'auth/doctorSession', api: 'doctor/api' })) {
  sources[name] = await readFile(new URL(`../src/${path}.js`, import.meta.url), 'utf8')
}
// Backend-contract fixtures are isolated to tests; never imported by application pages.
const jwt = (role = 'doctor', sub = 'doctor-fixture') => `test.${Buffer.from(JSON.stringify({ role, sub, exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')}.test`
const response = (body, status = 200) => new Response(JSON.stringify(body), { status })
const patient = { id: 'patient-fixture', name: 'Patient fixture', email: 'patient@example.test', phone: '123', age: 32, gender: 'Female', initials: 'PF', currentMedications: 2, currentMedicationsCount: 2 }
const clarification = { id: 'prescription-fixture', patientId: patient.id, patient: patient.name, sentBy: 'Pharmacist fixture', concern: 'Dose', status: 'Pending', rawStatus: 'awaiting_clarification', date: '17 Oct, 26, 10:30am', note: 'Contract test note', medicationName: 'Medication fixture', dosage: 'Test dose', frequency: 'Test frequency', duration: 'Test duration', reason: 'Test reason' }

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
  await modules.api.link(() => modules.doctorSession)
  await modules.api.evaluate()
  return { api: modules.api.namespace, doctor: modules.doctorSession.namespace, admin: modules.session.namespace, store }
}

test('both list endpoints use the configured base, existing Doctor token, and abort signal', async () => {
  const requests = []
  const { api, doctor, admin } = await load(async (url, options) => { requests.push({ url, ...options }); return response([]) }, { VITE_API_BASE_URL: 'http://api.example.test///' })
  const token = jwt()
  doctor.setDoctorAccessToken(token)
  admin.setAccessToken(jwt('admin'), 'admin')
  const controller = new AbortController()
  await api.getDoctorPatients(controller.signal)
  await api.getDoctorClarifications(controller.signal)
  assert.deepEqual(requests.map(r => r.url), ['http://api.example.test/api/doctor/patients', 'http://api.example.test/api/doctor/clarifications'])
  for (const request of requests) {
    assert.equal(request.method, 'GET')
    assert.equal(request.headers.Authorization, `Bearer ${token}`)
    assert.deepEqual(Object.keys(request.headers), ['Authorization'])
    assert.equal(request.cache, 'no-store')
    assert.equal(request.signal, controller.signal)
    assert.equal(request.body, undefined)
  }
})

test('patient adapter maps real counts without confusing them with medication record arrays', async () => {
  const { api, doctor } = await load(async () => response([{ ...patient, password: 'private-field', invitationToken: 'private-field' }]))
  doctor.setDoctorAccessToken(jwt())
  const [record] = await api.getDoctorPatients()
  assert.equal(record.id, patient.id)
  assert.equal(record.name, patient.name)
  assert.equal(record.age, patient.age)
  assert.equal(record.gender, patient.gender)
  assert.equal(getMedicationCount(record), 2)
  assert.equal(record.currentMedications, undefined)
  assert.equal(JSON.stringify(record).includes('private-field'), false)
})

test('zero and unknown counts stay distinct for searching, filtering and sorting', async () => {
  const { api, doctor } = await load(async () => response([
    { ...patient, id: 'b', name: 'Beta fixture' },
    { ...patient, id: 'a', name: 'Alpha fixture', currentMedicationsCount: 0 },
    { ...patient, id: 'c', name: 'Gamma fixture', currentMedicationsCount: '5' },
  ]))
  doctor.setDoctorAccessToken(jwt())
  const records = await api.getDoctorPatients()
  assert.equal(getMedicationCount(records[1]), 0)
  assert.equal(getMedicationCount(records[2]), null)
  assert.deepEqual(Array.from(filterAndSortPatients(records, ' ALPHA ', 'all', 'name-asc'), p => p.id), ['a'])
  assert.deepEqual(Array.from(filterAndSortPatients(records, '', 'with', 'name-asc'), p => p.id), ['b'])
  assert.deepEqual(Array.from(filterAndSortPatients(records, '', 'without', 'name-asc'), p => p.id), ['a'])
  assert.deepEqual(Array.from(filterAndSortPatients(records, '', 'all', 'medications-desc'), p => p.id), ['b', 'a', 'c'])
})

test('clarification mapping preserves backend date text, status, unique ID and selected prescription', async () => {
  const { api, doctor } = await load(async () => response([clarification]))
  doctor.setDoctorAccessToken(jwt())
  const [record] = await api.getDoctorClarifications()
  assert.equal(record.id, clarification.id)
  assert.equal(record.patient.id, clarification.patientId)
  assert.equal(record.patient.name, clarification.patient)
  assert.equal(record.sentBy, clarification.sentBy)
  assert.equal(record.status, clarification.status)
  assert.equal(record.rawStatus, clarification.rawStatus)
  assert.equal(record.dateLabel, clarification.date)
  assert.equal(record.date, clarification.date)
  assert.equal(record.prescription.id, clarification.id)
  assert.equal(record.prescription.name, clarification.medicationName)
  assert.equal(record.prescription.dose, clarification.dosage)
  assert.equal(record.prescription.reason, clarification.reason)
})

test('missing clarification fields remain unavailable instead of invented statuses or dates', async () => {
  const { api, doctor } = await load(async () => response([{ id: 'record-fixture' }]))
  doctor.setDoctorAccessToken(jwt())
  const [record] = await api.getDoctorClarifications()
  assert.equal(record.status, '')
  assert.equal(record.dateLabel, '')
  assert.equal(record.patient.name, '')
  assert.equal(record.sentBy, '')
  assert.equal(record.prescription.name, '')
})

test('successful empty lists remain empty, while invalid envelopes and IDs fail visibly', async () => {
  for (const method of ['getDoctorPatients', 'getDoctorClarifications']) {
    const { api, doctor } = await load(async () => response([]))
    doctor.setDoctorAccessToken(jwt())
    assert.equal((await api[method]()).length, 0)
    for (const data of [null, {}, { records: [] }, [{}], [null], [{ id: ' ' }], [{ id: 'same' }, { id: 'same' }]]) {
      const loaded = await load(async () => response(data))
      loaded.doctor.setDoctorAccessToken(jwt())
      await assert.rejects(loaded.api[method](), /unexpected record list/)
    }
  }
})

test('missing, malformed, expired and Admin-only sessions never request Doctor lists', async () => {
  let requests = 0
  const { api, doctor, admin } = await load(async () => { requests++; return response([]) })
  admin.setAccessToken(jwt('admin'), 'admin')
  for (const token of [null, 'invalid', `test.${Buffer.from(JSON.stringify({ sub: 'doctor-fixture', role: 'doctor', exp: 1 })).toString('base64url')}.test`]) {
    doctor.setDoctorAccessToken(token)
    for (const method of ['getDoctorPatients', 'getDoctorClarifications']) await assert.rejects(api[method](), /log in as a doctor/)
  }
  assert.equal(requests, 0)
})

test('401 clears only Doctor authentication, never the Admin session', async () => {
  for (const method of ['getDoctorPatients', 'getDoctorClarifications']) {
    const { api, doctor, admin, store } = await load(async () => response({ message: 'Expired session' }, 401))
    admin.setAccessToken(jwt('admin'), 'admin')
    const saved = store.getItem('medtrailAdminSession')
    doctor.setDoctorAccessToken(jwt())
    await assert.rejects(api[method](), /Expired session/)
    assert.equal(doctor.getDoctorAccessToken(), null)
    assert.equal(store.getItem('medtrailAdminSession'), saved)
  }
})

test('backend validation, permission and server errors are shown without discarding a valid session', async () => {
  for (const [status, body, message] of [[400, { message: ['Invalid request', 'Try again'] }, /Invalid request Try again/], [403, {}, /permission/], [404, { message: 'Endpoint unavailable' }, /Endpoint unavailable/], [503, {}, /Unable to load/]]) {
    const { api, doctor } = await load(async () => response(body, status))
    const token = jwt()
    doctor.setDoctorAccessToken(token)
    await assert.rejects(api.getDoctorPatients(), message)
    assert.equal(doctor.getDoctorAccessToken(), token)
  }
})

test('network failures are retryable without clearing authentication', async () => {
  let fail = true
  const { api, doctor } = await load(async () => { if (fail) throw Error('Offline'); return response([patient]) })
  doctor.setDoctorAccessToken(jwt())
  await assert.rejects(api.getDoctorPatients(), /check your connection/)
  assert.ok(doctor.getDoctorAccessToken())
  fail = false
  assert.equal((await api.getDoctorPatients()).length, 1)
})

test('late or cancelled list requests cannot publish records or invalidate a newer login', async () => {
  for (const method of ['getDoctorPatients', 'getDoctorClarifications']) {
    for (const action of ['abort', 'logout', 'new-login']) {
      let finish
      const { api, doctor } = await load(() => new Promise(resolve => { finish = resolve }))
      const token = jwt(), newer = jwt('doctor', 'new-doctor-fixture')
      doctor.setDoctorAccessToken(token)
      const controller = new AbortController()
      const pending = api[method](controller.signal)
      if (action === 'abort') controller.abort()
      if (action === 'logout') doctor.setDoctorAccessToken(null)
      if (action === 'new-login') doctor.setDoctorAccessToken(newer)
      finish(response({}, 401))
      await assert.rejects(pending, error => error.name === 'AbortError')
      assert.equal(doctor.getDoctorAccessToken(), action === 'logout' ? null : action === 'new-login' ? newer : token)
    }
  }
})
