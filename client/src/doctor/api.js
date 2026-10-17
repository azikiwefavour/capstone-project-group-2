import { getDoctorAccessToken, setDoctorAccessToken } from '../auth/doctorSession'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const text = value => typeof value === 'string' ? value : ''

export async function doctorRequest(path, { method = 'GET', body, signal, expectedStatus } = {}) {
  const token = getDoctorAccessToken()
  if (!token) throw new Error('Please log in as a doctor to continue.')
  const checkCurrent = () => {
    if (signal?.aborted || getDoctorAccessToken() !== token) {
      const error = new Error('The request is no longer active.')
      error.name = 'AbortError'
      throw error
    }
  }
  checkCurrent()
  let response
  try {
    response = await fetch(`${apiBaseUrl}/api/doctor/${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal, cache: 'no-store',
    })
  } catch (error) {
    checkCurrent()
    if (error.name === 'AbortError') throw error
    throw new Error('Unable to connect. Please check your connection and try again.', { cause: error })
  }
  checkCurrent()
  const data = await response.json().catch(() => null)
  checkCurrent()
  if (!response.ok) {
    if (response.status === 401) setDoctorAccessToken(null)
    const message = Array.isArray(data?.message) ? data.message.filter(value => typeof value === 'string').join(' ') : text(data?.message)
    const error = new Error(message || (response.status === 403
      ? 'This account does not have permission to view these records.'
      : 'Unable to load records. Please try again.'))
    error.status = response.status
    throw error
  }
  if (expectedStatus && response.status !== expectedStatus) {
    const error = new Error('The server returned an unexpected save response.')
    error.status = response.status
    throw error
  }
  return data
}

async function doctorListRequest(path, signal) {
  const data = await doctorRequest(path, { signal })
  if (!Array.isArray(data) || !data.every(row => typeof row?.id === 'string' && row.id.trim())
    || new Set(data.map(row => row.id)).size !== data.length) {
    throw new Error('The server returned an unexpected record list. Please try again.')
  }
  return data
}

export async function getDoctorPatients(signal) {
  const patients = await doctorListRequest('patients', signal)
  return patients.map(patient => ({
    id: patient.id, name: text(patient.name), email: text(patient.email), phone: text(patient.phone),
    age: Number.isSafeInteger(patient.age) && patient.age >= 0 ? patient.age : null,
    gender: text(patient.gender), initials: text(patient.initials),
    currentMedicationCount: Number.isSafeInteger(patient.currentMedicationsCount) && patient.currentMedicationsCount >= 0
      ? patient.currentMedicationsCount : null,
  }))
}

export async function getDoctorClarifications(signal) {
  const clarifications = await doctorListRequest('clarifications', signal)
  return clarifications.map(record => ({
    id: record.id,
    patient: { id: text(record.patientId), name: text(record.patient), initials: text(record.initials) },
    concern: text(record.concern), sentBy: text(record.sentBy), status: text(record.status),
    rawStatus: text(record.rawStatus), note: text(record.note), date: text(record.date),
    // The API supplies a preformatted date, not a timezone-qualified timestamp.
    dateLabel: text(record.date),
    prescription: {
      id: record.id, name: text(record.medicationName), dose: text(record.dosage),
      frequency: text(record.frequency), duration: text(record.duration), reason: text(record.reason),
    },
  }))
}
