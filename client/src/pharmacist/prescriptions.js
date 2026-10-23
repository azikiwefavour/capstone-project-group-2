import { formatMedicationTimestamp } from '../doctor/medicationDates'
import { pharmacistGet, pharmacistPost } from './api'

const text = value => typeof value === 'string' ? value.trim() : ''

async function getPrescriptions(status, signal) {
  const data = await pharmacistGet(`prescriptions?status=${status}`, signal)
  if (!Array.isArray(data) || !data.every(record => record && text(record.id))
    || new Set(data.map(record => record.id)).size !== data.length) {
    throw new Error('The server returned unexpected prescription information. Please try again.')
  }
  return data
}

export async function getVerificationQueue(signal) {
  const data = await getPrescriptions('pending', signal)

  // PENDING is the backend's unverified state. Never relabel other statuses.
  // Retain only the fields this read-only queue needs.
  return data.filter(record => text(record.status).toLowerCase() === 'pending').map(record => ({
    id: record.id,
    patientName: text(record.patientName),
    medicationName: text(record.medicationName),
    reason: text(record.reason),
    doctorName: text(record.doctorName),
    timestamp: formatMedicationTimestamp(record.createdAt),
  })).sort((a, b) => {
    // Unknown timestamps follow known dates; do not guess from a display string.
    if (!a.timestamp) return b.timestamp ? 1 : 0
    if (!b.timestamp) return -1
    return Date.parse(a.timestamp.dateTime) - Date.parse(b.timestamp.dateTime)
  })
}

function prescriptionDetails(record) {
  return {
    id: record.id, patientName: text(record.patientName),
    medicationName: text(record.medicationName), reason: text(record.reason),
    doctorName: text(record.doctorName), dosage: text(record.dosage),
    frequency: text(record.frequency), doseAndFrequency: text(record.doseAndFrequency),
    duration: text(record.duration), status: text(record.status).toLowerCase(),
    timestamp: formatMedicationTimestamp(record.createdAt),
  }
}

function clarificationDetails(record) {
  return {
    concern: text(record.concern), notes: text(record.clarificationReason),
    response: text(record.clarificationResponse), status: text(record.status).toLowerCase(),
  }
}

const hasClarification = record => ['awaiting_clarification', 'clarified'].includes(text(record.status).toLowerCase())
  || Boolean(text(record.clarificationReason) || text(record.clarificationResponse))

export function getClarificationStatus(status) {
  const labels = {
    awaiting_clarification: 'Pending clarification', clarified: 'Clarified',
    pending: 'Unverified', active: 'Active', dispensed: 'Dispensed',
    discontinued: 'Discontinued', completed: 'Completed', cancelled: 'Cancelled',
  }
  return Object.hasOwn(labels, status) ? labels[status] : status || 'Status unavailable'
}

export async function getPharmacistClarifications(signal) {
  // Include replies and past requests as well as pending ones. The API's
  // awaiting_clarification filter alone would hide a doctor's response.
  const records = await getPrescriptions('all', signal)
  return records.filter(hasClarification).map(record => ({
    ...prescriptionDetails(record), clarification: clarificationDetails(record),
  }))
}

export async function getPharmacistPrescriptionDetails(prescriptionId, signal) {
  if (typeof prescriptionId !== 'string' || !prescriptionId.trim()) {
    throw new Error('Please select a prescription from Queue.')
  }
  // There is no pharmacy GET-by-ID or patient-profile endpoint. Resolve the ID
  // from the hospital-scoped list, including on direct visits and reloads.
  const records = await getPrescriptions('all', signal)
  const record = records.find(candidate => candidate.id === prescriptionId)
  if (!record) throw new Error('This prescription is not available in your hospital records. Return to Queue to select a prescription.')
  const patientId = text(record.patientId)
  return {
    prescription: prescriptionDetails(record),
    clarification: hasClarification(record) ? clarificationDetails(record) : null,
    // The pharmacy contract does not expose patient age or gender.
    patient: { id: patientId || null, name: text(record.patientName), age: null, gender: '' },
    // Match the Doctor backend definition: current = active + pending. Never
    // group by name, or confuse unavailable patient identity with an empty list.
    currentMedications: patientId ? records.filter(candidate => candidate.patientId === patientId
      && ['active', 'pending', 'dispensed', 'clarified', 'awaiting_clarification'].includes(text(candidate.status).toLowerCase())).map(prescriptionDetails) : null,
  }
}

export async function getPharmacistClarificationDetails(prescriptionId, signal) {
  const details = await getPharmacistPrescriptionDetails(prescriptionId, signal)
  if (!details.clarification) throw new Error('No clarification request is available for this prescription. Return to Clarifications to select a request.')
  return details
}

export async function getDispensedMedications(signal) {
  const records = await getPrescriptions('dispensed', signal)
  return records.filter(record => text(record.status).toLowerCase() === 'dispensed').map(record => ({
    id: record.id, medicationName: text(record.medicationName), reason: text(record.reason),
    patientName: text(record.patientName), dosage: text(record.dosage),
    frequency: text(record.frequency), doseAndFrequency: text(record.doseAndFrequency),
    doctorName: text(record.doctorName),
    // The pharmacy contract has no dispensing-event timestamp. Its `date` is
    // createdAt; updatedAt can also change after dispensing. Never relabel either.
    dispensedOn: null,
  }))
}

export async function verifyAndDispensePrescription(prescriptionId, signal) {
  if (typeof prescriptionId !== 'string' || !prescriptionId.trim()) {
    throw new Error('Please select a prescription to verify.')
  }
  return pharmacistPost(`prescriptions/${encodeURIComponent(prescriptionId.trim())}/verify`, undefined, signal, 'prescription verification')
}

