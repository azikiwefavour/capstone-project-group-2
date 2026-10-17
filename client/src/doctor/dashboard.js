import { getDoctorAccessToken, setDoctorAccessToken } from '../auth/doctorSession'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const text = value => typeof value === 'string' ? value : ''
const hasId = value => typeof value?.id === 'string' && Boolean(value.id.trim())

function normalizeDashboard(data) {
  const keys = ['patients', 'awaitingClarification', 'prescriptions']
  if (!hasId(data?.doctor) || data.doctor.role !== 'doctor'
    || !keys.every(key => Number.isSafeInteger(data.stats?.[key]) && data.stats[key] >= 0)
    || !Array.isArray(data.recentPatients) || !data.recentPatients.every(hasId)
    || !Array.isArray(data.recentActivities) || !data.recentActivities.every(hasId)) {
    throw new Error('The server returned an unexpected dashboard response. Please try again.')
  }
  // Retain only dashboard display fields, not full account or prescription objects.
  return {
    stats: Object.fromEntries(keys.map(key => [key, data.stats[key]])),
    recentPatients: data.recentPatients.map(patient => ({
      id: patient.id, name: text(patient.name), initials: text(patient.initials),
      email: text(patient.email),
      lastPrescription: patient.lastPrescription ? { date: patient.lastPrescription.date } : null,
    })),
    recentActivities: data.recentActivities.map(activity => ({
      id: activity.id, description: text(activity.description), createdAt: activity.createdAt,
    })),
  }
}

export async function getDoctorDashboard(signal) {
  const token = getDoctorAccessToken()
  if (!token) throw new Error('Please log in as a doctor to continue.')
  const checkCurrent = () => {
    if (signal?.aborted || getDoctorAccessToken() !== token) {
      const error = new Error('The dashboard request is no longer active.')
      error.name = 'AbortError'
      throw error
    }
  }
  checkCurrent()
  let response
  try {
    response = await fetch(`${apiBaseUrl}/api/doctor/dashboard`, {
      method: 'GET', headers: { Authorization: `Bearer ${token}` }, signal, cache: 'no-store',
    })
  } catch (error) {
    checkCurrent()
    if (error.name === 'AbortError') throw error
    throw new Error('Unable to load the dashboard. Please check your connection and try again.', { cause: error })
  }
  checkCurrent()
  const data = await response.json().catch(() => null)
  checkCurrent()
  if (!response.ok) {
    if (response.status === 401) setDoctorAccessToken(null)
    if (response.status === 404) throw new Error('The Doctor Dashboard API is not available on the running backend yet.')
    const message = Array.isArray(data?.message) ? data.message.filter(value => typeof value === 'string').join(' ')
      : text(data?.message)
    throw new Error(message || (response.status === 403
      ? 'This account does not have permission to view the Doctor Dashboard.'
      : 'Unable to load the dashboard. Please try again.'))
  }
  return normalizeDashboard(data)
}
