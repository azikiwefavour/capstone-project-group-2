import { getSuperAdminAccessToken, setSuperAdminAccessToken } from './authentication'
import { mapSystemHealthOverview, mapSystemHealthPing } from './systemHealthResponse.js'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')

export async function getSuperAdminSystemHealth(signal) {
  const token = getSuperAdminAccessToken()
  if (!token) throw new Error('Please log in as a Super Admin to continue.')
  const checkCurrent = () => {
    if (signal?.aborted || getSuperAdminAccessToken() !== token) throw new DOMException('Request no longer active', 'AbortError')
  }
  checkCurrent()
  let response
  try {
    response = await fetch(`${apiBaseUrl}/api/super-admin/system-health`, {
      method: 'GET', headers: { Authorization: `Bearer ${token}` }, signal, cache: 'no-store',
    })
    if (response.status === 404) {
      response = await fetch(`${apiBaseUrl}/api/super-admin/health-check`, {
        method: 'GET', headers: { Authorization: `Bearer ${token}` }, signal, cache: 'no-store',
      })
    }
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
  const data = await response.json().catch(() => { throw new Error('The server returned an unexpected system health response.') })
  checkCurrent()
  return data.platform !== undefined || data.incidents !== undefined ? mapSystemHealthOverview(data) : mapSystemHealthPing(data)
}

export async function runSystemHealthChecks(signal) {
  const token = getSuperAdminAccessToken()
  if (!token) throw new Error('Please log in as a Super Admin to continue.')
  let response
  try {
    response = await fetch(`${apiBaseUrl}/api/super-admin/system-health/run-checks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      signal,
      cache: 'no-store',
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Unable to connect. Please check your connection and try again.', { cause: error })
  }
  if (!response.ok) {
    if ([401, 403].includes(response.status)) setSuperAdminAccessToken(null)
    throw new Error('Unable to execute health checks. Please try again.')
  }
  const data = await response.json().catch(() => { throw new Error('The server returned an unexpected response.') })
  return mapSystemHealthOverview(data)
}


