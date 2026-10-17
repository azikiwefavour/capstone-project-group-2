import assert from 'node:assert/strict'
import test from 'node:test'
import { filterAndSortPatients, getMedicationCount } from '../src/doctor/patients.js'

// Isolated test fixtures, never imported by the application.
const patients = [
  { id: 'b', name: 'Beta fixture', email: 'b@example.test', phone: '200', currentMedicationCount: 3 },
  { id: 'a', name: 'Alpha fixture', email: 'a@example.test', phone: '100', currentMedications: [] },
  { id: 'c', name: 'Gamma fixture', email: 'c@example.test', phone: null },
]

test('only actual counts or explicitly current medication arrays produce a count', () => {
  assert.equal(getMedicationCount(patients[0]), 3)
  assert.equal(getMedicationCount(patients[1]), 0)
  assert.equal(getMedicationCount(patients[2]), null)
  assert.equal(getMedicationCount({ currentMedicationCount: -1 }), null)
  assert.equal(getMedicationCount({ currentMedicationCount: '5' }), null)
  assert.equal(getMedicationCount({ currentMedications: [{ id: 'medication-fixture' }] }), 1)
  assert.equal(getMedicationCount({ medications: [] }), null)
})

test('name search is case-insensitive and trims whitespace without searching emails', () => {
  assert.deepEqual(filterAndSortPatients(patients, ' ALPHA ', 'all', 'name-asc').map(p => p.id), ['a'])
  assert.equal(filterAndSortPatients(patients, 'example.test', 'all', 'name-asc').length, 0)
  assert.equal(filterAndSortPatients([], '', 'all', 'name-asc').length, 0)
})

test('medication filters exclude unknown counts instead of treating them as zero', () => {
  assert.deepEqual(filterAndSortPatients(patients, '', 'with', 'name-asc').map(p => p.id), ['b'])
  assert.deepEqual(filterAndSortPatients(patients, '', 'without', 'name-asc').map(p => p.id), ['a'])
})

test('column sorts work in both directions and leave input unchanged', () => {
  assert.deepEqual(filterAndSortPatients(patients, '', 'all', 'name-asc').map(p => p.id), ['a', 'b', 'c'])
  assert.deepEqual(filterAndSortPatients(patients, '', 'all', 'email-desc').map(p => p.id), ['c', 'b', 'a'])
  assert.deepEqual(filterAndSortPatients(patients, '', 'all', 'phone-desc').map(p => p.id), ['b', 'a', 'c'])
  assert.deepEqual(filterAndSortPatients(patients, '', 'all', 'medications-desc').map(p => p.id), ['b', 'a', 'c'])
  assert.deepEqual(filterAndSortPatients(patients, '', 'all', 'medications-asc').map(p => p.id), ['a', 'b', 'c'])
  assert.deepEqual(patients.map(p => p.id), ['b', 'a', 'c'])
})
