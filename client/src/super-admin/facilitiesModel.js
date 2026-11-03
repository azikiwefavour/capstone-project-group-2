import { facilityStatusStyles, facilityTotals } from './facilityPresentation.js'

export const FACILITY_PAGE_SIZE = 7
const statuses = ['unavailable', 'loading', 'ready', 'empty', 'error']
/** Frontend presentation state, not a backend contract. Missing counts stay unknown.
 * Records use the existing facilityPresentation/FacilityDetailsModal fields:
 * id/name/plan/billingCycle/status; doctors/pharmacists/patients/smsSent/whatsappSent;
 * admin{name,email}; subscriptionDate/nextRenewalDate/trialEndDate/
 * subscriptionExpiryDate/paymentMethod/subscriptionAmount. No records are generated.
 */
export function createFacilitiesState(status = 'unavailable', records = []) {
  return { status: statuses.includes(status) ? status : 'unavailable', records }
}

export function nextFacilitySort(current, column) {
  return { column, direction: current.column === column && current.direction === 'asc' ? 'desc' : 'asc' }
}

function sortValue(row, column) {
  if (['clinicians', 'patients', 'messages'].includes(column)) return facilityTotals(row)[column]
  if (column === 'status') return facilityStatusStyles[row.status]?.label ?? null
  return typeof row[column] === 'string' ? row[column] : null
}

export function facilitiesView(records, { query = '', status = 'all', sort = {}, page: requestedPage = 1 } = {}) {
  const available = Array.isArray(records) ? records.filter(row => row && ['string', 'number'].includes(typeof row.id) && typeof row.name === 'string' && row.name.trim()) : []
  const search = query.trim().toLocaleLowerCase('en')
  const matches = available.filter(row => (!search || row.name.toLocaleLowerCase('en').includes(search)) && (status === 'all' || row.status === status))
  const sortable = ['name', 'plan', 'clinicians', 'patients', 'messages', 'status'].includes(sort.column)
  const sorted = sortable ? matches.map((row, index) => ({ row, index })).sort((a, b) => {
    const first = sortValue(a.row, sort.column), second = sortValue(b.row, sort.column)
    if (first === null || second === null) return first === second ? a.index - b.index : first === null ? 1 : -1
    const result = typeof first === 'number' ? first - second : first.localeCompare(second, 'en', { sensitivity: 'base', numeric: true })
    return result * (sort.direction === 'desc' ? -1 : 1) || a.index - b.index
  }).map(item => item.row) : matches
  const totalPages = Math.max(1, Math.ceil(sorted.length / FACILITY_PAGE_SIZE))
  const page = Math.max(1, Math.min(Number.isInteger(requestedPage) ? requestedPage : 1, totalPages))
  return {
    page, totalPages, total: sorted.length, records: sorted.slice((page - 1) * FACILITY_PAGE_SIZE, page * FACILITY_PAGE_SIZE), available,
    counts: [available.length, ...['active', 'trial', 'past_due'].map(value => available.filter(row => row.status === value).length)],
  }
}
