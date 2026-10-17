import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const paths = { session: 'auth/session', doctorSession: 'auth/doctorSession', api: 'doctor/api', medicationForm: 'doctor/components/medicationForm', medicationDuplicates: 'doctor/components/medicationDuplicates', prescriptions: 'doctor/prescriptions', clarificationApi: 'doctor/clarificationApi' }
const sources = {}
for (const [name, path] of Object.entries(paths)) sources[name] = await readFile(new URL(`../src/${path}.js`, import.meta.url), 'utf8')
// Test-only contracts; these fixtures never reach the real API or database.
const patientId = '11111111-1111-4111-8111-111111111111', rxId = '22222222-2222-4222-8222-222222222222'
const jwt = role => `test.${Buffer.from(JSON.stringify({ sub: 'doctor-fixture', role, exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')}.test`
const values = { medication: 'Contract medication', dose: 'Contract dose', frequency: 'Once daily', duration: '7 days', reason: 'Original clinical reason' }
const patient = { id: patientId, name: 'Patient fixture', age: 30, gender: 'Female', currentMedicationsCount: 1 }
const rx = { id: rxId, medicationName: values.medication, dosage: values.dose, frequency: values.frequency, duration: values.duration, reason: values.reason, status: 'active', createdAt: '2026-10-17T08:30:00Z' }
const listed = { id: rxId, patientId, patient: patient.name, status: 'Pending', rawStatus: 'awaiting_clarification' }
const details = { patient, clarification: { id: rxId, sentBy: 'Pharmacist fixture', concern: 'Dose', note: 'Contract note', submittedOn: '17 Oct, 26, 10:30am' }, prescription: { ...rx, status: 'awaiting_clarification' } }
const response = (body, status = 200) => new Response(JSON.stringify(body), { status })

async function load(overrides = {}) {
  const requests = [], entries = new Map()
  const store = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) }
  const fetch = async (url, options) => {
    requests.push({ url, ...options })
    if (options.method !== 'GET') {
      if (overrides.write) return overrides.write(url, options)
      return response({ message: 'Confirmed backend action', prescription: { id: rxId, patientId, status: url.endsWith('/discontinue') ? 'discontinued' : url.includes('/clarifications/') ? 'clarified' : 'active' } })
    }
    if (url.endsWith('/patients')) return response(overrides.patients ?? [patient])
    if (url.endsWith(`/patients/${patientId}`)) return response(overrides.patientDetails ?? { patient, currentMedications: [rx], medicationHistory: [] })
    if (url.endsWith('/clarifications')) return response(overrides.pending ?? [listed])
    if (url.endsWith(`/clarifications/${rxId}`)) return response(overrides.details ?? details)
    throw Error('Unexpected test endpoint')
  }
  const context = vm.createContext({ sessionStorage: store, fetch, atob, Date, Error })
  const modules = {}
  for (const name of Object.keys(paths)) modules[name] = new vm.SourceTextModule(sources[name], { context, initializeImportMeta(meta) { meta.env = {} } })
  for (const name of ['session', 'medicationForm', 'medicationDuplicates']) { await modules[name].link(() => { throw Error('Unexpected import') }); await modules[name].evaluate() }
  await modules.doctorSession.link(() => modules.session); await modules.doctorSession.evaluate()
  await modules.api.link(() => modules.doctorSession); await modules.api.evaluate()
  await modules.prescriptions.link(specifier => modules[specifier.split('/').at(-1)]); await modules.prescriptions.evaluate()
  await modules.clarificationApi.link(specifier => modules[specifier.split('/').at(-1)]); await modules.clarificationApi.evaluate()
  modules.doctorSession.namespace.setDoctorAccessToken(jwt('doctor'))
  return { prescriptions: modules.prescriptions.namespace, clarifications: modules.clarificationApi.namespace, doctor: modules.doctorSession.namespace, admin: modules.session.namespace, store, requests }
}

test('clarification details load by ID and retain actual patient, prescription and backend date', async () => {
  const { clarifications, requests } = await load()
  const record = await clarifications.getDoctorClarificationDetails(rxId)
  assert.equal(record.id, rxId)
  assert.equal(record.patient.id, patientId)
  assert.equal(record.patient.age, 30)
  assert.equal(record.prescription.id, rxId)
  assert.equal(record.prescription.name, values.medication)
  assert.equal(record.dateLabel, details.clarification.submittedOn)
  assert.equal(record.rawStatus, 'awaiting_clarification')
  assert.deepEqual(requests.map(r => r.url), ['http://localhost:3000/api/doctor/clarifications', `http://localhost:3000/api/doctor/clarifications/${rxId}`])
})

test('unknown, resolved and mismatched clarifications cannot load or authorize a response', async () => {
  const invalid = await load()
  await assert.rejects(invalid.clarifications.getDoctorClarificationDetails('preview'), /valid clarification/)
  assert.equal(invalid.requests.length, 0)
  const missing = await load({ pending: [] })
  await assert.rejects(missing.clarifications.confirmDoctorClarification(rxId, ''), /no longer pending/)
  assert.equal(missing.requests.some(r => r.method !== 'GET'), false)
  for (const data of [{ ...details, patient: { id: 'different' } }, { ...details, clarification: { id: 'different' } }, { ...details, prescription: { ...rx, status: 'clarified' } }]) {
    const { clarifications } = await load({ details: data })
    await assert.rejects(clarifications.getDoctorClarificationDetails(rxId), /could not be verified/)
  }
})

test('confirmation sends only the optional note and requires a backend-confirmed clarified result', async () => {
  for (const note of ['', '  Contract response  ']) {
    const { clarifications, requests } = await load()
    const result = await clarifications.confirmDoctorClarification(rxId, note)
    const request = requests.at(-1)
    assert.equal(request.url, `http://localhost:3000/api/doctor/clarifications/${rxId}/confirm`)
    assert.equal(request.method, 'POST')
    assert.deepEqual(JSON.parse(request.body), note ? { noteToPharmacist: note.trim() } : {})
    assert.equal(result.message, 'Confirmed backend action')
    assert.equal(request.headers.Authorization, `Bearer ${jwt('doctor')}`)
  }
})

test('clarification modification uses its own PATCH endpoint and supports unchanged legacy dropdown values', async () => {
  const { clarifications, requests } = await load({ details: { ...details, prescription: { ...details.prescription, frequency: '3 times daily' } } })
  await clarifications.modifyDoctorClarification(rxId, { ...values, dose: 'Edited dose', frequency: '3 times daily' })
  const request = requests.at(-1)
  assert.equal(request.url, `http://localhost:3000/api/doctor/clarifications/${rxId}/modify`)
  assert.equal(request.method, 'PATCH')
  assert.deepEqual(JSON.parse(request.body), { medicationName: values.medication, dosage: 'Edited dose', frequency: '3 times daily', duration: values.duration, reason: values.reason })
})

test('current medication modification targets only the selected prescription and excludes itself from duplicate checks', async () => {
  const { prescriptions, requests } = await load()
  await prescriptions.modifyDoctorPrescription(patientId, rxId, values)
  assert.equal(requests.at(-1).method, 'PATCH')
  assert.equal(requests.at(-1).url, `http://localhost:3000/api/doctor/prescriptions/${rxId}`)
  const missing = await load()
  await assert.rejects(missing.prescriptions.modifyDoctorPrescription(patientId, 'different-id', values), /no longer a current medication/)
  assert.equal(missing.requests.some(r => r.method !== 'GET'), false)
})

test('modification cannot create an exact duplicate of another current prescription', async () => {
  const { prescriptions, requests } = await load({ patientDetails: { patient, currentMedications: [rx, { ...rx, id: 'other-prescription' }], medicationHistory: [] } })
  await assert.rejects(prescriptions.modifyDoctorPrescription(patientId, rxId, values), /duplicate check/)
  assert.equal(requests.some(r => r.method !== 'GET'), false)
})

test('discontinuation sends a separate required reason without replacing the original prescription reason', async () => {
  const { prescriptions, requests } = await load()
  await assert.rejects(prescriptions.discontinueDoctorPrescription(patientId, rxId, ' '), /reason/)
  assert.equal(requests.length, 0)
  await prescriptions.discontinueDoctorPrescription(patientId, rxId, '  New discontinuation reason  ')
  const request = requests.at(-1)
  assert.equal(request.method, 'POST')
  assert.equal(request.url, `http://localhost:3000/api/doctor/prescriptions/${rxId}/discontinue`)
  assert.deepEqual(JSON.parse(request.body), { reason: 'New discontinuation reason' })
  assert.equal(rx.reason, 'Original clinical reason')
})

test('validation failures do not report confirmation or discard legitimate authentication', async () => {
  const { clarifications, doctor } = await load({ write: () => response({ message: 'Response rejected' }, 400) })
  await assert.rejects(clarifications.confirmDoctorClarification(rxId, 'note'), /Response rejected/)
  assert.ok(doctor.getDoctorAccessToken())
})

test('wrong identities, statuses and lost write responses never report success or auto-retry', async () => {
  for (const write of [() => response({ prescription: { id: 'wrong', patientId, status: 'clarified' } }), () => response({ prescription: { id: rxId, patientId, status: 'pending' } }), () => response({}, 500), () => { throw Error('Offline') }]) {
    const { clarifications, requests } = await load({ write })
    await assert.rejects(clarifications.confirmDoctorClarification(rxId, ''), error => error.saveUncertain === true)
    assert.equal(requests.filter(r => r.method !== 'GET').length, 1)
  }
})

test('401 during a response clears only the Doctor session', async () => {
  const { clarifications, doctor, admin, store } = await load({ write: () => response({ message: 'Expired session' }, 401) })
  admin.setAccessToken(jwt('admin'), 'admin')
  const saved = store.getItem('medtrailAdminSession')
  await assert.rejects(clarifications.confirmDoctorClarification(rxId, ''), /Expired session/)
  assert.equal(doctor.getDoctorAccessToken(), null)
  assert.equal(store.getItem('medtrailAdminSession'), saved)
})
