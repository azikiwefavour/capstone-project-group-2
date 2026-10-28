export const SUBSCRIBER_PAGE_SIZE = 7
export const subscriberSortOptions = [
  ['charge_asc', 'Next charge: earliest first'], ['charge_desc', 'Next charge: latest first'],
  ['amount_desc', 'Amount: highest first'], ['amount_asc', 'Amount: lowest first'],
  ['name_asc', 'Facility name: A–Z'], ['name_desc', 'Facility name: Z–A'],
]
const names = new Intl.Collator('en', { sensitivity: 'base', numeric: true })

function dateNumber(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : null
}
export function formatSubscriberDate(value) {
  const timestamp = dateNumber(value)
  return timestamp === null ? 'Not available' : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(timestamp)
}

function compareOptional(a, b, direction) {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return (a - b) * direction
}

export function querySubscribers(records, { search = '', status = '', plan = '', sort = 'charge_asc' } = {}) {
  const term = search.trim().toLocaleLowerCase('en')
  // Search only the facility display name, never email, plan or payment method.
  const searched = (Array.isArray(records) ? records : []).filter(record => typeof record?.facilityName === 'string' && record.facilityName.toLocaleLowerCase('en').includes(term))
  const filtered = searched.filter(record => (!status || record.status === status) && (!plan || record.plan === plan))
  return filtered.sort((a, b) => {
    const nameOrder = names.compare(a.facilityName, b.facilityName)
    if (sort === 'name_asc') return nameOrder
    if (sort === 'name_desc') return -nameOrder
    if (sort === 'amount_asc' || sort === 'amount_desc') {
      const value = record => Number.isFinite(record.amount) && record.amount >= 0 ? record.amount : null
      return compareOptional(value(a), value(b), sort === 'amount_desc' ? -1 : 1) || nameOrder
    }
    return compareOptional(dateNumber(a.chargeDate), dateNumber(b.chargeDate), sort === 'charge_desc' ? -1 : 1) || nameOrder
  })
}

export function subscriberPage(records, options, requestedPage = 1) {
  const filtered = querySubscribers(records, options)
  const totalPages = Math.max(1, Math.ceil(filtered.length / SUBSCRIBER_PAGE_SIZE))
  const page = Math.max(1, Math.min(Number.isInteger(requestedPage) ? requestedPage : 1, totalPages))
  return { records: filtered.slice((page - 1) * SUBSCRIBER_PAGE_SIZE, page * SUBSCRIBER_PAGE_SIZE), page, totalPages, total: filtered.length }
}

export function subscriberPageNumbers(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)
  if (page <= 4) return [1, 2, 3, 4, 5, totalPages]
  if (page >= totalPages - 3) return [1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  return [1, page - 1, page, page + 1, totalPages]
}
