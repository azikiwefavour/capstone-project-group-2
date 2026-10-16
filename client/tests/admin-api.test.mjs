import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const apiSource = await readFile(new URL('../src/admin/api.js', import.meta.url), 'utf8')
const sessionSource = await readFile(new URL('../src/auth/session.js', import.meta.url), 'utf8')

function token(exp = Math.floor(Date.now() / 1000) + 600) {
  return `test.${Buffer.from(JSON.stringify({ exp, role: 'admin' })).toString('base64url')}.test`
}

async function loadModules(fetch) {
  const context = vm.createContext({ fetch, atob, Date, Error })
  const session = new vm.SourceTextModule(sessionSource, { context })
  await session.link(() => { throw new Error('Unexpected import') })
  await session.evaluate()
  session.namespace.setAccessToken(token(), 'admin')
  const api = new vm.SourceTextModule(apiSource, {
    context,
    initializeImportMeta(meta) { meta.env = {} },
  })
  await api.link(() => session)
  await api.evaluate()
  return { api: api.namespace, session: session.namespace }
}

function response(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

test('protected requests attach the token and serialize only the supplied JSON body', async () => {
  let request
  const { api, session } = await loadModules(async (url, options) => {
    request = { url, ...options }
    return response({ message: 'Created' }, 201)
  })
  await api.adminRequest('invite-user', { method: 'POST', body: { name: 'Test fixture', role: 'doctor' } })
  assert.equal(request.url, 'http://localhost:3000/api/admin/invite-user')
  assert.equal(request.headers.Authorization, `Bearer ${session.getAccessToken()}`)
  assert.equal(request.headers['Content-Type'], 'application/json')
  assert.deepEqual(JSON.parse(request.body), { name: 'Test fixture', role: 'doctor' })
})

test('merges invited users by ID without duplicates and never invents Active status', async () => {
  const { api } = await loadModules(async (url) => response(url.endsWith('/invited-users')
    ? [
        { id: 'pending', role: 'doctor', invitationStatus: 'pending' },
        { id: 'accepted-without-verification', role: 'pharmacist', invitationStatus: 'accepted' },
      ]
    : [
        { id: 'pending', name: 'Pending fixture', phone: null, role: 'doctor', isEmailVerified: false },
        { id: 'verified', role: 'patient', isEmailVerified: true },
        { id: 'unverified', role: null, isEmailVerified: false },
      ]))
  const users = await api.getAdminUsers()
  assert.equal(users.length, 4)
  assert.equal(users.find((user) => user.id === 'pending').status, 'pending')
  assert.equal(users.find((user) => user.id === 'pending').name, 'Pending fixture')
  assert.equal(users.find((user) => user.id === 'verified').status, 'active')
  assert.equal(users.find((user) => user.id === 'unverified').status, null)
  assert.equal(users.find((user) => user.id === 'accepted-without-verification').status, null)
  assert.equal(users[0].phone, '')
  assert.equal(users[0].role, 'Doctor')
  const safeUser = api.normalizeUser({ invitationToken: 'private', password: 'private', emailOtp: 'private' })
  assert.equal(Object.hasOwn(safeUser, 'invitationToken'), false)
  assert.equal(Object.hasOwn(safeUser, 'password'), false)
  assert.equal(Object.hasOwn(safeUser, 'emailOtp'), false)
})

test('empty lists remain empty and malformed lists fail instead of showing a false empty state', async () => {
  const empty = await loadModules(async () => response([]))
  assert.equal((await empty.api.getAdminUsers()).length, 0)
  const malformed = await loadModules(async () => response({ users: [] }))
  await assert.rejects(malformed.api.getAdminUsers(), /unexpected user list/)
})

test('401 clears authentication; 403 and validation failures preserve the session', async () => {
  for (const status of [401, 403, 400, 409]) {
    const { api, session } = await loadModules(async () => response({ message: ['First error.', 'Second error.'] }, status))
    await assert.rejects(api.adminRequest('users'), /First error\. Second error\./)
    assert.equal(Boolean(session.getAccessToken()), status !== 401)
  }
})

test('network and cancellation errors are handled without invalidating authentication', async () => {
  const offline = await loadModules(async () => { throw new Error('Offline') })
  await assert.rejects(offline.api.adminRequest('users'), /Unable to connect/)
  assert.ok(offline.session.getAccessToken())
  const aborted = await loadModules(async () => { throw new DOMException('Cancelled', 'AbortError') })
  await assert.rejects(aborted.api.adminRequest('users'), { name: 'AbortError' })
})

test('expired and malformed tokens are not sent; logout notifies subscribers', async () => {
  let calls = 0
  const { api, session } = await loadModules(async () => { calls++; return response([]) })
  for (const invalid of [token(1), 'invalid']) {
    session.setAccessToken(invalid, 'admin')
    assert.equal(session.getAccessToken(), null)
    assert.equal(session.getAuthenticatedRole(), null)
    await assert.rejects(api.adminRequest('users'), /log in as an admin/)
  }
  assert.equal(calls, 0)
  let notifications = 0
  const unsubscribe = session.subscribeToSession(() => { notifications++ })
  session.setAccessToken(null)
  assert.equal(notifications, 1)
  unsubscribe()
  session.setAccessToken(token(), 'admin')
  assert.equal(notifications, 1)
})
