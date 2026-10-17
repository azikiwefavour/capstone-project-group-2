// Future patient adapter: supply id, name, email, phone, and currentMedicationCount
// (or a currentMedications array). Unknown medication counts remain unavailable, not zero.
export function getMedicationCount(patient) {
  if (Number.isSafeInteger(patient.currentMedicationCount) && patient.currentMedicationCount >= 0) {
    return patient.currentMedicationCount
  }
  return Array.isArray(patient.currentMedications) ? patient.currentMedications.length : null
}

export function filterAndSortPatients(patients, query, filter, sort) {
  const [field, direction] = sort.split('-')
  const normalizedQuery = query.trim().toLowerCase()
  return patients
    .filter((patient) => (patient.name || '').toLowerCase().includes(normalizedQuery))
    .filter((patient) => {
      const count = getMedicationCount(patient)
      return filter === 'all' || (filter === 'with' ? count !== null && count > 0 : count === 0)
    })
    .slice()
    .sort((first, second) => {
      if (field === 'medications') {
        const firstCount = getMedicationCount(first)
        const secondCount = getMedicationCount(second)
        if (firstCount === null) return secondCount === null ? 0 : 1
        if (secondCount === null) return -1
        return (firstCount - secondCount) * (direction === 'desc' ? -1 : 1)
      }
      return (first[field] || '').localeCompare(second[field] || '') * (direction === 'desc' ? -1 : 1)
    })
}
