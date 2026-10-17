import { doctorRequest, getDoctorPatients } from './api'
import { getModificationValues, validateMedicationDetails, validateModificationDetails, validateDiscontinuationReason } from './components/medicationForm'
import { checkMedicationDuplicate } from './components/medicationDuplicates'

const text = value => typeof value === 'string' ? value : ''
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
const hasId = record => typeof record?.id === 'string' && Boolean(record.id.trim())

export async function getDoctorPatientDetails(patientId, signal) {
  if (!uuid(patientId)) throw new Error('Please select a valid patient from Patients.')
  // The list is hospital-scoped. Do not expose arbitrary patients through a typed URL.
  const patients = await getDoctorPatients(signal)
  if (!patients.some(patient => patient.id === patientId)) throw new Error('This patient is not available in your Patients list.')
  const data = await doctorRequest(`patients/${encodeURIComponent(patientId)}`, { signal })
  if (data?.patient?.id !== patientId || ![data.currentMedications, data.medicationHistory].every(records => Array.isArray(records) && records.every(hasId))) {
    throw new Error('The server returned unexpected patient medication records. Please try again.')
  }
  const medication = record => ({
    id: record.id, patientId, name: text(record.medicationName), dose: text(record.dosage),
    frequency: text(record.frequency), duration: text(record.duration), reason: text(record.reason),
    prescribedBy: text(record.prescribedBy), rawStatus: text(record.status),
    // Pending pharmacy review corresponds to the existing Unverified display badge.
    status: record.status === 'pending' ? 'unverified' : text(record.status),
    date: record.createdAt,
  })
  const currentMedications = data.currentMedications.map(medication)
  return {
    patient: {
      id: patientId, name: text(data.patient.name), email: text(data.patient.email), phone: text(data.patient.phone),
      age: Number.isSafeInteger(data.patient.age) && data.patient.age >= 0 ? data.patient.age : null,
      gender: text(data.patient.gender), currentMedications, medicationHistory: data.medicationHistory.map(medication),
    },
    duplicateRecords: { source: 'backend', patientId, complete: true, records: currentMedications },
  }
}

export async function createDoctorPrescription(patientId, values, signal) {
  if (!uuid(patientId) || !values || typeof values !== 'object' || Object.keys(validateMedicationDetails(values)).length) {
    throw new Error('Select a valid patient and complete all prescription fields.')
  }
  // Re-read before writing; never override an existing record or silently allow duplicates.
  const latest = await getDoctorPatientDetails(patientId, signal)
  const duplicate = checkMedicationDuplicate(values, patientId, latest.duplicateRecords)
  if (duplicate.status !== 'none') throw new Error(duplicate.status === 'found'
    ? 'An exact duplicate exists. Prescription submission is disabled.'
    : 'Duplicate checking is unavailable. Refresh the medication records before submitting.')
  const body = {
    patientId, medicationName: values.medication.trim(), dosage: values.dose.trim(),
    frequency: values.frequency.trim(), duration: values.duration.trim(), reason: values.reason.trim(),
  }
  return saveDoctorPrescription('prescriptions', { method: 'POST', body, patientId, expectedStatus: 201 }, signal)
}

export async function saveDoctorPrescription(path, { method, body, patientId, prescriptionId, status, expectedStatus = 200 }, signal) {
  try {
    const data = await doctorRequest(path, { method, body, signal, expectedStatus })
    if (!hasId(data?.prescription) || data.prescription.patientId !== patientId
      || (prescriptionId && data.prescription.id !== prescriptionId) || (status && data.prescription.status !== status)) {
      throw new Error('Unexpected prescription response.')
    }
    return { message: text(data.message) || 'Prescription saved successfully.' }
  } catch (error) {
    if (error.name === 'AbortError') throw error
    // A lost response or server failure can follow a committed write. Never auto-retry it.
    if (!error.status || error.status >= 500 || error.status < 400) {
      const uncertain = new Error('The save could not be confirmed. Check current medications before submitting again.', { cause: error })
      uncertain.saveUncertain = true
      throw uncertain
    }
    throw error
  }
}

export async function modifyDoctorPrescription(patientId, prescriptionId, values, signal) {
  const latest = await getDoctorPatientDetails(patientId, signal)
  const prescription = latest.patient.currentMedications.find(record => record.id === prescriptionId)
  if (!prescription) throw new Error('This prescription is no longer a current medication. Refresh the patient records.')
  if (!values || Object.keys(validateModificationDetails(values, getModificationValues(prescription))).length) throw new Error('Complete all prescription fields.')
  const others = { ...latest.duplicateRecords, records: latest.duplicateRecords.records.filter(record => record.id !== prescriptionId) }
  if (checkMedicationDuplicate(values, patientId, others).status !== 'none') throw new Error('Modification is unavailable until the duplicate check can be completed without a match.')
  return saveDoctorPrescription(`prescriptions/${encodeURIComponent(prescriptionId)}`, {
    method: 'PATCH', patientId, prescriptionId,
    body: { medicationName: values.medication.trim(), dosage: values.dose.trim(), frequency: values.frequency.trim(), duration: values.duration.trim(), reason: values.reason.trim() },
  }, signal)
}

export async function discontinueDoctorPrescription(patientId, prescriptionId, reason, signal) {
  if (validateDiscontinuationReason(reason)) throw new Error('A reason for discontinuing this prescription is required.')
  const latest = await getDoctorPatientDetails(patientId, signal)
  if (!latest.patient.currentMedications.some(record => record.id === prescriptionId)) throw new Error('This prescription is no longer a current medication. Refresh the patient records.')
  return saveDoctorPrescription(`prescriptions/${encodeURIComponent(prescriptionId)}/discontinue`, {
    method: 'POST', body: { reason: reason.trim() }, patientId, prescriptionId, status: 'discontinued',
  }, signal)
}
