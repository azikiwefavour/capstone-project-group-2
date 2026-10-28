import { getSuperAdminAccessToken, setSuperAdminAccessToken } from './authentication'
import { mapFacilitiesResponse, mapFacilityResponse } from './facilitiesResponse.js'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')

// Same authenticated Bearer client/session convention as overviewApi. GET only.
async function facilityRequest(path, signal) {
  const token = getSuperAdminAccessToken()
  if (!token) throw new Error('Please log in as a Super Admin to continue.')
  const checkCurrent = () => {
    if (signal?.aborted || getSuperAdminAccessToken() !== token) throw new DOMException('Request no longer active', 'AbortError')
  }
  checkCurrent()
  let response
  try {
    response = await fetch(`${apiBaseUrl}/api/super-admin/facilities${path}`, {
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
    throw new Error(response.status === 404 ? 'This facility is no longer available.' : 'Unable to load facilities. Please try again.')
  }
  const data = await response.json().catch(() => { throw new Error('The server returned an unexpected facilities response.') })
  checkCurrent()
  return data
}

export async function getSuperAdminFacilities({ query = '', status = 'all', page = 1, limit = 7, plan } = {}, signal) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (query.trim()) params.set('search', query.trim())
  if (status !== 'all') params.set('status', status)
  if (plan) params.set('plan', plan)
  const result = mapFacilitiesResponse(await facilityRequest(`?${params}`, signal))
  if (result.page !== page || result.limit !== limit) throw new Error('The server returned unexpected facilities pagination.')
  if (page > result.totalPages) return getSuperAdminFacilities({ query, status, page: result.totalPages, limit, plan }, signal)
  return result
}

// No sort parameters are registered. Collect every matching server page before
// sorting locally, so sorting never silently applies to just seven records.
export async function getFacilitiesForSorting(options, signal) {
  const first = await getSuperAdminFacilities({ ...options, page: 1, limit: 100 }, signal)
  const records = [...first.records]
  for (let page = 2; page <= first.totalPages; page++) {
    const next = await getSuperAdminFacilities({ ...options, page, limit: 100 }, signal)
    if (next.total !== first.total) throw new Error('Facilities changed while loading. Please try again.')
    records.push(...next.records)
  }
  if (records.length !== first.total || new Set(records.map(row => row.id)).size !== records.length) throw new Error('Facilities changed while loading. Please try again.')
  return { ...first, records }
}

export async function getSuperAdminFacility(id, signal) {
  const facility = mapFacilityResponse(await facilityRequest(`/${encodeURIComponent(id)}`, signal))
  if (facility.id !== id) throw new Error('The server returned an unexpected facility response.')
  return facility
}
