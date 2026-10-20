import { getPharmacistAccessToken } from '../auth/pharmacistSession'
import { pharmacistGet } from './api'

const text = value => typeof value === 'string' ? value : ''
const hasId = value => typeof value === 'string' && Boolean(value.trim())

function normalizeDashboard(data, token) {
  const subject = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub
  if (!hasId(data?.pharmacist?.id) || data.pharmacist.id !== subject
    || !['awaitingClarification', 'dispensed'].every(key => Number.isSafeInteger(data.stats?.[key]) && data.stats[key] >= 0)
    || !Array.isArray(data.recentPrescriptions)
    || !data.recentPrescriptions.every(record => hasId(record?.id) && hasId(record.patientId))
    || new Set(data.recentPrescriptions.map(record => record.id)).size !== data.recentPrescriptions.length) {
    throw new Error('The server returned unexpected dashboard information. Please try again.')
  }

  // The endpoint orders prescriptions by creation date. Keep the most recent
  // occurrence of each patient and retain display fields only.
  const patients = new Map()
  for (const record of data.recentPrescriptions) {
    if (!patients.has(record.patientId)) {
      patients.set(record.patientId, { id: record.patientId, name: text(record.patientName), email: text(record.patientEmail) })
    }
  }
  return {
    stats: {
      awaitingClarification: data.stats.awaitingClarification,
      dispensedMedications: data.stats.dispensed,
      // No verified count or activity feed is exposed by the current pharmacy API.
      // Never infer verification from total, pending, or prescription statuses.
      verifiedPrescriptions: null,
    },
    recentPatients: [...patients.values()],
    recentActivities: null,
  }
}

export async function getPharmacistDashboard(signal) {
  const token = getPharmacistAccessToken()
  if (!token) throw new Error('Please log in as a pharmacist to continue.')
  const data = await pharmacistGet('dashboard', signal, 'dashboard')
  return normalizeDashboard(data, token)
}
