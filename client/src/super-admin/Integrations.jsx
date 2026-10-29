import { Link } from 'react-router-dom'
import { integrationHealth } from './overviewData'
import OverviewSectionState from './OverviewSectionState.jsx'

const services = [
  ['medtrail', 'MedTrail API', 'M4 8l-3 4 3 4 M20 8l3 4-3 4 M15 4l-6 16'],
  ['paystack', 'Paystack', 'M3 6h18v13H3z M3 10h18 M7 15h3'],
  ['termii-sms', 'Termii SMS', 'M3 4h18v13H9l-6 4z M7 8h10 M7 12h6'],
  ['termii-whatsapp', 'Termii WhatsApp', 'M21 11.5a9 9 0 0 1-13 8L3 21l1.5-5A9 9 0 1 1 21 11.5 M8 8c0 4 2 6 6 6'],
]
const statuses = {
  operational: { label: 'Operational', className: 'bg-[#D0E7DC] text-[#2F7D59]', symbol: '✓' },
  degraded: { label: 'Degraded', className: 'bg-[#FFF4E5] text-[#9A5B13]', symbol: '!' },
  down: { label: 'Down', className: 'bg-[#F8D6DD] text-[#B83F5C]', symbol: '×' },
  unavailable: { label: 'Unavailable', className: 'bg-[#F6F7FB] text-[#7A8190]', symbol: '—' },
}

export default function Integrations({ state = { status: 'unavailable' }, onRetry }) {
  const invalid = state.status === 'ready' && !Array.isArray(state.data)
  const viewState = invalid ? { status: 'error' } : state
  return (
    <section data-overview-card="integrations" aria-labelledby="integrations-heading" className="min-w-0 rounded-2xl border border-[#E2E5ED] bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3"><h2 id="integrations-heading" className="text-base font-semibold">Integrations</h2><Link to="/super-admin/system-health" className="shrink-0 text-sm font-semibold text-[#475AA2] hover:underline">View details</Link></div>
      <OverviewSectionState state={viewState} onRetry={onRetry} emptyText="No integration health data available." unavailableText="Integration health monitoring is not connected yet." />
      <ul aria-label="Integration service health" className="mt-3 divide-y divide-[#E2E5ED]">
        {services.map(([id, name, path]) => {
          const health = integrationHealth(viewState.status === 'ready' ? state.data.find(record => record?.id === id) : null)
          const status = statuses[health.status]
          return <li key={id} className="flex items-start gap-3 py-4">
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#475AA2]"><svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2"><h3 className="text-sm font-medium">{name}</h3><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.className}`}><span aria-hidden="true">{status.symbol}</span><span>{status.label}</span></span></div><p className="mt-1 text-xs leading-5 text-[#7A8190]">{health.uptime} · {health.response}</p></div>
          </li>
        })}
      </ul>
    </section>
  )
}
