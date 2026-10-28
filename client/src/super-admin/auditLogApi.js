import { getSuperAdminAccessToken, setSuperAdminAccessToken } from './authentication'
import { mapAuditLogResponse } from './auditLogResponse.js'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')

// Existing Super Admin Bearer/no-store/session convention. Prior page helpers
// expose no generic request primitive; those integrations remain unchanged.
// This controller's GET reads PlatformActivity only. No write/export API exposed.
export async function getSuperAdminAuditLog({ page = 1, limit = 7, facility = '', role = '' } = {}, signal) {
  const token = getSuperAdminAccessToken()
  if (!token) throw new Error('Please log in as a Super Admin to continue.')
  const checkCurrent = () => {
    if (signal?.aborted || getSuperAdminAccessToken() !== token) throw new DOMException('Request no longer active', 'AbortError')
  }
  checkCurrent()
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (facility.trim()) params.set('facility', facility.trim())
  if (role.trim()) params.set('role', role.trim())
  let response
  try {
    response = await fetch(`${apiBaseUrl}/api/super-admin/activities?${params}`, {
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
    throw new Error('Unable to load audit log records. Please try again.')
  }
  const data = await response.json().catch(() => { throw new Error('The server returned an unexpected audit log response.') })
  checkCurrent()
  const result = mapAuditLogResponse(data)
  if (result.pagination.page !== page || result.pagination.limit !== limit) throw new Error('The server returned unexpected audit pagination.')
  if (page > result.pagination.totalPages) return getSuperAdminAuditLog({ page: result.pagination.totalPages, limit, facility, role }, signal)
  return result
}

// Server has no sort parameters. Collect every matching page before applying the
// existing stable client sort, rather than sorting only seven fetched records.
export async function getAuditLogForSorting(options = {}, signal) {
  const first = await getSuperAdminAuditLog({ ...options, page: 1, limit: 100 }, signal)
  const records = [...first.records]
  for (let page = 2; page <= first.pagination.totalPages; page++) {
    const next = await getSuperAdminAuditLog({ ...options, page, limit: 100 }, signal)
    if (next.pagination.total !== first.pagination.total) throw new Error('Audit records changed while loading. Please try again.')
    records.push(...next.records)
  }
  if (records.length !== first.pagination.total || new Set(records.map(row => row.id)).size !== records.length) throw new Error('Audit records changed while loading. Please try again.')
  return { ...first, records }
}
