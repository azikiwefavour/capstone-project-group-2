import assert from 'node:assert/strict'
import test from 'node:test'
import { getModificationValues, validateDiscontinuationReason } from '../src/doctor/components/medicationForm.js'

test('a discontinuation reason is required and cannot be whitespace or a non-string', () => {
  for (const reason of ['', '   ', '\n\t', null, undefined, 5]) assert.ok(validateDiscontinuationReason(reason))
  assert.equal(validateDiscontinuationReason('Patient is experiencing adverse effects.'), '')
})

test('discontinuation reason stays separate from the original prescription and never changes its status', () => {
  const prescription = Object.freeze({ id: 'selected-record', name: 'Recorded medication', dose: 'Recorded dose', frequency: 'Once daily', duration: '7 days', reason: 'Original prescription reason', status: 'Active' })
  const details = getModificationValues(prescription)
  const discontinuationReason = 'Patient is experiencing adverse effects.'
  assert.equal(validateDiscontinuationReason(discontinuationReason), '')
  assert.equal(details.reason, 'Original prescription reason')
  assert.equal(prescription.reason, details.reason)
  assert.equal(prescription.status, 'Active')
  assert.equal(Object.hasOwn(details, 'discontinuationReason'), false)
})
