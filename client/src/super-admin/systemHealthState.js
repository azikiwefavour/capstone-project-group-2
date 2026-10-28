// Frontend presentation state only, not an assumed monitoring API contract.
// Missing collections stay unknown; explicitly supplied [] confirms an empty result.
// Optional reportingPeriod is a date/ISO timestamp for the incident reporting month.
export function createSystemHealthState(status = 'unavailable', data) {
  const resolved = ['unavailable', 'loading', 'ready', 'empty', 'error'].includes(status) ? status : 'unavailable'
  const available = ['ready', 'empty'].includes(resolved) && data && typeof data === 'object'
  return { status: resolved, data: available ? data : undefined }
}
