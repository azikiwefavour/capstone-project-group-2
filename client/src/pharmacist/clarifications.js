import { pharmacistPost } from './api'
import { getPharmacistPrescriptionDetails } from './prescriptions'
import { validateClarification } from './clarificationForm'
import { getPharmacistAccessToken } from '../auth/pharmacistSession'

export async function requestPharmacistClarification(prescriptionId, patientId, values, signal) {
  if (typeof prescriptionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(prescriptionId)
    || !values || Object.keys(validateClarification(values)).length) {
    throw new Error('Select a valid prescription, choose a concern, and provide meaningful notes within 200 characters.')
  }
  // Recheck hospital membership and the selected patient immediately before
  // writing. An already-requested clarification must not be submitted again.
  const token = getPharmacistAccessToken()
  const latest = await getPharmacistPrescriptionDetails(prescriptionId, signal)
  if (signal?.aborted || getPharmacistAccessToken() !== token) {
    const error = new Error('The clarification request is no longer active.')
    error.name = 'AbortError'
    throw error
  }
  if (latest.patient.id !== patientId || !['pending', 'active', 'clarified'].includes(latest.prescription.status)) {
    throw new Error('This prescription has changed or already has a clarification request. Close this modal and refresh the prescription.')
  }
  const body = { concern: values.concern, reason: values.notes.trim() }
  try {
    const result = await pharmacistPost(`prescriptions/${encodeURIComponent(prescriptionId)}/clarify`, body, signal)
    const saved = result?.prescription
    if (saved?.id !== prescriptionId || saved.patientId !== patientId || saved.status !== 'awaiting_clarification'
      || saved.concern !== body.concern || saved.clarificationReason !== body.reason) {
      throw new Error('The server returned unexpected clarification information.')
    }
    return { message: typeof result.message === 'string' && result.message.trim() ? result.message : 'Clarification request submitted successfully.' }
  } catch (error) {
    if (error.name === 'AbortError') throw error
    // A lost response can follow a committed write. Do not offer a blind retry.
    if (!error.status || error.status >= 500 || error.status < 400) {
      const uncertain = new Error('The request could not be confirmed. Close this modal and refresh the prescription before trying again.', { cause: error })
      uncertain.saveUncertain = true
      throw uncertain
    }
    throw error
  }
}
