import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const paths = { session: 'auth/session', doctorSession: 'auth/doctorSession', api: 'doctor/api', medicationForm: 'doctor/components/medicationForm', medicationDuplicates: 'doctor/components/medicationDuplicates', prescriptions: 'doctor/prescriptions' }
const sources = {}
for (const [name, path] of Object.entries(paths)) sources[name] = await readFile(new URL(`../src/${path}.js`, import.meta.url), 'utf8')
// Isolated contract fixtures only. No tests contact a real API or create database records.
const patientId = '11111111-1111-4111-8111-111111111111'
const prescriptionId = '22222222-2222-4222-8222-222222222222'
const jwt = role => `test.${Buffer.from(JSON.stringify({ sub: 'doctor-fixture', role, exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')}.test`
const values = { medication: 'Contract medication', dose: 'Contract dose', frequency: 'Once daily', duration: '7 days', reason: 'Contract reason' }
const patient = { id: patientId, name: 'Patient fixture', age: 30, gender: 'Female', currentMedicationsCount: 0 }
const details = (overrides = {}) => ({ patient, currentMedications: [], medicationHistory: [], ...overrides })
const medication = (overrides = {}) => ({ id: prescriptionId, medicationName: values.medication, dosage: values.dose, frequency: values.frequency, duration: values.duration, reason: values.reason, status: 'pending', createdAt: '2026-10-17T08:30:00Z', updatedAt: '2026-10-18T12:00:00Z', ...overrides })
const response = (body, status = 200) => new Response(JSON.stringify(body), { status })

async function load(handler = () => response({ message: 'Saved by backend', prescription: { id: prescriptionId, patientId } }, 201), detailBody = details(), list = [patient]) {
  const requests = [], entries = new Map()
  const store = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) }
  const fetch = async (url, options) => {
    requests.push({ url, ...options })
    if (url.endsWith('/patients')) return response(list)
    if (url.endsWith(`/patients/${patientId}`)) return response(detailBody)
    return handler(url, options)
  }
  const context = vm.createContext({ sessionStorage: store, fetch, atob, Date, Error })
  const modules = {}
  for (const name of Object.keys(paths)) modules[name] = new vm.SourceTextModule(sources[name], { context, initializeImportMeta(meta) { meta.env = {} } })
  for (const name of ['session', 'medicationForm', 'medicationDuplicates']) { await modules[name].link(() => { throw Error('Unexpected import') }); await modules[name].evaluate() }
  await modules.doctorSession.link(() => modules.session)
  await modules.doctorSession.evaluate()
  await modules.api.link(() => modules.doctorSession)
  await modules.api.evaluate()
  await modules.prescriptions.link(specifier => modules[specifier.split('/').at(-1)])
  await modules.prescriptions.evaluate()
  modules.doctorSession.namespace.setDoctorAccessToken(jwt('doctor'))
  return { api: modules.prescriptions.namespace, doctor: modules.doctorSession.namespace, admin: modules.session.namespace, store, requests }
}

test('patient details use hospital-scoped membership and map real medication fields and timestamps', async () => {
  const { api, requests } = await load(undefined, details({ currentMedications: [medication()], medicationHistory: [medication({ id: 'history-fixture', status: 'discontinued' })] }))
  const result = await api.getDoctorPatientDetails(patientId)
  assert.deepEqual(requests.map(r => r.url), ['http://localhost:3000/api/doctor/patients', `http://localhost:3000/api/doctor/patients/${patientId}`])
  const record = result.patient.currentMedications[0]
  assert.equal(record.name, values.medication)
  assert.equal(record.dose, values.dose)
  assert.equal(record.reason, values.reason)
  assert.equal(record.rawStatus, 'pending')
  assert.equal(record.status, 'unverified')
  assert.equal(record.date, '2026-10-17T08:30:00Z')
  assert.equal(result.patient.medicationHistory[0].status, 'discontinued')
  assert.equal(result.duplicateRecords.source, 'backend')
  assert.equal(result.duplicateRecords.patientId, patientId)
  assert.equal(result.duplicateRecords.complete, true)
  assert.equal(result.duplicateRecords.records.length, 1)
})

test('invalid IDs, out-of-scope patients and mismatched response identities cannot load medication records', async () => {
  const missing = await load(undefined, details(), [])
  await assert.rejects(missing.api.getDoctorPatientDetails(patientId), /not available in your Patients list/)
  assert.equal(missing.requests.length, 1)
  const invalid = await load()
  await assert.rejects(invalid.api.getDoctorPatientDetails('preview'), /valid patient/)
  assert.equal(invalid.requests.length, 0)
  for (const body of [null, {}, details({ patient: { id: 'different' } }), details({ currentMedications: null }), details({ medicationHistory: [{}] })]) {
    const { api } = await load(undefined, body)
    await assert.rejects(api.getDoctorPatientDetails(patientId), /unexpected patient medication records/)
  }
})

test('creation sends the exact DTO with the Doctor bearer token and requires a confirmed 201', async () => {
  const { api, requests } = await load()
  const result = await api.createDoctorPrescription(patientId, values)
  assert.equal(result.message, 'Saved by backend')
  const request = requests.at(-1)
  assert.equal(request.url, 'http://localhost:3000/api/doctor/prescriptions')
  assert.equal(request.method, 'POST')
  assert.equal(request.headers.Authorization, `Bearer ${jwt('doctor')}`)
  assert.equal(request.headers['Content-Type'], 'application/json')
  assert.deepEqual(JSON.parse(request.body), { patientId, medicationName: values.medication, dosage: values.dose, frequency: values.frequency, duration: values.duration, reason: values.reason })
  assert.equal(result.prescription, undefined)
  assert.equal(requests.filter(r => r.method === 'POST').length, 1)
})

test('invalid medication fields or patient IDs never submit', async () => {
  const { api, requests } = await load()
  for (const value of [null, {}, { ...values, medication: '' }, { ...values, reason: ' ' }, { ...values, frequency: 'unsupported' }, { ...values, duration: 'unsupported' }]) await assert.rejects(api.createDoctorPrescription(patientId, value), /complete all prescription fields/)
  await assert.rejects(api.createDoctorPrescription('preview', values), /valid patient/)
  assert.equal(requests.length, 0)
})

test('a fresh exact duplicate blocks creation, while a different frequency is not an exact duplicate', async () => {
  const duplicate = await load(undefined, details({ currentMedications: [medication({ medicationName: '  CONTRACT MEDICATION  ' })] }))
  await assert.rejects(duplicate.api.createDoctorPrescription(patientId, values), /exact duplicate exists/)
  assert.equal(duplicate.requests.some(r => r.method === 'POST'), false)
  const different = await load(undefined, details({ currentMedications: [medication({ frequency: 'Twice daily' })] }))
  await different.api.createDoctorPrescription(patientId, values)
  assert.equal(different.requests.filter(r => r.method === 'POST').length, 1)
})

test('incomplete duplicate data cannot falsely authorize submission', async () => {
  const { api, requests } = await load(undefined, details({ currentMedications: [medication({ reason: null })] }))
  await assert.rejects(api.createDoctorPrescription(patientId, values), /Duplicate checking is unavailable/)
  assert.equal(requests.some(r => r.method === 'POST'), false)
})

test('backend validation errors preserve the session and never report success', async () => {
  const { api, doctor } = await load(() => response({ message: ['Invalid medication', 'Please correct the dose'] }, 400))
  await assert.rejects(api.createDoctorPrescription(patientId, values), error => /Invalid medication Please correct the dose/.test(error.message) && !error.saveUncertain)
  assert.ok(doctor.getDoctorAccessToken())
})

test('lost responses, server failures and malformed success results are uncertain and never automatically retried', async () => {
  for (const handler of [() => { throw Error('Offline') }, () => response({}, 500), () => response({}, 201), () => response({ prescription: { id: prescriptionId, patientId: 'wrong-patient' } }, 201), () => response({ prescription: { id: prescriptionId, patientId } }, 200)]) {
    const { api, requests } = await load(handler)
    await assert.rejects(api.createDoctorPrescription(patientId, values), error => error.saveUncertain === true && /save could not be confirmed/.test(error.message))
    assert.equal(requests.filter(r => r.method === 'POST').length, 1)
  }
})

test('failed creation clears only an expired Doctor session, not Admin authentication', async () => {
  const { api, doctor, admin, store } = await load(() => response({ message: 'Expired session' }, 401))
  admin.setAccessToken(jwt('admin'), 'admin')
  const saved = store.getItem('medtrailAdminSession')
  await assert.rejects(api.createDoctorPrescription(patientId, values), /Expired session/)
  assert.equal(doctor.getDoctorAccessToken(), null)
  assert.equal(store.getItem('medtrailAdminSession'), saved)
})

test('abandoned or logged-out write responses cannot report a successful save to the page', async () => {
  for (const action of ['abort', 'logout']) {
    let finish, started
    const ready = new Promise(resolve => { started = resolve })
    const { api, doctor } = await load(() => new Promise(resolve => { finish = resolve; started() }))
    const controller = new AbortController()
    const pending = api.createDoctorPrescription(patientId, values, controller.signal)
    await ready
    if (action === 'abort') controller.abort()
    else doctor.setDoctorAccessToken(null)
    finish(response({ prescription: { id: prescriptionId, patientId } }, 201))
    await assert.rejects(pending, error => error.name === 'AbortError')
  }
})
