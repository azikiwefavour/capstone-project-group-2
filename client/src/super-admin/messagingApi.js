import { getSuperAdminAccessToken, setSuperAdminAccessToken } from './authentication'
import { mapMessagingResponse, mapMessagingUsageResponse } from './messagingResponse.js'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const sortColumns = new Set(['time', 'facility', 'to', 'message', 'channel', 'status'])
// Follow the existing Super Admin authenticated GET convention without altering
// previous page clients or authentication. No POST/send/log method is exposed.
async function messagingRequest(path, signal) {
  const token = getSuperAdminAccessToken()
  if (!token) throw new Error('Please log in as a Super Admin to continue.')
  const checkCurrent = () => {
    if (signal?.aborted || getSuperAdminAccessToken() !== token) throw new DOMException('Request no longer active', 'AbortError')
  }
  checkCurrent()
  let response
  try {
    response = await fetch(`${apiBaseUrl}/api/super-admin/messaging${path}`, {
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
    throw new Error('Unable to load messaging data. Please try again.')
  }
  const data = await response.json().catch(() => { throw new Error('The server returned an unexpected messaging response.') })
  checkCurrent()
  return data
}

export async function getSuperAdminMessaging({ page = 1, tab = 'all', channel = 'all', search = '', facility = '', messageType = '', sortBy = 'time', sortOrder = 'DESC' } = {}, signal) {
  const params = new URLSearchParams({ page: String(page), limit: '7', tab,
    sortBy: sortColumns.has(sortBy) ? sortBy : 'time', sortOrder: sortOrder === 'ASC' ? 'ASC' : 'DESC' })
  if (channel !== 'all') params.set('channel', channel)
  for (const [key, value] of Object.entries({ search, facility, messageType })) if (value.trim()) params.set(key, value.trim())
  const result = mapMessagingResponse(await messagingRequest(`?${params}`, signal))
  if (result.pagination.page !== page || result.pagination.limit !== 7) throw new Error('The server returned unexpected messaging pagination.')
  if (page > result.pagination.totalPages) return getSuperAdminMessaging({ page: result.pagination.totalPages, tab, channel, search, facility, messageType, sortBy, sortOrder }, signal)
  return result
}

export async function getSuperAdminMessagingUsage(signal) {
  return mapMessagingUsageResponse(await messagingRequest('/usage', signal))
}
