import assert from 'node:assert/strict'
import test from 'node:test'
import { patientRegistrationTestUrl } from '../src/admin/invitationLinks.js'

test('Patient test links use the current frontend origin rather than a fixed port or server URL', () => {
  const result = { user: { role: 'patient' }, invitationToken: 'test/token+with&symbols', frontendInviteUrl: 'https://wrong.example.test/accept-invite?token=wrong' }
  for (const origin of ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5199', 'https://frontend.example.test']) {
    const link = new URL(patientRegistrationTestUrl(result, origin))
    assert.equal(link.origin, origin)
    assert.equal(link.pathname, '/accept-invite')
    assert.equal(link.searchParams.get('token'), result.invitationToken)
  }
})

test('test links require a confirmed Patient response and a token', () => {
  for (const result of [null, {}, { user: { role: 'doctor' }, invitationToken: 'test' }, { user: { role: 'patient' } }, { user: { role: 'patient' }, invitationToken: ' ' }]) {
    assert.equal(patientRegistrationTestUrl(result, 'http://localhost:5199'), null)
  }
  assert.equal(patientRegistrationTestUrl({ user: { role: 'patient' }, invitationToken: 'test' }, 'javascript:alert(1)'), null)
})
