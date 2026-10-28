import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const source = await readFile(new URL('../src/super-admin/authentication.js', import.meta.url), 'utf8')
const sharedSource = await readFile(new URL('../src/auth/session.js', import.meta.url), 'utf8')
const key = 'medtrailSuperAdminSession'
// Isolated unit-test fixtures only. Production access always requires backend JWT validation.
const token = (payload = {}) => `test.${Buffer.from(JSON.stringify({ sub: 'super_admin-fixture', role: 'super_admin', exp: Math.floor(Date.now() / 1000) + 600, ...payload })).toString('base64url')}.test`
const profile = { id: 'super_admin-fixture', name: 'SuperAdmin test fixture', role: 'super_admin', email: 'super_admin@example.test', isEmailVerified: true }
const response = (body, status = 200) => new Response(JSON.stringify(body), { status })
function storage() {
  const entries = new Map()
  return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) }
}
async function load(store = storage(), fetch = async () => response(profile), env = {}) {
  const context = vm.createContext({ sessionStorage: store, fetch, atob, Date, Error })
  const shared = new vm.SourceTextModule(sharedSource, { context })
  await shared.link(() => { throw Error('Unexpected shared import') })
  await shared.evaluate()
  const session = new vm.SourceTextModule(source, { context, initializeImportMeta(meta) { meta.env = env } })
  await session.link(() => shared)
  await session.evaluate()
  return { session: session.namespace, shared: shared.namespace, store }
}

test('restores a SuperAdmin token after reload and verifies it with the backend before granting access', async () => {
  const store = storage(), jwt = token()
  const original = await load(store)
  original.session.setSuperAdminAccessToken(jwt)
  const restored = await load(store)
  assert.equal(restored.session.getSuperAdminAccessToken(), jwt)
  assert.equal((await restored.session.verifySuperAdminSession(jwt)).name, profile.name)
  assert.deepEqual(JSON.parse(store.getItem(key)), { token: jwt })
  restored.session.setSuperAdminAccessToken(null)
  assert.equal((await load(store)).session.getSuperAdminAccessToken(), null)
  assert.equal(store.getItem(key), null)
})

test('SuperAdmin login and logout never overwrite an Admin session', async () => {
  const store = storage()
  const { session, shared } = await load(store)
  const adminToken = token({ role: 'admin' })
  shared.setAccessToken(adminToken, 'admin')
  const saved = store.getItem('medtrailAdminSession')
  session.setSuperAdminAccessToken(token())
  session.setSuperAdminAccessToken(null)
  assert.equal(store.getItem('medtrailAdminSession'), saved)
  assert.equal(shared.getAccessToken(), adminToken)
  assert.equal(shared.getAuthenticatedRole(), 'admin')
})

test('missing, malformed, expired, non-SuperAdmin or subject-less tokens are not restored', async () => {
  for (const saved of [null, 'broken JSON', JSON.stringify({ token: 'broken' }), JSON.stringify({ token: token({ exp: 1 }) }), JSON.stringify({ token: token({ role: 'admin' }) }), JSON.stringify({ token: token({ sub: null }) })]) {
    const store = storage()
    if (saved) store.setItem(key, saved)
    const { session } = await load(store)
    assert.equal(session.getSuperAdminAccessToken(), null)
    assert.equal(store.getItem(key), null)
  }
})

test('profile verification waits for the backend and sends only its Bearer token', async () => {
  let finish, request
  const { session } = await load(storage(), (url, options) => { request = { url, ...options }; return new Promise(resolve => { finish = resolve }) })
  const jwt = token()
  session.setSuperAdminAccessToken(jwt)
  let complete = false
  const pending = session.verifySuperAdminSession(jwt).then(result => { complete = true; return result })
  assert.equal(complete, false)
  assert.equal(request.url, 'http://localhost:3000/api/auth/profile')
  assert.equal(request.headers.Authorization, `Bearer ${jwt}`)
  assert.equal(request.cache, 'no-store')
  finish(response(profile))
  assert.deepEqual({ ...await pending }, { name: profile.name, email: profile.email })
})

test('rejected tokens, wrong roles/identities, and unverified/pending users clear SuperAdmin authentication', async () => {
  for (const [data, status] of [[{}, 401], [{}, 403], [{}, 404], [{ ...profile, role: 'admin' }, 200], [{ ...profile, id: 'different-user' }, 200], [{ ...profile, isEmailVerified: false }, 200], [{ ...profile, invitationStatus: 'pending' }, 200]]) {
    const { session, store } = await load(storage(), async () => response(data, status))
    const jwt = token()
    session.setSuperAdminAccessToken(jwt)
    assert.equal(await session.verifySuperAdminSession(jwt), null)
    assert.equal(session.getSuperAdminAccessToken(), null)
    assert.equal(store.getItem(key), null)
  }
})

test('network/server/schema errors do not grant access or discard a candidate session', async () => {
  for (const fetch of [async () => { throw Error('Offline') }, async () => response({}, 503), async () => response({})]) {
    const { session, store } = await load(storage(), fetch)
    const jwt = token()
    session.setSuperAdminAccessToken(jwt)
    await assert.rejects(session.verifySuperAdminSession(jwt), /session/)
    assert.equal(session.getSuperAdminAccessToken(), jwt)
    assert.ok(store.getItem(key))
  }
})

test('late/aborted checks cannot restore a logged-out session or invalidate a newer login', async () => {
  for (const action of ['logout', 'new-login', 'same-token-login', 'abort']) {
    let finish
    const { session } = await load(storage(), () => new Promise(resolve => { finish = resolve }))
    const jwt = token(), newer = token({ exp: Math.floor(Date.now() / 1000) + 1200 })
    session.setSuperAdminAccessToken(jwt)
    const controller = new AbortController()
    const pending = session.verifySuperAdminSession(jwt, controller.signal)
    if (action === 'logout') session.setSuperAdminAccessToken(null)
    if (action === 'new-login') session.setSuperAdminAccessToken(newer)
    if (action === 'same-token-login') { session.setSuperAdminAccessToken(null); session.setSuperAdminAccessToken(jwt) }
    if (action === 'abort') controller.abort()
    finish(response({}, 401))
    assert.equal(await pending, null)
    assert.equal(session.getSuperAdminAccessToken(), action === 'logout' ? null : action === 'new-login' ? newer : jwt)
  }
})


test('login uses the verified role, configured origin, and trusted profile before succeeding', async () => {
  const requests = [], jwt = token()
  const { session, store } = await load(storage(), async (url, options) => {
    requests.push({ url, ...options })
    return response(url.endsWith('/login') ? { accessToken: jwt, user: { id: profile.id, role: 'super_admin' } } : profile)
  }, { VITE_API_BASE_URL: 'https://api.example.test///' })
  const result = await session.authenticateSuperAdmin({ email: ' TEST@Example.test ', password: 'isolated-input' })
  assert.equal(requests[0].url, 'https://api.example.test/api/auth/login')
  assert.deepEqual(JSON.parse(requests[0].body), { email: 'test@example.test', password: 'isolated-input', role: 'super_admin' })
  assert.equal(requests[1].url, 'https://api.example.test/api/auth/profile')
  assert.equal(requests[1].headers.Authorization, `Bearer ${jwt}`)
  assert.equal(result.name, profile.name)
  assert.deepEqual(JSON.parse(store.getItem(key)), { token: jwt })
})

test('login rejects wrong roles, mismatched identities, invalid tokens, and backend rejection', async () => {
  for (const [body, status] of [
    [{ message: 'Invalid email or password.' }, 401],
    [{ accessToken: token({ role: 'admin' }), user: { id: profile.id, role: 'admin' } }, 200],
    [{ accessToken: token(), user: { id: 'other', role: 'super_admin' } }, 200],
    [{ accessToken: 'malformed', user: { id: profile.id, role: 'super_admin' } }, 200],
  ]) {
    const { session, store } = await load(storage(), async () => response(body, status))
    await assert.rejects(session.authenticateSuperAdmin({ email: 'test@example.test', password: 'isolated-input' }))
    assert.equal(session.getSuperAdminAccessToken(), null)
    assert.equal(store.getItem(key), null)
  }
})

test('failed or aborted profile verification during login never leaves a candidate session', async () => {
  for (const outcome of ['role', 'identity', 'unverified', 'pending', 'offline', 'schema', 'abort']) {
    const controller = new AbortController()
    const { session, store } = await load(storage(), async url => {
      if (url.endsWith('/login')) return response({ accessToken: token(), user: { id: profile.id, role: 'super_admin' } })
      if (outcome === 'offline') throw Error('Offline')
      if (outcome === 'abort') controller.abort()
      return response(outcome === 'schema' ? {} : { ...profile,
        ...(outcome === 'role' ? { role: 'admin' } : {}),
        ...(outcome === 'identity' ? { id: 'other' } : {}),
        ...(outcome === 'unverified' ? { isEmailVerified: false } : {}),
        ...(outcome === 'pending' ? { invitationStatus: 'pending' } : {}),
      })
    })
    await assert.rejects(session.authenticateSuperAdmin({ email: 'test@example.test', password: 'isolated-input', signal: controller.signal }))
    assert.equal(session.getSuperAdminAccessToken(), null)
    assert.equal(store.getItem(key), null)
  }
})

test('a late login response cannot undo logout', async () => {
  let finish
  const { session } = await load(storage(), () => new Promise(resolve => { finish = resolve }))
  const pending = session.authenticateSuperAdmin({ email: 'test@example.test', password: 'isolated-input' })
  session.setSuperAdminAccessToken(null)
  finish(response({ accessToken: token(), user: { id: profile.id, role: 'super_admin' } }))
  await assert.rejects(pending, /no longer active/)
  assert.equal(session.getSuperAdminAccessToken(), null)
})

test('restricted storage supports memory-only login without persisting credentials', async () => {
  const store = { getItem() { throw Error('Disabled') }, setItem() { throw Error('Disabled') }, removeItem() { throw Error('Disabled') } }
  const { session } = await load(store, async url => response(url.endsWith('/login') ? { accessToken: token(), user: { id: profile.id, role: 'super_admin' } } : profile))
  await session.authenticateSuperAdmin({ email: 'test@example.test', password: 'isolated-input' })
  assert.ok(session.getSuperAdminAccessToken())
  session.setSuperAdminAccessToken(null)
  assert.equal(session.getSuperAdminAccessToken(), null)
})
