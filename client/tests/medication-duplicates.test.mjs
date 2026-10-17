import assert from 'node:assert/strict'
import test from 'node:test'
import { checkMedicationDuplicate } from '../src/doctor/components/medicationDuplicates.js'

// Isolated fixtures only, not patient records imported by the application.
const values = { medication: 'Test medication', dose: '500 mg', frequency: 'Twice daily', duration: '7 days', reason: 'Test reason' }
const dataset = (records, overrides = {}) => ({ source: 'backend', patientId: 'patient-1', records, complete: true, ...overrides })

test('normalizes both records consistently without mutating entered or existing values', () => {
  const existing = { name: '  TEST   Medication ', dose: ' 500 MG ', frequency: ' TWICE\nDAILY ', duration: '7 DAYS', reason: ' TEST  reason ' }
  const original = { ...existing }
  const result = checkMedicationDuplicate(values, 'patient-1', dataset([existing]))
  assert.equal(result.status, 'found')
  assert.equal(result.existing.medication, existing.name)
  assert.deepEqual(existing, original)
})

test('each of the five fields must match; different dose or frequency never matches', () => {
  for (const field of Object.keys(values)) {
    assert.equal(checkMedicationDuplicate(values, 'patient-1', dataset([{ ...values, [field]: 'Different value' }])).status, 'none')
  }
  assert.equal(checkMedicationDuplicate(values, 'patient-1', dataset([{ ...values, dose: '500mg' }])).status, 'none')
})

test('missing, preview, unscoped, and wrong-patient data cannot produce a duplicate conclusion', () => {
  for (const data of [null, [], dataset([values], { source: 'preview' }), dataset([values], { patientId: 'other-patient' }), dataset(null), dataset([values], { patientId: undefined })]) {
    assert.equal(checkMedicationDuplicate(values, 'patient-1', data).status, 'unavailable')
  }
  assert.equal(checkMedicationDuplicate(values, null, dataset([values])).status, 'unavailable')
  assert.equal(checkMedicationDuplicate({}, 'patient-1', dataset([])).status, 'unavailable')
})

test('missing fields never stand in for a reason or falsely clear an incomplete check', () => {
  const { reason, ...missingReason } = values
  assert.equal(checkMedicationDuplicate(values, 'patient-1', dataset([{ ...missingReason, indication: reason, description: reason }])).status, 'unavailable')
  assert.equal(checkMedicationDuplicate(values, 'patient-1', dataset([null])).status, 'unavailable')
  assert.equal(checkMedicationDuplicate(values, 'patient-1', dataset([{ ...values, patientId: 'other-patient' }])).status, 'unavailable')
})

test('partial sets can prove a real match but cannot prove no duplicate exists', () => {
  assert.equal(checkMedicationDuplicate(values, 'patient-1', dataset([values], { complete: false })).status, 'found')
  assert.equal(checkMedicationDuplicate(values, 'patient-1', dataset([{ ...values, dose: 'Other dose' }], { complete: false })).status, 'unavailable')
  assert.equal(checkMedicationDuplicate(values, 'patient-1', dataset([], { complete: false })).status, 'unavailable')
  assert.equal(checkMedicationDuplicate(values, 'patient-1', dataset([])).status, 'none')
})
