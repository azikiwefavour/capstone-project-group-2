const fields = ['medication', 'dose', 'frequency', 'duration', 'reason']

function normalized(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLowerCase() : ''
}

function comparisonValues(record) {
  if (!record || typeof record !== 'object') return null
  const values = { medication: record.medication ?? record.name, dose: record.dose, frequency: record.frequency, duration: record.duration, reason: record.reason }
  return fields.every((field) => normalized(values[field])) ? values : null
}

// Frontend adapter contract, not an API schema. Only a real data provider may supply
// { source: 'backend', patientId, records, complete }. Never pass preview arrays.
// A partial dataset can prove a match, but cannot prove the absence of duplicates.
export function checkMedicationDuplicate(values, patientId, dataset) {
  if (Array.isArray(values?.items) && values.items.length > 0) {
    let anyUnavailable = false
    for (const item of values.items) {
      const itemValues = {
        medication: item.medication,
        dose: item.dose,
        frequency: item.frequency,
        duration: item.duration,
        reason: values.reason,
      }
      const res = checkMedicationDuplicate(itemValues, patientId, dataset)
      if (res.status === 'found') return { status: 'found', existing: res.existing, duplicateItem: item }
      if (res.status === 'unavailable') anyUnavailable = true
    }
    return { status: anyUnavailable ? 'unavailable' : 'none' }
  }
  const entered = comparisonValues(values)
  if (!entered || patientId == null || !String(patientId).trim() || dataset?.source !== 'backend'
    || dataset.patientId == null || String(dataset.patientId) !== String(patientId)
    || !Array.isArray(dataset.records)) return { status: 'unavailable' }

  let incomplete = dataset.complete !== true
  for (const record of dataset.records) {
    if (record?.patientId != null && String(record.patientId) !== String(patientId)) {
      incomplete = true
      continue
    }
    const existing = comparisonValues(record)
    if (!existing) {
      incomplete = true
      continue
    }
    if (fields.every((field) => normalized(entered[field]) === normalized(existing[field]))) {
      return { status: 'found', existing }
    }
  }
  return { status: incomplete ? 'unavailable' : 'none' }
}
