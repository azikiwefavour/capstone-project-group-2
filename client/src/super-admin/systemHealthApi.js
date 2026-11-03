import { getSuperAdminAccessToken, setSuperAdminAccessToken } from './authentication'
import { mapSystemHealthPing } from './systemHealthResponse.js'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')

// /system-health and /integrations invoke incident seeding. GET and POST
// /system-health/run-checks also write audit records. /server-strength performs
// cache writes/deletes/Redis checks. None is called under this task's restrictions.
// This existing endpoint only returns API liveness, process uptime and timestamp.
export async function getSuperAdminSystemHealth(signal) {
  const token = getSuperAdminAccessToken()
  if (!token) throw new Error('Please log in as a Super Admin to continue.')
  const checkCurrent = () => {
    if (signal?.aborted || getSuperAdminAccessToken() !== token) throw new DOMException('Request no longer active', 'AbortError')
  }
  checkCurrent()
  let response
  try {
    response = await fetch(`${apiBaseUrl}/api/super-admin/health-check`, {
      method: 'GET', headers: { Authorization: `Bearer ${token}` }, signal, cache: 'no-store',
    })
  } catch (error) {
    checkCurrent()
    if (error.name === 'AbortError') throw error
    throw new Error('Unable to connect. Please check your connection and try again.', { cause: error })
  }
  checkCurrent()
  if (!response.ok) {
    if ([401, 403].includes(response.status)) setSuperAdminAccessToken(null)
    throw new Error('Unable to load System Health. Please try again.')
  }
  if (response.status === 204) return { status: 'empty', data: undefined }
  const data = await response.json().catch(() => { throw new Error('The server returned an unexpected health-check response.') })
  checkCurrent()
  return mapSystemHealthPing(data)
}
