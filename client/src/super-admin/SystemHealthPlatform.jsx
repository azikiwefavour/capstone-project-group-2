import { useId, useState } from 'react'
import { filterHealthServices } from './systemHealthModel.js'

const statuses = {
  operational: { label: 'Operational', color: 'bg-[#D0E7DC] text-[#2F7D59]' },
  degraded: { label: 'Degraded', color: 'bg-[#FFF4E5] text-[#9A5B13]' },
  down: { label: 'Down', color: 'bg-[#F8D6DD] text-[#B83F5C]' },
}

const descriptions = {
  medtrail: 'Core platform services',
  database: 'Application data storage',
  signin: 'Account access and verification',
  paystack: 'Subscription payment processing',
  'termii-sms': 'SMS delivery',
  'termii-whatsapp': 'WhatsApp delivery',
}

export default function SystemHealthPlatform({ services, status = 'ready', periodLabel = 'Last 30 days' }) {
  const id = useId()
  const [filter, setFilter] = useState('all')
  const source = ['ready', 'empty'].includes(status) ? filterHealthServices(services) : []
  const records = filterHealthServices(source, filter)
  return <section data-system-health-platform aria-labelledby={`${id}-title`} className="mt-3 min-w-0 rounded-2xl border border-[#E2E5ED] bg-white">
    <div className="flex items-center justify-between gap-3 px-3 py-1.5">
      <div className="flex flex-wrap items-baseline gap-x-2"><h2 id={`${id}-title`} className="text-base font-semibold">Platform</h2><span className="text-xs text-[#7A8190]">{periodLabel}</span></div>
      <select aria-label="Platform status" value={filter} onChange={event => setFilter(event.target.value)} className="h-7 min-w-28 rounded-lg border border-[#E2E5ED] bg-white px-2 text-xs text-[#52556C] focus-visible:outline-2 focus-visible:outline-[#475AA2]">
        <option value="all">All</option><option value="operational">Operational</option><option value="degraded">Degraded</option>
      </select>
    </div>
    <div role="region" aria-label="Platform table" tabIndex={0} className="overflow-x-auto rounded-b-2xl focus-visible:outline-2 focus-visible:outline-[#475AA2]">
      <table className="w-full min-w-[560px] border-collapse text-left text-xs leading-4">
        <caption className="sr-only">Service availability and response times</caption>
        <colgroup><col className="w-[42%]" /><col className="w-[17%]" /><col className="w-[20%]" /><col className="w-[21%]" /></colgroup>
        <thead className="bg-[#F7F8FB] text-[#52556C]"><tr>{['Reference', 'Uptime', 'Response', 'Status'].map(label => <th key={label} scope="col" className="whitespace-nowrap px-3 py-2 font-medium"><span className="inline-flex items-center gap-1">{label}<svg aria-hidden="true" viewBox="0 0 12 16" fill="none" className="h-3 w-2.5 text-[#9CA3AF]"><path d="m3 6 3-3 3 3 M3 10l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg></span></th>)}</tr></thead>
        <tbody className="text-[#52556C]">{records.length ? records.map(service => {
          const badge = statuses[service.status] || (service.liveness === 'UP' ? statuses.operational : { label: 'Unavailable', color: 'bg-[#F6F7FB] text-[#7A8190]' })
          return <tr key={service.id} className="border-t border-[#E2E5ED]">
            <th scope="row" className="whitespace-nowrap px-3 py-2.5 font-medium"><span data-service-name className="block font-semibold text-[#111827]">{service.reference || service.name}</span>{(service.description || descriptions[service.id]) && <span data-service-description className="block text-[11px] font-normal leading-4 text-[#7A8190]">{service.description || descriptions[service.id]}</span>}</th>
            <td className="whitespace-nowrap px-3 py-2.5 tabular-nums font-medium">{Number.isFinite(service.uptimePercentage) && service.uptimePercentage >= 0 && service.uptimePercentage <= 100 ? `${service.uptimePercentage.toFixed(2)}%` : 'Not available'}</td>
            <td className="whitespace-nowrap px-3 py-2.5 tabular-nums font-medium">{Number.isFinite(service.responseTimeMs) && service.responseTimeMs >= 0 ? `${Math.round(service.responseTimeMs)} ms` : 'Not available'}</td>
            <td className="px-3 py-2.5"><span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] leading-4 font-medium ${badge.color}`}><span className="h-1.5 w-1.5 rounded-full bg-current"></span>{badge.label}</span></td>
          </tr>
        }) : <tr className="border-t border-[#E2E5ED]"><td colSpan={4} className="px-3 py-4 text-center text-sm text-[#7A8190]">{status === 'loading' ? <span role="status">Loading monitoring data...</span> : status === 'error' ? <span role="alert">Unable to load monitoring data.</span> : source.length && filter !== 'all' ? 'No services match this status.' : 'No monitoring data available yet.'}</td></tr>}</tbody>
      </table>
    </div>
  </section>
}
