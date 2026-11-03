// Presentation helpers, not an unconfirmed API contract. null means unavailable;
// an empty array means a confirmed, complete empty list for this Patient.
export function prescriptionCounts(prescriptions) {
  if (!Array.isArray(prescriptions)) return null
  return {
    pending: prescriptions.filter(record => record.status === 'pending').length,
    active: prescriptions.filter(record => record.status === 'active').length,
    all: prescriptions.length,
    discontinued: prescriptions.filter(record => record.status === 'discontinued').length,
  }
}

export function searchDiagnoses(diagnoses, query) {
  const term = query.trim().toLowerCase()
  if (!term) return diagnoses
  return diagnoses.filter(record => [record.diagnosis, record.treatedWith, record.status]
    .some(value => typeof value === 'string' && value.toLowerCase().includes(term)))
}

export function patientDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  // Validate the calendar date separately; timestamp offsets may cross UTC days.
  const day = value.slice(0, 10)
  const calendar = new Date(`${day}T00:00:00Z`)
  if (Number.isNaN(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== day) return null
  return { dateTime: value, label: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date) }
}

export function paginateDiagnoses(records, requestedPage, pageSize) {
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize))
  const page = Math.max(1, Math.min(requestedPage, totalPages))
  return { page, records: records.slice((page - 1) * pageSize, page * pageSize) }
}

const diagnosisCollator = new Intl.Collator('en', { sensitivity: 'base', numeric: true })

export function sortDiagnoses(records, key, direction = 'ascending') {
  if (!['diagnosis', 'firstRecorded', 'treatedWith', 'status'].includes(key)) return records
  function value(record) {
    if (key === 'firstRecorded') return patientDate(record[key]) ? Date.parse(record[key]) : null
    return typeof record[key] === 'string' && record[key].trim() ? record[key].trim() : null
  }
  // Sort a copy, keep missing/invalid values last in either direction, and retain
  // the input order for equal values. Filtering and pagination use this result.
  return [...records].sort((a, b) => {
    const left = value(a), right = value(b)
    if (left === null) return right === null ? 0 : 1
    if (right === null) return -1
    const comparison = key === 'firstRecorded' ? left - right : diagnosisCollator.compare(left, right)
    return direction === 'descending' ? -comparison : comparison
  })
}
