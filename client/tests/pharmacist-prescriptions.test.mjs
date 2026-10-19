import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const sources = {}
for (const [name, path] of Object.entries({ session: 'auth/session', pharmacistSession: 'auth/pharmacistSession', api: 'pharmacist/api', dates: 'doctor/medicationDates', prescriptions: 'pharmacist/prescriptions', form: 'pharmacist/clarificationForm', clarifications: 'pharmacist/clarifications' })) {
  sources[name] = await readFile(new URL(`../src/${path}.js`, import.meta.url), 'utf8')
}
// Contract fixtures are restricted to tests; no real account or database is used.
const token = (role = 'pharmacist', sub = 'pharmacist-fixture') => `test.${Buffer.from(JSON.stringify({ sub, role, exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url')}.test`
const prescription = (id, createdAt = '2026-10-19T10:00:00Z') => ({ id, createdAt, status: 'pending', patientName: 'Patient fixture', medicationName: 'Medication fixture', reason: 'Indication fixture', doctorName: 'Doctor fixture' })
const response = (data, status = 200) => new Response(JSON.stringify(data), { status })

async function load(fetch) {
  const entries = new Map()
  const store = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) }
  const context = vm.createContext({ fetch, sessionStorage: store, atob, Date, Error })
  const modules = {}
  for (const name of Object.keys(sources)) modules[name] = new vm.SourceTextModule(sources[name], { context, initializeImportMeta(meta) { meta.env = { VITE_API_BASE_URL: 'https://api.example.test///' } } })
  await modules.session.link(() => { throw Error('Unexpected import') })
  await modules.session.evaluate()
  await modules.pharmacistSession.link(() => modules.session)
  await modules.pharmacistSession.evaluate()
  await modules.api.link(() => modules.pharmacistSession)
  await modules.api.evaluate()
  await modules.dates.link(() => { throw Error('Unexpected import') })
  await modules.dates.evaluate()
  await modules.prescriptions.link(specifier => specifier === './api' ? modules.api : modules.dates)
  await modules.prescriptions.evaluate()
  await modules.form.link(() => { throw Error('Unexpected import') })
  await modules.form.evaluate()
  await modules.clarifications.link(specifier => ({ './api': modules.api, './prescriptions': modules.prescriptions, './clarificationForm': modules.form, '../auth/pharmacistSession': modules.pharmacistSession })[specifier])
  await modules.clarifications.evaluate()
  return { api: modules.prescriptions.namespace, pharmacist: modules.pharmacistSession.namespace, admin: modules.session.namespace, clarifications: modules.clarifications.namespace, form: modules.form.namespace }
}

test('queue requests only pending prescriptions with the Pharmacist bearer token and no request body', async () => {
  let request
  const { api, pharmacist, admin } = await load(async (url, options) => { request = { url, ...options }; return response([prescription('rx-1')]) })
  const jwt = token()
  pharmacist.setPharmacistAccessToken(jwt)
  admin.setAccessToken(token('admin'), 'admin')
  const controller = new AbortController()
  const result = await api.getVerificationQueue(controller.signal)
  assert.equal(result.length, 1)
  assert.equal(request.url, 'https://api.example.test/api/pharmacy/prescriptions?status=pending')
  assert.equal(request.headers.Authorization, `Bearer ${jwt}`)
  assert.equal(request.method, 'GET')
  assert.equal(request.body, undefined)
  assert.equal(request.cache, 'no-store')
  assert.equal(request.signal, controller.signal)
})

test('queue sorts actual instants oldest first across timezone offsets, preserving equal-date order', async () => {
  const { api, pharmacist } = await load(async () => response([
    prescription('newer', '2026-10-19T10:00:00Z'),
    prescription('older', '2026-10-19T11:00:00+02:00'),
    prescription('equal', '2026-10-19T09:00:00Z'),
  ]))
  pharmacist.setPharmacistAccessToken(token())
  const result = await api.getVerificationQueue()
  assert.deepEqual(Array.from(result, record => record.id), ['older', 'equal', 'newer'])
})

test('other, missing and unknown statuses are never presented as unverified', async () => {
  const { api, pharmacist } = await load(async () => response(['pending', 'dispensed', 'active', 'clarified', 'awaiting_clarification', 'unverified', null, ''].map((status, index) => ({ ...prescription(`rx-${index}`), status }))))
  pharmacist.setPharmacistAccessToken(token())
  const result = await api.getVerificationQueue()
  assert.deepEqual(Array.from(result, record => record.id), ['rx-0'])
})

test('missing fields stay unavailable, and invalid or timezone-less dates sort last without guessing', async () => {
  const { api, pharmacist } = await load(async () => response([
    { id: 'unknown', status: 'pending', createdAt: '2026-10-19 10:00', date: '19 Oct 2026', instructions: 'Do not use as indication' },
    prescription('valid'),
    prescription('invalid', 'not-a-date'),
  ]))
  pharmacist.setPharmacistAccessToken(token())
  const result = await api.getVerificationQueue()
  assert.deepEqual(Array.from(result, record => record.id), ['valid', 'unknown', 'invalid'])
  assert.equal(result[1].timestamp, null)
  assert.equal(result[1].patientName, '')
  assert.equal(result[1].medicationName, '')
  assert.equal(result[1].doctorName, '')
  assert.equal(result[1].reason, '')
  assert.equal(result[1].instructions, undefined)
})

test('empty results stay empty; malformed results and duplicate identities fail visibly', async () => {
  const empty = await load(async () => response([]))
  empty.pharmacist.setPharmacistAccessToken(token())
  assert.equal((await empty.api.getVerificationQueue()).length, 0)
  for (const body of [null, {}, { prescriptions: [] }, [null], [{ status: 'pending' }], [prescription('duplicate'), prescription('duplicate')]]) {
    const { api, pharmacist } = await load(async () => response(body))
    pharmacist.setPharmacistAccessToken(token())
    await assert.rejects(api.getVerificationQueue(), /unexpected prescription/)
  }
})

test('a missing or wrong-role session never makes a prescription request', async () => {
  let calls = 0
  const { api, pharmacist } = await load(async () => { calls++; return response([]) })
  for (const jwt of [null, token('doctor'), token('admin'), 'invalid']) {
    pharmacist.setPharmacistAccessToken(jwt)
    await assert.rejects(api.getVerificationQueue(), /log in as a pharmacist/)
  }
  assert.equal(calls, 0)
})

test('late responses after logout or account changes are discarded without clearing a new session', async () => {
  for (const action of ['abort', 'logout', 'new-login']) {
    let finish
    const { api, pharmacist } = await load(() => new Promise(resolve => { finish = resolve }))
    const jwt = token()
    const newer = token('pharmacist', 'other-pharmacist')
    pharmacist.setPharmacistAccessToken(jwt)
    const controller = new AbortController()
    const pending = api.getVerificationQueue(controller.signal)
    if (action === 'abort') controller.abort()
    else pharmacist.setPharmacistAccessToken(action === 'logout' ? null : newer)
    finish(response({}, 401))
    await assert.rejects(pending, error => error.name === 'AbortError')
    assert.equal(pharmacist.getPharmacistAccessToken(), action === 'logout' ? null : action === 'new-login' ? newer : jwt)
  }
})

test('details resolve the exact prescription from a fresh hospital-scoped GET using only the Pharmacist session', async () => {
  const requests = []
  const { api, pharmacist, admin } = await load(async (url, options) => {
    requests.push({ url, ...options })
    return response([
      { ...prescription('first'), patientId: 'patient-1', dosage: '10 mg', frequency: 'Daily', duration: '7 days' },
      { ...prescription('second'), patientId: 'patient-1', dosage: '20 mg', frequency: 'Twice daily', duration: '14 days' },
    ])
  })
  const jwt = token()
  pharmacist.setPharmacistAccessToken(jwt)
  admin.setAccessToken(token('admin'), 'admin')
  const controller = new AbortController()
  const result = await api.getPharmacistPrescriptionDetails('second', controller.signal)
  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, 'https://api.example.test/api/pharmacy/prescriptions?status=all')
  assert.equal(requests[0].method, 'GET')
  assert.equal(requests[0].headers.Authorization, `Bearer ${jwt}`)
  assert.equal(requests[0].body, undefined)
  assert.equal(requests[0].signal, controller.signal)
  assert.equal(result.prescription.id, 'second')
  assert.equal(result.prescription.dosage, '20 mg')
  assert.equal(result.prescription.frequency, 'Twice daily')
  assert.equal(result.prescription.duration, '14 days')
})

test('current medications match the patient ID and Doctor active/pending definition, never the patient name', async () => {
  const statuses = ['pending', 'active', 'dispensed', 'clarified', 'awaiting_clarification', 'discontinued', 'completed', 'cancelled', 'unknown']
  const { api, pharmacist } = await load(async () => response([
    ...statuses.map(status => ({ ...prescription(status), patientId: 'patient-1', status })),
    { ...prescription('same-name-other-patient'), patientId: 'patient-2' },
    { ...prescription('missing-patient') },
  ]))
  pharmacist.setPharmacistAccessToken(token())
  const result = await api.getPharmacistPrescriptionDetails('pending')
  assert.deepEqual(Array.from(result.currentMedications, record => record.id), ['pending', 'active'])
  assert.equal(result.patient.id, 'patient-1')
  assert.equal(result.patient.age, null)
  assert.equal(result.patient.gender, '')
})

test('missing demographics, dosage and identity remain unavailable and combined dose is not parsed into invented fields', async () => {
  const { api, pharmacist } = await load(async () => response([
    { id: 'missing', status: 'pending', doseAndFrequency: 'Combined dose from backend', date: 'Local date without timezone' },
    { ...prescription('other'), patientId: 'patient-2' },
  ]))
  pharmacist.setPharmacistAccessToken(token())
  const result = await api.getPharmacistPrescriptionDetails('missing')
  assert.equal(result.patient.id, null)
  assert.equal(result.patient.name, '')
  assert.equal(result.patient.age, null)
  assert.equal(result.patient.gender, '')
  assert.equal(result.currentMedications, null)
  assert.equal(result.prescription.dosage, '')
  assert.equal(result.prescription.frequency, '')
  assert.equal(result.prescription.doseAndFrequency, 'Combined dose from backend')
  assert.equal(result.prescription.timestamp, null)
})

test('missing or out-of-scope prescription IDs never fall back to another record', async () => {
  let calls = 0
  const { api, pharmacist } = await load(async () => { calls++; return response([prescription('other')]) })
  pharmacist.setPharmacistAccessToken(token())
  for (const id of [null, undefined, '', '   ']) await assert.rejects(api.getPharmacistPrescriptionDetails(id), /select a prescription/)
  assert.equal(calls, 0)
  await assert.rejects(api.getPharmacistPrescriptionDetails('not-in-this-hospital'), /not available in your hospital records/)
  assert.equal(calls, 1)
})

test('a non-current selected prescription yields a genuine empty current medications list', async () => {
  const { api, pharmacist } = await load(async () => response([{ ...prescription('past'), patientId: 'patient-1', status: 'completed' }]))
  pharmacist.setPharmacistAccessToken(token())
  const result = await api.getPharmacistPrescriptionDetails('past')
  assert.equal(result.prescription.id, 'past')
  assert.equal(result.currentMedications.length, 0)
})

test('details propagate request failures and discard results arriving after logout', async () => {
  const denied = await load(async () => response({ message: 'Queue unavailable' }, 503))
  denied.pharmacist.setPharmacistAccessToken(token())
  await assert.rejects(denied.api.getPharmacistPrescriptionDetails('first'), /Queue unavailable/)
  let finish
  const late = await load(() => new Promise(resolve => { finish = resolve }))
  late.pharmacist.setPharmacistAccessToken(token())
  const pending = late.api.getPharmacistPrescriptionDetails('first')
  late.pharmacist.setPharmacistAccessToken(null)
  finish(response([prescription('first')]))
  await assert.rejects(pending, error => error.name === 'AbortError')
})

const clarificationId = '11111111-1111-4111-8111-111111111111'
const clarificationPatient = '22222222-2222-4222-8222-222222222222'
const clarificationValues = { concern: 'Dose', notes: '  Please confirm this dose.  ' }
const clarificationRecord = () => ({ ...prescription(clarificationId), patientId: clarificationPatient })
const clarifiedResponse = body => ({ message: 'Request confirmed by backend.', prescription: { ...clarificationRecord(), status: 'awaiting_clarification', concern: body.concern, clarificationReason: body.reason } })

test('clarification validation requires a known concern, meaningful notes and a maximum of 200 characters', async () => {
  const { form } = await load(async () => { throw Error('No API calls expected') })
  for (const concern of form.clarificationConcerns) assert.equal(Object.keys(form.validateClarification({ concern, notes: 'Please confirm the prescribed frequency.' })).length, 0)
  for (const notes of ['', '     ', 'short', '..........', '1234567890', 'A'.repeat(201)]) assert.ok(form.validateClarification({ concern: 'Dose', notes }).notes)
  assert.ok(form.validateClarification({ concern: 'Unsupported', notes: clarificationValues.notes }).concern)
  assert.equal(Object.keys(form.validateClarification({ concern: 'Other', notes: 'é'.repeat(200) })).length, 0)
})

test('clarification writes only supported concern/reason fields after hospital membership is rechecked', async () => {
  for (const concern of ['Dose', 'Frequency', 'Duration', 'Possible duplicate', 'Other']) {
    const calls = []
    const loaded = await load(async (url, options) => {
      calls.push({ url, ...options })
      return options.method === 'GET' ? response([clarificationRecord()]) : response(clarifiedResponse(JSON.parse(options.body)))
    })
    const jwt = token()
    loaded.pharmacist.setPharmacistAccessToken(jwt)
    loaded.admin.setAccessToken(token('admin'), 'admin')
    const controller = new AbortController()
    const result = await loaded.clarifications.requestPharmacistClarification(clarificationId, clarificationPatient, { ...clarificationValues, concern }, controller.signal)
    assert.equal(result.message, 'Request confirmed by backend.')
    assert.equal(calls.length, 2)
    assert.equal(calls[0].url, 'https://api.example.test/api/pharmacy/prescriptions?status=all')
    assert.equal(calls[1].url, `https://api.example.test/api/pharmacy/prescriptions/${clarificationId}/clarify`)
    assert.equal(calls[1].method, 'POST')
    assert.equal(calls[1].headers.Authorization, `Bearer ${jwt}`)
    assert.equal(calls[1].headers['Content-Type'], 'application/json')
    assert.equal(calls[1].signal, controller.signal)
    assert.deepEqual(JSON.parse(calls[1].body), { concern, reason: clarificationValues.notes.trim() })
  }
})

test('invalid clarification values or sessions never reach a write endpoint', async () => {
  const calls = []
  const loaded = await load(async (url, options) => { calls.push({ url, ...options }); return response([clarificationRecord()]) })
  loaded.pharmacist.setPharmacistAccessToken(token())
  for (const [id, values] of [['not-an-id', clarificationValues], [clarificationId, null], [clarificationId, { concern: '', notes: '   ' }], [clarificationId, { concern: 'Other', notes: 'a'.repeat(201) }]]) {
    await assert.rejects(loaded.clarifications.requestPharmacistClarification(id, clarificationPatient, values), /valid prescription/)
  }
  loaded.pharmacist.setPharmacistAccessToken(token('doctor'))
  await assert.rejects(loaded.clarifications.requestPharmacistClarification(clarificationId, clarificationPatient, clarificationValues), /log in as a pharmacist/)
  assert.equal(calls.length, 0)
})

test('out-of-scope records, changed patients and already-requested or closed prescriptions cannot be submitted', async () => {
  for (const records of [[], [{ ...clarificationRecord(), patientId: 'different-patient' }], ...['awaiting_clarification', 'dispensed', 'completed', 'cancelled', 'discontinued'].map(status => [{ ...clarificationRecord(), status }])]) {
    const calls = []
    const loaded = await load(async (url, options) => { calls.push(options.method); return response(records) })
    loaded.pharmacist.setPharmacistAccessToken(token())
    await assert.rejects(loaded.clarifications.requestPharmacistClarification(clarificationId, clarificationPatient, clarificationValues), /not available|has changed/)
    assert.deepEqual(calls, ['GET'])
  }
})

test('clarification 4xx responses show actual errors; only 401 clears the Pharmacist session', async () => {
  for (const status of [400, 401, 403, 404]) {
    const loaded = await load(async (url, options) => options.method === 'GET' ? response([clarificationRecord()]) : response({ message: 'Backend rejected this request.' }, status))
    const jwt = token()
    loaded.pharmacist.setPharmacistAccessToken(jwt)
    loaded.admin.setAccessToken(token('admin'), 'admin')
    const adminToken = loaded.admin.getAccessToken()
    await assert.rejects(loaded.clarifications.requestPharmacistClarification(clarificationId, clarificationPatient, clarificationValues), error => error.message === 'Backend rejected this request.' && !error.saveUncertain)
    assert.equal(loaded.pharmacist.getPharmacistAccessToken(), status === 401 ? null : jwt)
    assert.equal(loaded.admin.getAccessToken(), adminToken)
  }
})

test('lost responses, server errors and mismatched successful responses are uncertain and never auto-retried', async () => {
  const body = { concern: 'Dose', reason: clarificationValues.notes.trim() }
  for (const result of [null, {}, { ...clarifiedResponse(body), prescription: { ...clarifiedResponse(body).prescription, id: 'other' } }, { ...clarifiedResponse(body), prescription: { ...clarifiedResponse(body).prescription, status: 'pending' } }, { ...clarifiedResponse(body), prescription: { ...clarifiedResponse(body).prescription, clarificationReason: 'Other note' } }, 503, 'offline', 'wrong-status']) {
    let writes = 0
    const loaded = await load(async (url, options) => {
      if (options.method === 'GET') return response([clarificationRecord()])
      writes++
      if (result === 'offline') throw Error('Offline')
      return result === 503 ? response({ message: 'Server error' }, 503) : response(result, result === 'wrong-status' ? 201 : 200)
    })
    loaded.pharmacist.setPharmacistAccessToken(token())
    await assert.rejects(loaded.clarifications.requestPharmacistClarification(clarificationId, clarificationPatient, clarificationValues), error => error.saveUncertain && /could not be confirmed/.test(error.message))
    assert.equal(writes, 1)
  }
})

test('a preflight failure is safe to retry and does not send a clarification request', async () => {
  let writes = 0
  const loaded = await load(async (url, options) => { if (options.method === 'POST') writes++; return response({ message: 'Records unavailable' }, 503) })
  loaded.pharmacist.setPharmacistAccessToken(token())
  await assert.rejects(loaded.clarifications.requestPharmacistClarification(clarificationId, clarificationPatient, clarificationValues), error => /Records unavailable/.test(error.message) && !error.saveUncertain)
  assert.equal(writes, 0)
})

test('late clarification responses after logout cannot report success or recreate a session', async () => {
  let finish
  const loaded = await load(async (url, options) => options.method === 'GET' ? response([clarificationRecord()]) : new Promise(resolve => { finish = resolve }))
  loaded.pharmacist.setPharmacistAccessToken(token())
  const pending = loaded.clarifications.requestPharmacistClarification(clarificationId, clarificationPatient, clarificationValues)
  while (!finish) await new Promise(resolve => setTimeout(resolve, 0))
  loaded.pharmacist.setPharmacistAccessToken(null)
  finish(response(clarifiedResponse({ concern: 'Dose', reason: clarificationValues.notes.trim() })))
  await assert.rejects(pending, error => error.name === 'AbortError')
  assert.equal(loaded.pharmacist.getPharmacistAccessToken(), null)
})

test('clarification list reads the existing hospital-scoped GET and includes pending, replies and actual request history only', async () => {
  const calls = []
  const { api, pharmacist } = await load(async (url, options) => {
    calls.push({ url, ...options })
    return response([
      { ...prescription('waiting'), status: 'awaiting_clarification', concern: 'Dose', clarificationReason: 'Confirm dose' },
      { ...prescription('reply'), status: 'clarified', clarificationResponse: 'Actual response' },
      { ...prescription('past'), status: 'dispensed', clarificationReason: 'Actual past request', clarificationResponse: 'Past response' },
      prescription('ordinary'),
      { ...prescription('generic-note'), noteToPharmacist: 'Unrelated note' },
    ])
  })
  pharmacist.setPharmacistAccessToken(token())
  const result = await api.getPharmacistClarifications()
  assert.deepEqual(Array.from(result, record => record.id), ['waiting', 'reply', 'past'])
  assert.equal(result[0].clarification.concern, 'Dose')
  assert.equal(result[0].clarification.notes, 'Confirm dose')
  assert.equal(result[1].clarification.response, 'Actual response')
  assert.equal(result[2].clarification.status, 'dispensed')
  assert.equal(calls[0].url, 'https://api.example.test/api/pharmacy/prescriptions?status=all')
  assert.equal(calls[0].method, 'GET')
  assert.equal(calls.length, 1)
})

test('clarification details resolve a specific prescription, never a different request for the same patient', async () => {
  const { api, pharmacist } = await load(async () => response([
    { ...prescription('first'), patientId: 'patient-1', status: 'awaiting_clarification', concern: 'Dose', clarificationReason: 'First request' },
    { ...prescription('second'), patientId: 'patient-1', status: 'clarified', concern: 'Frequency', clarificationReason: 'Second request', clarificationResponse: 'Actual second reply' },
    { ...prescription('current'), patientId: 'patient-1', status: 'active' },
    { ...prescription('other-patient'), patientId: 'patient-2' },
  ]))
  pharmacist.setPharmacistAccessToken(token())
  const result = await api.getPharmacistClarificationDetails('second')
  assert.equal(result.prescription.id, 'second')
  assert.equal(result.clarification.concern, 'Frequency')
  assert.equal(result.clarification.notes, 'Second request')
  assert.equal(result.clarification.response, 'Actual second reply')
  assert.deepEqual(Array.from(result.currentMedications, record => record.id), ['current'])
})

test('ordinary prescriptions cannot masquerade as clarification details, and missing fields are not invented', async () => {
  const { api, pharmacist } = await load(async () => response([
    prescription('ordinary'), { id: 'missing', status: 'awaiting_clarification' },
  ]))
  pharmacist.setPharmacistAccessToken(token())
  await assert.rejects(api.getPharmacistClarificationDetails('ordinary'), /No clarification request is available/)
  await assert.rejects(api.getPharmacistClarificationDetails('out-of-scope'), /not available in your hospital/)
  const result = await api.getPharmacistClarificationDetails('missing')
  assert.equal(result.clarification.concern, '')
  assert.equal(result.clarification.notes, '')
  assert.equal(result.clarification.response, '')
  assert.equal(result.patient.age, null)
  assert.equal(result.patient.gender, '')
  assert.equal(result.currentMedications, null)
})

test('clarification statuses reflect the actual backend state and never infer pending from a note or reply', async () => {
  const { api } = await load(async () => response([]))
  for (const [status, label] of Object.entries({ awaiting_clarification: 'Pending clarification', clarified: 'Clarified', dispensed: 'Dispensed', active: 'Active', pending: 'Unverified', discontinued: 'Discontinued', completed: 'Completed', cancelled: 'Cancelled', unknown: 'unknown', '': 'Status unavailable' })) {
    assert.equal(api.getClarificationStatus(status), label)
  }
})

test('clarification list failures and late responses do not become fake empty states', async () => {
  const failed = await load(async () => response({ message: 'Unavailable' }, 503))
  failed.pharmacist.setPharmacistAccessToken(token())
  await assert.rejects(failed.api.getPharmacistClarifications(), /Unavailable/)
  let finish
  const late = await load(() => new Promise(resolve => { finish = resolve }))
  late.pharmacist.setPharmacistAccessToken(token())
  const pending = late.api.getPharmacistClarifications()
  late.pharmacist.setPharmacistAccessToken(null)
  finish(response([{ ...prescription('first'), status: 'awaiting_clarification' }]))
  await assert.rejects(pending, error => error.name === 'AbortError')
})

test('dispensation history requests the real dispensed filter and displays only actually dispensed records', async () => {
  const calls = []
  const { api, pharmacist } = await load(async (url, options) => {
    calls.push({ url, ...options })
    return response([
      { ...prescription('dispensed'), status: 'dispensed', dosage: '10 mg', frequency: 'Daily', updatedAt: '2026-10-20T10:00:00Z', date: '19 Oct, 26, 10:00am' },
      prescription('pending'),
      { ...prescription('active'), status: 'active' },
    ])
  })
  const jwt = token()
  pharmacist.setPharmacistAccessToken(jwt)
  const controller = new AbortController()
  const result = await api.getDispensedMedications(controller.signal)
  assert.equal(calls[0].url, 'https://api.example.test/api/pharmacy/prescriptions?status=dispensed')
  assert.equal(calls[0].method, 'GET')
  assert.equal(calls[0].headers.Authorization, `Bearer ${jwt}`)
  assert.equal(calls[0].body, undefined)
  assert.equal(calls[0].signal, controller.signal)
  assert.deepEqual(Array.from(result, record => record.id), ['dispensed'])
  assert.equal(result[0].medicationName, 'Medication fixture')
  assert.equal(result[0].patientName, 'Patient fixture')
  assert.equal(result[0].reason, 'Indication fixture')
  assert.equal(result[0].dosage, '10 mg')
  assert.equal(result[0].frequency, 'Daily')
  assert.equal(result[0].dispensedOn, null)
  assert.equal(result[0].createdAt, undefined)
  assert.equal(result[0].updatedAt, undefined)
  assert.equal(result[0].date, undefined)
})

test('dispensed records retain unknown fields as unavailable and never parse combined dose or invent indications', async () => {
  const { api, pharmacist } = await load(async () => response([{ id: 'missing', status: 'dispensed', instructions: 'Not an indication', doseAndFrequency: 'Combined dose from backend' }]))
  pharmacist.setPharmacistAccessToken(token())
  const [result] = await api.getDispensedMedications()
  for (const field of ['medicationName', 'patientName', 'dosage', 'frequency', 'doctorName', 'reason']) assert.equal(result[field], '')
  assert.equal(result.doseAndFrequency, 'Combined dose from backend')
  assert.equal(result.dispensedOn, null)
})

test('dispensation history differentiates empty data, malformed results and request failures', async () => {
  const empty = await load(async () => response([]))
  empty.pharmacist.setPharmacistAccessToken(token())
  assert.equal((await empty.api.getDispensedMedications()).length, 0)
  for (const body of [null, {}, [{ status: 'dispensed' }], [prescription('same'), prescription('same')]]) {
    const loaded = await load(async () => response(body))
    loaded.pharmacist.setPharmacistAccessToken(token())
    await assert.rejects(loaded.api.getDispensedMedications(), /unexpected prescription/)
  }
  const failed = await load(async () => response({ message: 'History unavailable' }, 503))
  failed.pharmacist.setPharmacistAccessToken(token())
  await assert.rejects(failed.api.getDispensedMedications(), /History unavailable/)
})

test('dispensation history requires a Pharmacist session and discards abandoned responses', async () => {
  let finish
  const loaded = await load(() => new Promise(resolve => { finish = resolve }))
  await assert.rejects(loaded.api.getDispensedMedications(), /log in as a pharmacist/)
  loaded.pharmacist.setPharmacistAccessToken(token())
  const pending = loaded.api.getDispensedMedications()
  loaded.pharmacist.setPharmacistAccessToken(null)
  finish(response([{ ...prescription('first'), status: 'dispensed' }]))
  await assert.rejects(pending, error => error.name === 'AbortError')
})
