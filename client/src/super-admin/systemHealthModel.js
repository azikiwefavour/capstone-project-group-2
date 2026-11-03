const nonnegative = value => Number.isFinite(value) && value >= 0

export function monitoringPercentage(available, total) {
  return nonnegative(available) && nonnegative(total) && total > 0 && available <= total ? available / total * 100 : null
}

export function averageResponseTime(measurements) {
  if (!Array.isArray(measurements) || !measurements.length || !measurements.every(nonnegative)) return null
  const average = measurements.reduce((sum, value) => sum + value, 0) / measurements.length
  return Number.isFinite(average) ? average : null
}

export function systemHealthSummary(data) {
  const api = Array.isArray(data?.services) ? data.services.find(service => service?.id === 'medtrail') : undefined
  const incidents = openHealthIncidents(data?.incidents)
  return {
    apiUptime: monitoringPercentage(api?.monitoring?.availableSeconds, api?.monitoring?.totalSeconds),
    apiResponseTime: averageResponseTime(api?.responseTimesMs),
    paymentWebhooks: monitoringPercentage(data?.webhooks?.successful, data?.webhooks?.totalProcessed),
    openIncidents: incidents?.length ?? null,
  }
}

export function degradedServiceAlert(services) {
  const names = Array.isArray(services) ? services.filter(service => service?.status === 'degraded' && typeof service.name === 'string' && service.name.trim()).map(service => service.name.trim()) : []
  return names.length ? `${names.length} ${names.length === 1 ? 'service' : 'services'} degraded: ${names.join(', ')}. Facilities and Patients may experience delays.` : null
}

// Shared by the incident list and summary count; never changes service status.
export function openHealthIncidents(incidents) {
  if (!Array.isArray(incidents) || !incidents.every(incident => typeof incident?.status === 'string' && incident.status.trim())) return null
  return incidents.filter(incident => incident.status.trim().toLowerCase() !== 'resolved')
}

export function filterHealthServices(services, status = 'all') {
  if (!Array.isArray(services)) return []
  const records = services.filter(service => typeof service?.id === 'string' && typeof service?.name === 'string' && service.name.trim())
  return ['operational', 'degraded'].includes(status) ? records.filter(service => service.status === status) : records
}
