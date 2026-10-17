import assert from 'node:assert/strict'
import test from 'node:test'
import { getModificationValues, validateModificationDetails, validateMedicationDetails } from '../src/doctor/components/medicationForm.js'

test('copies all five fields from the selected prescription without changing the record', () => {
  const prescription = Object.freeze({ id: 'selected-record', name: 'Selected medication', dose: '25 mg', frequency: 'Every morning', duration: '21 days', reason: 'Recorded reason', status: 'Active' })
  const values = getModificationValues(prescription)
  assert.deepEqual(values, { medication: 'Selected medication', dose: '25 mg', frequency: 'Every morning', duration: '21 days', reason: 'Recorded reason' })
  values.medication = 'Edited locally'
  assert.equal(prescription.name, 'Selected medication')
  assert.equal(prescription.status, 'Active')
  assert.equal(Object.hasOwn(values, 'id'), false)
  assert.equal(Object.hasOwn(values, 'date'), false)
})

test('missing fields stay empty and required; description is never substituted for reason', () => {
  const values = getModificationValues({ description: 'Not a prescription reason', indication: 'Not an explicit reason', dose: 12 })
  assert.deepEqual(values, { medication: '', dose: '', frequency: '', duration: '', reason: '' })
  assert.equal(Object.keys(validateModificationDetails(values, values)).length, 5)
  assert.deepEqual(getModificationValues(null), values)
})

test('preserves existing nonstandard dropdown values without weakening Add validation', () => {
  const values = getModificationValues({ name: 'Selected medication', dose: '25 mg', frequency: 'Every morning', duration: '21 days', reason: 'Recorded reason' })
  assert.deepEqual(validateModificationDetails(values, values), {})
  assert.ok(validateMedicationDetails(values).frequency)
  assert.ok(validateMedicationDetails(values).duration)
  const edited = { ...values, frequency: 'Once daily', duration: '7 days' }
  assert.deepEqual(validateModificationDetails(edited, values), {})
  assert.ok(validateModificationDetails({ ...values, frequency: 'unavailable option' }, values).frequency)
  assert.ok(validateModificationDetails({ ...values, reason: ' ' }, values).reason)
})
