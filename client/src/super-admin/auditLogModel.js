export const AUDIT_PAGE_SIZE = 7
const columns = ['when', 'who', 'action', 'facility']
const textFields = { who: 'actorName', action: 'action', facility: 'facilityName' }

export function nextAuditSort(current, column) {
  const selected = columns.includes(column) ? column : 'when'
  return { column: selected, direction: current.column === selected ? current.direction === 'asc' ? 'desc' : 'asc' : selected === 'when' ? 'desc' : 'asc' }
}

export function auditLogPage(records, sort = { column: 'when', direction: 'desc' }, requestedPage = 1) {
  const column = columns.includes(sort?.column) ? sort.column : 'when'
  const direction = sort?.direction === 'asc' ? 1 : -1
  const source = Array.isArray(records) ? records.filter(record => record && typeof record === 'object') : []
  const sorted = source.map((record, index) => ({ record, index })).sort((a, b) => {
    let comparison
    if (column === 'when') {
      const first = Date.parse(a.record.timestamp), second = Date.parse(b.record.timestamp)
      if (!Number.isFinite(first) || !Number.isFinite(second)) {
        if (Number.isFinite(first)) return -1
        if (Number.isFinite(second)) return 1
        return a.index - b.index
      }
      comparison = first - second
    } else {
      const field = textFields[column]
      comparison = String(a.record[field] ?? '').localeCompare(String(b.record[field] ?? ''), 'en', { sensitivity: 'base', numeric: true })
    }
    return comparison * direction || a.index - b.index
  }).map(item => item.record)
  const totalPages = Math.max(1, Math.ceil(sorted.length / AUDIT_PAGE_SIZE))
  const page = Math.max(1, Math.min(Number.isInteger(requestedPage) ? requestedPage : 1, totalPages))
  return { page, totalPages, total: sorted.length, records: sorted.slice((page - 1) * AUDIT_PAGE_SIZE, page * AUDIT_PAGE_SIZE) }
}
