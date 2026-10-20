import assert from 'node:assert/strict'
import test from 'node:test'
import { getSettingsPasswordErrors } from '../src/auth/settingsPassword.js'

test('Settings passwords require non-whitespace values and the existing password policy', () => {
  const blank = getSettingsPasswordErrors({ currentPassword: '  ', newPassword: ' ', confirmPassword: '' })
  assert.ok(Object.values(blank).every(Boolean))
  for (const value of ['Short1!', 'lowercase1!', 'NoNumber!!', 'NoSymbol123']) {
    assert.ok(getSettingsPasswordErrors({ currentPassword: 'current', newPassword: value, confirmPassword: value }).newPassword)
  }
  const valid = { currentPassword: 'current', newPassword: 'TestPassword1!', confirmPassword: 'TestPassword1!' }
  assert.deepEqual(getSettingsPasswordErrors(valid), { currentPassword: '', newPassword: '', confirmPassword: '' })
  assert.equal(getSettingsPasswordErrors({ ...valid, confirmPassword: 'Different1!' }).confirmPassword, 'Passwords do not match.')
})
