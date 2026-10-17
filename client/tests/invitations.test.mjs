import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const sources = {}
for (const name of ['session', 'doctorSession', 'invitations']) sources[name] = await readFile(new URL(`../src/auth/${name}.js`, import.meta.url), 'utf8')
const invitation = { name: 'Unit test doctor', email: 'doctor@example.test', role: 'doctor' }
const credentials = { token: 'unit-test-invitation', password: 'UnitTest!123', confirmPassword: 'UnitTest!123', invitation }
// Backend-response fixtures are confined to tests, never application authentication.
const jwt = (role = 'doctor', sub = 'doctor-fixture', exp = Math.floor(Date.now() / 1000) + 600) => `test.${Buffer.from(JSON.stringify({ sub, role, exp })).toString('base64url')}.test`
const registered = (overrides = {}) => ({ accessToken: jwt(), user: { id: 'doctor-fixture', role: 'doctor', email: invitation.email }, ...overrides })
const response = (data, status = 200) => new Response(JSON.stringify(data), { status })

async function load(fetch) {
  const entries = new Map()
  const store = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) }
  const context = vm.createContext({ fetch, sessionStorage: store, atob, Date, Error })
  const modules = {}
  for (const name of Object.keys(sources)) modules[name] = new vm.SourceTextModule(sources[name], { context, initializeImportMeta(meta) { meta.env = {} } })
  await modules.session.link(() => { throw Error('Unexpected import') })
  await modules.session.evaluate()
  await modules.doctorSession.link(() => modules.session)
  await modules.doctorSession.evaluate()
  await modules.invitations.link(specifier => modules[specifier.replace('./', '')])
  await modules.invitations.evaluate()
  return { api: modules.invitations.namespace, doctor: modules.doctorSession.namespace, admin: modules.session.namespace, store, entries }
}

test('validates the exact invitation query and accepts only supported verified invitation metadata', async () => {
  let request
  const { api } = await load(async (url, options) => { request = { url, ...options }; return response({ valid: true, ...invitation }) })
  const result = await api.validateInvitation('test token/?')
  assert.equal(request.url, 'http://localhost:3000/api/auth/validate-invitation?token=test%20token%2F%3F')
  assert.equal(request.cache, 'no-store')
  assert.equal(request.headers, undefined)
  assert.equal(result.email, invitation.email)
  assert.equal(result.role, 'doctor')
})

test('missing, expired, invalid, and unsupported-role invitation responses cannot activate a form', async () => {
  for (const [data, status] of [[{ message: 'Expired invitation' }, 400], [{ valid: false, ...invitation }, 200], [{ valid: true, ...invitation, role: 'admin' }, 200], [{ valid: true, ...invitation, email: null }, 200], [{ valid: true, ...invitation, name: '' }, 200]]) {
    const { api } = await load(async () => response(data, status))
    await assert.rejects(api.validateInvitation('test-invitation'))
  }
  let requests = 0
  const { api } = await load(async () => { requests++; return response({}) })
  await assert.rejects(api.validateInvitation(''))
  assert.equal(requests, 0)
})

test('Doctor invitation completion uses exact backend payload and preserves separate Admin storage', async () => {
  let request
  const { api, doctor, admin, store, entries } = await load(async (url, options) => { request = { url, ...options }; return response(registered()) })
  admin.setAccessToken(jwt('admin', 'admin-fixture'), 'admin')
  const adminSession = store.getItem('medtrailAdminSession')
  const result = await api.completeInvitation(credentials)
  assert.equal(result.role, 'doctor')
  assert.equal(request.url, 'http://localhost:3000/api/auth/complete-registration')
  assert.equal(request.method, 'POST')
  assert.deepEqual(JSON.parse(request.body), { token: credentials.token, password: credentials.password, confirmPassword: credentials.confirmPassword })
  assert.equal(store.getItem('medtrailAdminSession'), adminSession)
  assert.equal(doctor.getDoctorAccessToken(), registered().accessToken)
  assert.equal(JSON.parse(store.getItem('medtrailDoctorSession')).token, doctor.getDoctorAccessToken())
  const stored = JSON.stringify([...entries])
  assert.equal(stored.includes(credentials.password), false)
  assert.equal(stored.includes(credentials.token), false)
  assert.equal(store.getItem('medtrailUser'), null)
  assert.equal(store.getItem('medtrailAuthToken'), null)
  doctor.setDoctorAccessToken(null)
  assert.equal(store.getItem('medtrailDoctorSession'), null)
  assert.equal(store.getItem('medtrailAdminSession'), adminSession)
})

test('invalid passwords, missing invitation state, and confirmation mismatches never submit', async () => {
  let requests = 0
  const { api } = await load(async () => { requests++; return response({}) })
  for (const values of [{ ...credentials, token: '' }, { ...credentials, invitation: null }, { ...credentials, password: 'short' }, { ...credentials, password: 'lowercase123!' }, { ...credentials, confirmPassword: 'different' }]) await assert.rejects(api.completeInvitation(values))
  assert.equal(requests, 0)
})

test('registration failure leaves Doctor and Admin sessions unchanged', async () => {
  const { api, doctor, admin, store } = await load(async () => response({ message: ['Invitation expired', 'Request a new link'] }, 400))
  const previous = jwt('doctor', 'previous-doctor')
  doctor.setDoctorAccessToken(previous)
  admin.setAccessToken(jwt('admin', 'admin-fixture'), 'admin')
  const saved = store.getItem('medtrailAdminSession')
  await assert.rejects(api.completeInvitation(credentials), /Invitation expired Request a new link/)
  assert.equal(doctor.getDoctorAccessToken(), previous)
  assert.equal(store.getItem('medtrailAdminSession'), saved)
})

test('malformed, expired, wrong-role, wrong-user, and wrong-email results cannot establish a session', async () => {
  for (const data of [null, {}, registered({ accessToken: 'invalid' }), registered({ accessToken: jwt('doctor', 'doctor-fixture', 1) }), registered({ accessToken: jwt('admin') }), registered({ user: { id: 'different', role: 'doctor', email: invitation.email } }), registered({ user: { id: 'doctor-fixture', role: 'doctor', email: 'someone-else@example.test' } })]) {
    const { api, doctor } = await load(async () => response(data))
    await assert.rejects(api.completeInvitation(credentials), /session response/)
    assert.equal(doctor.getDoctorAccessToken(), null)
  }
})

test('Pharmacist completion does not store its token as a Doctor or Admin session', async () => {
  const { api, doctor, admin, store } = await load(async () => response({ accessToken: jwt('pharmacist', 'pharmacist-fixture'), user: { id: 'pharmacist-fixture', role: 'pharmacist', email: 'pharmacist@example.test' } }))
  const result = await api.completeInvitation({ ...credentials, invitation: { ...invitation, role: 'pharmacist', email: 'pharmacist@example.test' } })
  assert.equal(result.role, 'pharmacist')
  assert.equal(doctor.getDoctorAccessToken(), null)
  assert.equal(admin.getAccessToken(), null)
  assert.equal(store.getItem('medtrailAdminSession'), null)
  assert.equal(store.getItem('medtrailDoctorSession'), null)
})

test('abandoned invitation responses cannot recreate a session', async () => {
  let finish
  const { api, doctor } = await load(() => new Promise(resolve => { finish = resolve }))
  const controller = new AbortController()
  const pending = api.completeInvitation({ ...credentials, signal: controller.signal })
  controller.abort()
  finish(response(registered()))
  assert.equal(await pending, null)
  assert.equal(doctor.getDoctorAccessToken(), null)
})

test('network failures are reported without starting an authenticated session', async () => {
  const { api, doctor } = await load(async () => { throw Error('Offline') })
  await assert.rejects(api.validateInvitation('test-invitation'), /connect/)
  await assert.rejects(api.completeInvitation(credentials), /network/)
  assert.equal(doctor.getDoctorAccessToken(), null)
})
