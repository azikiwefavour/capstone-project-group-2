import { doctorRequest, getDoctorClarifications } from './api'
import { saveDoctorPrescription } from './prescriptions'
import { getModificationValues, validateModificationDetails } from './components/medicationForm'

const text = value => typeof value === 'string' ? value : ''

export async function getDoctorClarificationDetails(id, signal) {
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error('Please select a valid clarification from Clarifications.')
  const pending = await getDoctorClarifications(signal)
  const listed = pending.find(record => record.id === id)
  if (!listed) throw new Error('This clarification is no longer pending or is not available in your Clarifications list.')
  const data = await doctorRequest(`clarifications/${encodeURIComponent(id)}`, { signal })
  if (data?.clarification?.id !== id || data?.prescription?.id !== id || data?.patient?.id !== listed.patient.id
    || data.prescription.status !== 'awaiting_clarification') throw new Error('The clarification changed or its details could not be verified. Return to Clarifications and try again.')
  return {
    id, rawStatus: data.prescription.status, status: listed.status,
    patient: { id: data.patient.id, name: text(data.patient.name), age: Number.isSafeInteger(data.patient.age) && data.patient.age >= 0 ? data.patient.age : null, gender: text(data.patient.gender) },
    sentBy: text(data.clarification.sentBy), concern: text(data.clarification.concern), note: text(data.clarification.note),
    dateLabel: text(data.clarification.submittedOn),
    prescription: { id, name: text(data.prescription.medicationName), dose: text(data.prescription.dosage), frequency: text(data.prescription.frequency), duration: text(data.prescription.duration), reason: text(data.prescription.reason) },
  }
}

export async function confirmDoctorClarification(id, note, signal) {
  if (typeof note !== 'string') throw new Error('Enter a valid optional note.')
  const latest = await getDoctorClarificationDetails(id, signal)
  return saveDoctorPrescription(`clarifications/${encodeURIComponent(id)}/confirm`, {
    method: 'POST', body: note.trim() ? { noteToPharmacist: note.trim() } : {},
    patientId: latest.patient.id, prescriptionId: id, status: 'clarified',
  }, signal)
}

export async function modifyDoctorClarification(id, values, signal) {
  const latest = await getDoctorClarificationDetails(id, signal)
  if (!values || Object.keys(validateModificationDetails(values, getModificationValues(latest.prescription))).length) throw new Error('Complete all prescription fields.')
  return saveDoctorPrescription(`clarifications/${encodeURIComponent(id)}/modify`, {
    method: 'PATCH', patientId: latest.patient.id, prescriptionId: id, status: 'clarified',
    body: { medicationName: values.medication.trim(), dosage: values.dose.trim(), frequency: values.frequency.trim(), duration: values.duration.trim(), reason: values.reason.trim() },
  }, signal)
}
