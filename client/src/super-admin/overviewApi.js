import { getSuperAdminAccessToken, setSuperAdminAccessToken } from './authentication'
import { mapDashboardResponse } from './overviewResponse.js'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')

// Follow the existing role API helpers, using only the Super Admin session.
export async function getSuperAdminOverview(signal) {
  const token = getSuperAdminAccessToken()
  if (!token) throw new Error('Please log in as a Super Admin to continue.')
  let response
  try {
    response = await fetch(`${apiBaseUrl}/api/super-admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }, signal, cache: 'no-store',
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Unable to connect. Please check your connection and try again.', { cause: error })
  }
  if (signal?.aborted || getSuperAdminAccessToken() !== token) throw new DOMException('Request no longer active', 'AbortError')
  if (!response.ok) {
    if ([401, 403].includes(response.status)) setSuperAdminAccessToken(null)
    // Do not surface arbitrary backend messages or private response fields.
    throw new Error('Unable to load the Overview Dashboard. Please try again.')
  }
  const data = response.status === 204 ? null : await response.json().catch(() => { throw new Error('The server returned an unexpected dashboard response.') })
  if (signal?.aborted || getSuperAdminAccessToken() !== token) throw new DOMException('Request no longer active', 'AbortError')
  return mapDashboardResponse(data)
}
