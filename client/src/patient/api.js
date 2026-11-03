import { getPatientAccessToken, setPatientAccessToken } from '../auth/patientSession'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')

async function patientRequest(path, signal, resource = 'records', method = 'GET', body) {
  const token = getPatientAccessToken()
  if (!token) throw new Error('Please log in as a patient to continue.')
  const checkCurrent = () => {
    if (signal?.aborted || getPatientAccessToken() !== token) {
      const error = new Error('The patient request is no longer active.')
      error.name = 'AbortError'
      throw error
    }
  }
  checkCurrent()
  let response
  try {
    response = await fetch(`${apiBaseUrl}/api/patient/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal,
      cache: 'no-store',
    })
  } catch (error) {
    checkCurrent()
    if (error.name === 'AbortError') throw error
    throw new Error(`Unable to load your ${resource}. Please check your connection and try again.`, { cause: error })
  }
  checkCurrent()
  const data = await response.json().catch(() => null)
  checkCurrent()
  if (!response.ok) {
    if (response.status === 401) setPatientAccessToken(null)
    const message = Array.isArray(data?.message)
      ? data.message.filter(value => typeof value === 'string').join(' ')
      : typeof data?.message === 'string' ? data.message : ''
    const error = new Error(message || `Unable to load your ${resource}. Please try again.`)
    error.status = response.status
    throw error
  }
  return data
}

export function fetchPatientDashboard(signal) {
  return patientRequest('dashboard', signal, 'dashboard')
}

export function fetchPatientPrescriptions(signal, status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return patientRequest(`prescriptions${query}`, signal, 'prescriptions')
}

export function fetchPatientDiagnoses(signal) {
  return patientRequest('diagnoses', signal, 'diagnoses')
}

export function completePatientPrescription(prescriptionId, signal) {
  return patientRequest(`prescriptions/${encodeURIComponent(prescriptionId)}/complete`, signal, 'prescription completion', 'POST')
}
