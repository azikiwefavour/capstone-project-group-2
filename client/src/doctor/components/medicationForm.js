export const frequencyOptions = ['Once daily', 'Twice daily', 'Three times daily', '3 times daily', 'Four times daily', '4 times daily', 'Every 8 hours', 'Every 12 hours', 'At bedtime', 'As needed', 'As directed']
export const durationOptions = ['3 days', '5 days', '7 days', '10 days', '14 days', '28 days', 'Ongoing', 'As directed']

export function validateSingleMedicationItem(item) {
  const errors = {}
  for (const field of ['medication', 'dose', 'frequency', 'duration']) {
    if (typeof item?.[field] !== 'string' || !item[field].trim()) errors[field] = 'This field is required.'
  }
  if (!errors.frequency && !frequencyOptions.includes(item?.frequency)) errors.frequency = 'Select a valid frequency.'
  if (!errors.duration && !durationOptions.includes(item?.duration)) errors.duration = 'Select a valid duration.'
  return errors
}

export function validateMedicationDetails(values) {
  if (Array.isArray(values?.items)) {
    const errors = {}
    if (!values.items.length) {
      errors.items = 'At least one medication is required.'
    } else {
      for (const item of values.items) {
        const itemErrors = validateSingleMedicationItem(item)
        if (Object.keys(itemErrors).length > 0) {
          errors.items = 'Please ensure all added medications are complete.'
          break
        }
      }
    }
    if (typeof values.reason !== 'string' || !values.reason.trim()) {
      errors.reason = 'This field is required.'
    }
    return errors
  }
  const errors = {}
  for (const field of ['medication', 'dose', 'frequency', 'duration', 'reason']) {
    if (typeof values?.[field] !== 'string' || !values[field].trim()) errors[field] = 'This field is required.'
  }
  if (!errors.frequency && !frequencyOptions.includes(values?.frequency)) errors.frequency = 'Select a valid frequency.'
  if (!errors.duration && !durationOptions.includes(values?.duration)) errors.duration = 'Select a valid duration.'
  return errors
}

// Use only explicit prescription fields; an indication/description is not necessarily a reason.
export function getModificationValues(prescription) {
  const text = (value) => typeof value === 'string' ? value : ''
  return {
    medication: text(prescription?.name),
    dose: text(prescription?.dose),
    frequency: text(prescription?.frequency),
    duration: text(prescription?.duration),
    reason: text(prescription?.reason),
  }
}

export function validateModificationDetails(values, originalValues) {
  const errors = validateMedicationDetails(values)
  // Preserve existing dropdown values verbatim without allowing arbitrary new options.
  for (const key of ['frequency', 'duration']) {
    if (typeof values[key] === 'string' && values[key].trim() && values[key] === originalValues?.[key]) delete errors[key]
  }
  return errors
}

export function validateDiscontinuationReason(reason) {
  return typeof reason === 'string' && reason.trim() ? '' : 'A reason for discontinuing this prescription is required.'
}
