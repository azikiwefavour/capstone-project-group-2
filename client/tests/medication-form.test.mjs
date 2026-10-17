import assert from 'node:assert/strict'
import test from 'node:test'
import { validateMedicationDetails } from '../src/doctor/components/medicationForm.js'

test('all five prescription fields are required, including whitespace-only values', () => {
  assert.deepEqual(Object.keys(validateMedicationDetails({})), ['medication', 'dose', 'frequency', 'duration', 'reason'])
  assert.equal(Object.keys(validateMedicationDetails({ medication: ' ', dose: '\t', frequency: '', duration: '', reason: ' ' })).length, 5)
})

test('complete details allow review without producing a saved record or timestamp', () => {
  const values = { medication: 'Test input', dose: 'Test dose', frequency: 'Once daily', duration: '7 days', reason: 'Test indication' }
  const original = { ...values }
  assert.deepEqual(validateMedicationDetails(values), {})
  assert.deepEqual(values, original)
  assert.equal(Object.hasOwn(values, 'date'), false)
  assert.equal(Object.hasOwn(values, 'id'), false)
})

test('dropdown selections must be supported options', () => {
  const errors = validateMedicationDetails({ medication: 'Test input', dose: 'Test dose', frequency: 'Doctor', duration: 'invalid', reason: 'Test indication' })
  assert.equal(errors.frequency, 'Select a valid frequency.')
  assert.equal(errors.duration, 'Select a valid duration.')
})
