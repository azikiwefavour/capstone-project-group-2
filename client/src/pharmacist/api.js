import { getPharmacistAccessToken, setPharmacistAccessToken } from '../auth/pharmacistSession'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')

// Pharmacy requests share the existing Pharmacist session. Never fall
// back to another role's token or retain results after logout/account changes.
async function pharmacistRequest(path, signal, resource, method = 'GET', body) {
  const token = getPharmacistAccessToken()
  if (!token) throw new Error('Please log in as a pharmacist to continue.')
  const checkCurrent = () => {
    if (signal?.aborted || getPharmacistAccessToken() !== token) {
      const error = new Error('The pharmacy request is no longer active.')
      error.name = 'AbortError'
      throw error
    }
  }
  checkCurrent()
  let response
  try {
    response = await fetch(`${apiBaseUrl}/api/pharmacy/${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal, cache: 'no-store',
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
    if (response.status === 401) setPharmacistAccessToken(null)
    const message = Array.isArray(data?.message)
      ? data.message.filter(value => typeof value === 'string').join(' ')
      : typeof data?.message === 'string' ? data.message : ''
    const error = new Error(message || (response.status === 403
      ? `This account does not have permission to view this ${resource === 'dashboard' ? 'dashboard' : 'queue'}.`
      : `Unable to load your ${resource}. Please try again.`))
    error.status = response.status
    throw error
  }
  if (method === 'POST' && response.status !== 200) throw new Error('The server returned an unexpected submission response.')
  return data
}

export function pharmacistGet(path, signal, resource = 'prescriptions') {
  return pharmacistRequest(path, signal, resource)
}

export function pharmacistPost(path, body, signal) {
  return pharmacistRequest(path, signal, 'clarification request', 'POST', body)
}
