import { useId } from 'react'
import { openHealthIncidents } from './systemHealthModel.js'

const statuses = {
  investigating: { label: 'Investigating', color: 'bg-[#FFF4E5] text-[#9A5B13]' },
  identified: { label: 'Identified', color: 'bg-[#FFF4E5] text-[#9A5B13]' },
  monitoring: { label: 'Monitoring', color: 'bg-[#EEF0FF] text-[#475AA2]' },
  resolved: { label: 'Resolved', color: 'bg-[#D0E7DC] text-[#2F7D59]' },
}

export default function SystemHealthIncidents({ incidents, services, reportingPeriod, status = 'ready', allowInferredPeriod = true }) {
  const id = useId()
  const available = ['ready', 'empty'].includes(status)
  const open = available ? openHealthIncidents(incidents) : null
  const timestamps = available && Array.isArray(incidents) ? incidents.map(incident => Date.parse(incident?.timestamp)).filter(Number.isFinite) : []
  const suppliedPeriod = available ? Date.parse(reportingPeriod) : NaN
  const latest = timestamps.reduce((latest, timestamp) => Math.max(latest, timestamp), -Infinity)
  const periodDate = Number.isFinite(suppliedPeriod) ? suppliedPeriod : allowInferredPeriod ? latest : NaN
  const period = Number.isFinite(periodDate) ? new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(periodDate)) : 'Period unavailable'
  return <section data-system-health-incidents aria-labelledby={`${id}-title`} className="mt-3 min-w-0 rounded-2xl border border-[#E2E5ED] bg-[#EEF0F4] px-3 py-1.5">
    <div className="flex items-center justify-between gap-3"><h2 id={`${id}-title`} className="text-base font-semibold">Open incidents</h2>{period && <span className="text-xs text-[#7A8190]">{period}</span>}</div>
    {open?.length ? <ul className="mt-1.5 space-y-2">{open.map(incident => {
      const badge = statuses[incident.status.trim().toLowerCase()] || { label: 'Unavailable', color: 'bg-[#F6F7FB] text-[#7A8190]' }
      const service = Array.isArray(services) ? services.find(service => service?.id === incident.serviceId) : undefined
      return <li key={incident.id} className="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-2 rounded-xl border border-[#E2E5ED] bg-white px-3 py-2">
        <div className="min-w-0 flex-1 basis-52"><h3 className="break-words text-sm font-medium text-[#52556C]">{incident.title}</h3><div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-[#7A8190]"><p className="min-w-0 break-words">Service: {incident.serviceName || service?.name || 'Service unavailable'}</p><p>Time: <time dateTime={incident.timestamp}>{incident.displayTime || 'Not available'}</time></p></div></div>
        <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] leading-4 ${badge.color}`}>{badge.label}</span>
      </li>
    })}</ul> : <p data-health-incidents-empty className="mt-1.5 flex min-h-[60px] items-center rounded-xl border border-[#E2E5ED] bg-white px-3 py-2 text-sm text-[#7A8190]">{status === 'loading' ? <span role="status">Loading incident data...</span> : status === 'error' ? <span role="alert">Unable to load incident data.</span> : open ? 'No open incidents.' : 'No incident data available yet.'}</p>}
  </section>
}
