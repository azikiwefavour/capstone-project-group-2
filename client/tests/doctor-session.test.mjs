import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const source = await readFile(new URL('../src/auth/doctorSession.js', import.meta.url), 'utf8')
const sharedSource = await readFile(new URL('../src/auth/session.js', import.meta.url), 'utf8')
const key = 'medtrailDoctorSession'
// Isolated unit-test fixtures only. Production access always requires backend JWT validation.
const token = (payload = {}) => `test.${Buffer.from(JSON.stringify({ sub: 'doctor-fixture', role: 'doctor', exp: Math.floor(Date.now() / 1000) + 600, ...payload })).toString('base64url')}.test`
const profile = { id: 'doctor-fixture', name: 'Doctor test fixture', role: 'doctor', isEmailVerified: true }
const response = (body, status = 200) => new Response(JSON.stringify(body), { status })
function storage() {
  const entries = new Map()
  return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) }
}
async function load(store = storage(), fetch = async () => response(profile)) {
  const context = vm.createContext({ sessionStorage: store, fetch, atob, Date, Error })
  const shared = new vm.SourceTextModule(sharedSource, { context })
  await shared.link(() => { throw Error('Unexpected shared import') })
  await shared.evaluate()
  const session = new vm.SourceTextModule(source, { context, initializeImportMeta(meta) { meta.env = {} } })
  await session.link(() => shared)
  await session.evaluate()
  return { session: session.namespace, shared: shared.namespace, store }
}

test('restores a Doctor token after reload and verifies it with the backend before granting access', async () => {
  const store = storage(), jwt = token()
  const original = await load(store)
  original.session.setDoctorAccessToken(jwt)
  const restored = await load(store)
  assert.equal(restored.session.getDoctorAccessToken(), jwt)
  assert.equal((await restored.session.verifyDoctorSession(jwt)).name, profile.name)
  assert.deepEqual(JSON.parse(store.getItem(key)), { token: jwt })
  restored.session.setDoctorAccessToken(null)
  assert.equal((await load(store)).session.getDoctorAccessToken(), null)
  assert.equal(store.getItem(key), null)
})

test('Doctor login and logout never overwrite an Admin session', async () => {
  const store = storage()
  const { session, shared } = await load(store)
  const adminToken = token({ role: 'admin' })
  shared.setAccessToken(adminToken, 'admin')
  const saved = store.getItem('medtrailAdminSession')
  session.setDoctorAccessToken(token())
  session.setDoctorAccessToken(null)
  assert.equal(store.getItem('medtrailAdminSession'), saved)
  assert.equal(shared.getAccessToken(), adminToken)
  assert.equal(shared.getAuthenticatedRole(), 'admin')
})

test('missing, malformed, expired, non-Doctor or subject-less tokens are not restored', async () => {
  for (const saved of [null, 'broken JSON', JSON.stringify({ token: 'broken' }), JSON.stringify({ token: token({ exp: 1 }) }), JSON.stringify({ token: token({ role: 'admin' }) }), JSON.stringify({ token: token({ sub: null }) })]) {
    const store = storage()
    if (saved) store.setItem(key, saved)
    const { session } = await load(store)
    assert.equal(session.getDoctorAccessToken(), null)
    assert.equal(store.getItem(key), null)
  }
})

test('profile verification waits for the backend and sends only its Bearer token', async () => {
  let finish, request
  const { session } = await load(storage(), (url, options) => { request = { url, ...options }; return new Promise(resolve => { finish = resolve }) })
  const jwt = token()
  session.setDoctorAccessToken(jwt)
  let complete = false
  const pending = session.verifyDoctorSession(jwt).then(result => { complete = true; return result })
  assert.equal(complete, false)
  assert.equal(request.url, 'http://localhost:3000/api/auth/profile')
  assert.equal(request.headers.Authorization, `Bearer ${jwt}`)
  assert.equal(request.cache, 'no-store')
  finish(response(profile))
  assert.equal((await pending).name, profile.name)
})

test('rejected tokens, wrong roles/identities, and unverified/pending users clear Doctor authentication', async () => {
  for (const [data, status] of [[{}, 401], [{}, 403], [{}, 404], [{ ...profile, role: 'admin' }, 200], [{ ...profile, id: 'different-user' }, 200], [{ ...profile, isEmailVerified: false }, 200], [{ ...profile, invitationStatus: 'pending' }, 200]]) {
    const { session, store } = await load(storage(), async () => response(data, status))
    const jwt = token()
    session.setDoctorAccessToken(jwt)
    assert.equal(await session.verifyDoctorSession(jwt), null)
    assert.equal(session.getDoctorAccessToken(), null)
    assert.equal(store.getItem(key), null)
  }
})

test('network/server/schema errors do not grant access or discard a candidate session', async () => {
  for (const fetch of [async () => { throw Error('Offline') }, async () => response({}, 503), async () => response({})]) {
    const { session, store } = await load(storage(), fetch)
    const jwt = token()
    session.setDoctorAccessToken(jwt)
    await assert.rejects(session.verifyDoctorSession(jwt), /session/)
    assert.equal(session.getDoctorAccessToken(), jwt)
    assert.ok(store.getItem(key))
  }
})

test('late/aborted checks cannot restore a logged-out session or invalidate a newer login', async () => {
  for (const action of ['logout', 'new-login', 'same-token-login', 'abort']) {
    let finish
    const { session } = await load(storage(), () => new Promise(resolve => { finish = resolve }))
    const jwt = token(), newer = token({ exp: Math.floor(Date.now() / 1000) + 1200 })
    session.setDoctorAccessToken(jwt)
    const controller = new AbortController()
    const pending = session.verifyDoctorSession(jwt, controller.signal)
    if (action === 'logout') session.setDoctorAccessToken(null)
    if (action === 'new-login') session.setDoctorAccessToken(newer)
    if (action === 'same-token-login') { session.setDoctorAccessToken(null); session.setDoctorAccessToken(jwt) }
    if (action === 'abort') controller.abort()
    finish(response({}, 401))
    assert.equal(await pending, null)
    assert.equal(session.getDoctorAccessToken(), action === 'logout' ? null : action === 'new-login' ? newer : jwt)
  }
})

test('real login request uses email, password and Doctor role; backend response must match identity', async () => {
  const jwt = token()
  let request
  const { session } = await load(storage(), async (url, options) => {
    request = { url, ...options }
    return response({ accessToken: jwt, user: { id: profile.id, role: 'doctor' } })
  })
  await session.loginDoctor({ email: ' Test@Example.com ', password: 'unit-test-input' })
  assert.equal(request.url, 'http://localhost:3000/api/auth/login')
  assert.deepEqual(JSON.parse(request.body), { email: 'test@example.com', password: 'unit-test-input', role: 'doctor' })
  assert.equal(session.getDoctorAccessToken(), jwt)
})

test('failed login and malformed or non-Doctor responses never create a session', async () => {
  for (const [data, status] of [[{ message: 'Invalid email or password' }, 401], [{ message: 'Please verify your email' }, 401], [{ message: ['Invalid email'] }, 400], [{}, 200], [{ accessToken: token(), user: { id: profile.id, role: 'admin' } }, 200], [{ accessToken: token(), user: { id: 'wrong-user', role: 'doctor' } }, 200]]) {
    const { session } = await load(storage(), async () => response(data, status))
    await assert.rejects(session.loginDoctor({ email: 'test@example.com', password: 'unit-test-input' }))
    assert.equal(session.getDoctorAccessToken(), null)
  }
})

test('logout during login prevents a late response from recreating the session', async () => {
  let finish
  const { session } = await load(storage(), () => new Promise(resolve => { finish = resolve }))
  const pending = session.loginDoctor({ email: 'test@example.com', password: 'unit-test-input' })
  session.setDoctorAccessToken(null)
  finish(response({ accessToken: token(), user: { id: profile.id, role: 'doctor' } }))
  await assert.rejects(pending, /no longer active/)
  assert.equal(session.getDoctorAccessToken(), null)
})

test('restricted storage remains memory-only and session notifications support logout', async () => {
  const { session } = await load({ getItem() { throw Error('Disabled') }, setItem() { throw Error('Disabled') }, removeItem() { throw Error('Disabled') } })
  let notifications = 0
  const unsubscribe = session.subscribeToDoctorSession(() => notifications++)
  const jwt = token()
  session.setDoctorAccessToken(jwt)
  assert.equal(session.getDoctorAccessToken(), jwt)
  session.setDoctorAccessToken(null)
  assert.equal(notifications, 2)
  unsubscribe()
})
