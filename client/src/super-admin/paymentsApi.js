import { getSuperAdminAccessToken, setSuperAdminAccessToken } from './authentication'
import { mapPaymentsResponse, verifiedPaymentsCsv } from './paymentsResponse.js'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const sortColumns = new Set(['date', 'amount', 'facility', 'channel', 'gateway', 'status', 'reference'])
function filters(options) {
  const params = new URLSearchParams()
  for (const key of ['search', 'status', 'channel', 'gateway']) {
    const value = options[key]?.trim()
    if (value && value !== 'all') params.set(key, value)
  }
  return params
}

// Existing Super Admin authenticated GET/session convention. No generic request
// export exists in previous page helpers; those integrations remain untouched.
async function paymentRequest(path, signal, type = 'json') {
  const token = getSuperAdminAccessToken()
  if (!token) throw new Error('Please log in as a Super Admin to continue.')
  const checkCurrent = () => {
    if (signal?.aborted || getSuperAdminAccessToken() !== token) throw new DOMException('Request no longer active', 'AbortError')
  }
  checkCurrent()
  let response
  try {
    response = await fetch(`${apiBaseUrl}/api/super-admin/payments${path}`, {
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
    throw new Error(type === 'csv' ? 'Unable to export payments. Please try again.' : 'Unable to load payments. Please try again.')
  }
  if (type === 'csv' && !/^text\/csv\b/i.test(response.headers.get('Content-Type') || '')) throw new Error('The server returned an unexpected payment export.')
  const data = await (type === 'csv' ? response.text() : response.json()).catch(() => { throw new Error('The server returned an unexpected payments response.') })
  checkCurrent()
  return data
}

export async function getSuperAdminPayments(options = {}, signal) {
  const { page = 1, limit = 7, sortBy = 'date', sortOrder = 'DESC' } = options
  const params = filters(options)
  params.set('page', String(page)); params.set('limit', String(limit))
  params.set('sortBy', sortColumns.has(sortBy) ? sortBy : 'date'); params.set('sortOrder', sortOrder === 'ASC' ? 'ASC' : 'DESC')
  const result = mapPaymentsResponse(await paymentRequest(`?${params}`, signal))
  if (result.pagination.page !== page || result.pagination.limit !== limit) throw new Error('The server returned unexpected payments pagination.')
  if (page > result.pagination.totalPages) return getSuperAdminPayments({ ...options, page: result.pagination.totalPages }, signal)
  return result
}

export async function exportSuperAdminPayments(options = {}, signal) {
  const token = getSuperAdminAccessToken()
  const snapshot = await getSuperAdminPayments({ ...options, page: 1, limit: 100, sortBy: 'date', sortOrder: 'DESC' }, signal)
  if (snapshot.pagination.total > 100) throw new Error('The backend can export at most 100 transactions. Export is unavailable for this list.')
  if (snapshot.records.length !== snapshot.pagination.total) throw new Error('The payment export is incomplete. Please try again.')
  if (getSuperAdminAccessToken() !== token || signal?.aborted) throw new DOMException('Request no longer active', 'AbortError')
  const csv = await paymentRequest(`/export?${filters(options)}`, signal, 'csv')
  if (getSuperAdminAccessToken() !== token || signal?.aborted) throw new DOMException('Request no longer active', 'AbortError')
  const verified = verifiedPaymentsCsv(csv, snapshot.records)
  if (getSuperAdminAccessToken() !== token || signal?.aborted) throw new DOMException('Request no longer active', 'AbortError')
  return verified
}
