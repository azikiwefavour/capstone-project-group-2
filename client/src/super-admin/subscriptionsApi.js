import { getSuperAdminAccessToken, setSuperAdminAccessToken } from './authentication'
import { mapSubscriptionsResponse } from './subscriptionsResponse.js'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const sorts = {
  charge_asc: ['nextCharge', 'ASC'], charge_desc: ['nextCharge', 'DESC'],
  amount_asc: ['amount', 'ASC'], amount_desc: ['amount', 'DESC'],
  name_asc: ['facility', 'ASC'], name_desc: ['facility', 'DESC'],
}

// Reuse the existing Super Admin session and authenticated GET convention.
// Overview and Facilities expose no generic request helper and remain unchanged.
export async function getSuperAdminSubscriptions({ cycle = 'monthly', search = '', status = '', plan = '', sort = 'charge_asc', page = 1 } = {}, signal) {
  const token = getSuperAdminAccessToken()
  if (!token) throw new Error('Please log in as a Super Admin to continue.')
  const checkCurrent = () => {
    if (signal?.aborted || getSuperAdminAccessToken() !== token) throw new DOMException('Request no longer active', 'AbortError')
  }
  checkCurrent()
  const [sortBy, sortOrder] = sorts[sort] || sorts.charge_asc
  const params = new URLSearchParams({ cycle: cycle === 'annually' ? 'Annually' : 'Monthly', sortBy, sortOrder, page: String(page), limit: '7' })
  if (search.trim()) params.set('search', search.trim())
  if (status) params.set('status', status)
  if (plan) params.set('plan', plan)
  let response
  try {
    response = await fetch(`${apiBaseUrl}/api/super-admin/subscriptions?${params}`, {
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
    throw new Error('Unable to load subscriptions. Please try again.')
  }
  const data = await response.json().catch(() => { throw new Error('The server returned an unexpected subscriptions response.') })
  checkCurrent()
  const result = mapSubscriptionsResponse(data, cycle)
  if (result.pagination.page !== page || result.pagination.limit !== 7) throw new Error('The server returned unexpected subscriptions pagination.')
  if (page > result.pagination.totalPages) return getSuperAdminSubscriptions({ cycle, search, status, plan, sort, page: result.pagination.totalPages }, signal)
  return result
}
