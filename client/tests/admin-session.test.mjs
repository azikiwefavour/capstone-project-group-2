import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const sessionSource = await readFile(new URL('../src/auth/session.js', import.meta.url), 'utf8')
const verificationSource = await readFile(new URL('../src/auth/adminSession.js', import.meta.url), 'utf8')
const key = 'medtrailAdminSession'
const token = (exp = Math.floor(Date.now() / 1000) + 600) =>
  `test.${Buffer.from(JSON.stringify({ exp, role: 'admin' })).toString('base64url')}.test`
const response = (data, status = 200) => new Response(JSON.stringify(data), { status })
const profile = { id: 'admin-fixture', name: 'Admin fixture', role: 'admin', email: 'admin@example.test', isEmailVerified: true }

function storage() {
  const entries = new Map()
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key),
  }
}

async function load(sessionStorage, fetch = async () => response(profile)) {
  const context = vm.createContext({ sessionStorage, fetch, atob, Date, Error })
  const session = new vm.SourceTextModule(sessionSource, { context })
  await session.link(() => { throw new Error('Unexpected import') })
  await session.evaluate()
  const verification = new vm.SourceTextModule(verificationSource, {
    context,
    initializeImportMeta(meta) { meta.env = {} },
  })
  await verification.link(() => session)
  await verification.evaluate()
  return { session: session.namespace, verify: verification.namespace.verifyAdminSession }
}

test('Admin login survives a fresh module load, then logout removes the stored session', async () => {
  const store = storage()
  const original = await load(store)
  const jwt = token()
  original.session.setAccessToken(jwt, 'admin')
  const restored = await load(store)
  assert.equal(restored.session.getAccessToken(), jwt)
  assert.equal(restored.session.getAuthenticatedRole(), 'admin')
  assert.equal((await restored.verify(jwt)).name, profile.name)
  restored.session.setAccessToken(null)
  assert.equal(store.getItem(key), null)
  assert.equal((await load(store)).session.getAccessToken(), null)
})

test('Doctor and other roles remain memory-only and do not restore an Admin session', async () => {
  const store = storage()
  const current = await load(store)
  current.session.setAccessToken(token(), 'admin')
  current.session.setAccessToken(token(), 'doctor')
  assert.equal(current.session.getAuthenticatedRole(), 'doctor')
  assert.equal(store.getItem(key), null)
  assert.equal((await load(store)).session.getAccessToken(), null)
})

test('missing, malformed, expired, or incorrectly labelled stored sessions are discarded', async () => {
  for (const value of [null, 'broken JSON', JSON.stringify({ token: 'invalid', role: 'admin' }),
    JSON.stringify({ token: token(1), role: 'admin' }), JSON.stringify({ token: token(), role: 'doctor' })]) {
    const store = storage()
    if (value) store.setItem(key, value)
    const { session } = await load(store)
    assert.equal(session.getAccessToken(), null)
    assert.equal(store.getItem(key), null)
  }
})

test('profile verification sends a bearer token and waits for a backend-confirmed Admin profile', async () => {
  let finish
  let request
  const store = storage()
  const { session, verify } = await load(store, (url, options) => {
    request = { url, ...options }
    return new Promise(resolve => { finish = resolve })
  })
  const jwt = token()
  session.setAccessToken(jwt, 'admin')
  let complete = false
  const pending = verify(jwt).then(result => { complete = true; return result })
  assert.equal(complete, false)
  assert.equal(request.url, 'http://localhost:3000/api/auth/profile')
  assert.equal(request.headers.Authorization, `Bearer ${jwt}`)
  assert.equal(request.cache, 'no-store')
  finish(response(profile))
  assert.deepEqual({ ...await pending }, { name: profile.name, email: profile.email })
})

test('401, 403, deleted accounts, non-Admin roles, and unverified accounts clear the session', async () => {
  for (const [data, status] of [
    [{ message: 'Expired' }, 401], [{ message: 'Forbidden' }, 403], [{ message: 'Deleted' }, 404],
    [{ ...profile, role: 'doctor' }, 200], [{ ...profile, isEmailVerified: false }, 200],
    [{ ...profile, invitationStatus: 'pending' }, 200],
  ]) {
    const store = storage()
    const { session, verify } = await load(store, async () => response(data, status))
    session.setAccessToken(token(), 'admin')
    assert.equal(await verify(session.getAccessToken()), null)
    assert.equal(session.getAccessToken(), null)
    assert.equal(store.getItem(key), null)
  }
})

test('network/server errors and unexpected profile schemas fail closed without discarding a legitimate token', async () => {
  for (const fetch of [
    async () => { throw new Error('Offline') },
    async () => response({ message: 'Unavailable' }, 503),
    async () => response({}),
  ]) {
    const store = storage()
    const { session, verify } = await load(store, fetch)
    session.setAccessToken(token(), 'admin')
    await assert.rejects(verify(session.getAccessToken()), /session/)
    assert.ok(session.getAccessToken())
    assert.ok(store.getItem(key))
  }
})

test('late validation responses cannot overwrite a newer login or logout', async () => {
  let finish
  const store = storage()
  const { session, verify } = await load(store, () => new Promise(resolve => { finish = resolve }))
  session.setAccessToken(token(), 'admin')
  const pending = verify(session.getAccessToken())
  const newToken = token(Math.floor(Date.now() / 1000) + 1200)
  session.setAccessToken(newToken, 'admin')
  finish(response({ message: 'Expired' }, 401))
  assert.equal(await pending, null)
  assert.equal(session.getAccessToken(), newToken)
})

test('aborted validation does not clear the session', async () => {
  const store = storage()
  const { session, verify } = await load(store, async () => response({ message: 'Expired' }, 401))
  session.setAccessToken(token(), 'admin')
  const controller = new AbortController()
  controller.abort()
  assert.equal(await verify(session.getAccessToken(), controller.signal), null)
  assert.ok(session.getAccessToken())
})

test('disabled browser storage falls back to an in-memory login without crashing', async () => {
  const store = {
    getItem() { throw new Error('Storage disabled') },
    setItem() { throw new Error('Storage disabled') },
    removeItem() { throw new Error('Storage disabled') },
  }
  const { session } = await load(store)
  const jwt = token()
  session.setAccessToken(jwt, 'admin')
  assert.equal(session.getAccessToken(), jwt)
  session.setAccessToken(null)
  assert.equal(session.getAccessToken(), null)
})
