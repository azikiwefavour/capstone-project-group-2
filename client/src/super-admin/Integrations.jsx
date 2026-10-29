import { Link } from 'react-router-dom'
import { integrationHealth } from './overviewData'
import OverviewSectionState from './OverviewSectionState.jsx'

const services = [
  { id: 'medtrail', name: 'Medtrail API', path: 'M22 12h-4l-3 9L9 3l-3 9H2', bg: 'bg-[#E6F4EA] text-[#137333] dark:bg-[#132C1E] dark:text-[#86EFAC]' },
  { id: 'paystack', name: 'Paystack', path: 'M3 6h18v13H3z M3 10h18 M7 15h3', bg: 'bg-[#E0F2F1] text-[#00796B] dark:bg-[#112D29] dark:text-[#80CBC4]' },
  { id: 'termii-sms', name: 'Termii SMS', path: 'M3 4h18v13H9l-6 4z M7 8h10 M7 12h6', bg: 'bg-[#F3E5F5] text-[#7B1FA2] dark:bg-[#2A1830] dark:text-[#CE93D8]' },
  { id: 'termii-whatsapp', name: 'Termii WhatsApp', path: 'M21 11.5a9 9 0 0 1-13 8L3 21l1.5-5A9 9 0 1 1 21 11.5 M8 8c0 4 2 6 6 6', bg: 'bg-[#F3E5F5] text-[#7B1FA2] dark:bg-[#2A1830] dark:text-[#CE93D8]' },
]

const statuses = {
  operational: { label: 'Operational', className: 'bg-[#E6F4EA] text-[#137333] dark:bg-[#132C1E] dark:text-[#86EFAC]', symbol: '●' },
  degraded: { label: 'Degraded', className: 'bg-[#FEF3D6] text-[#B06000] dark:bg-[#33220E] dark:text-[#FCD34D]', symbol: '▲' },
  down: { label: 'Down', className: 'bg-[#FDE8E8] text-[#9B1C1C] dark:bg-[#361A1D] dark:text-[#F87171]', symbol: '■' },
  unavailable: { label: 'Unavailable', className: 'bg-[#F6F7FB] text-[#7A8190] dark:bg-[#1E293B] dark:text-[#94A3B8]', symbol: '—' },
}

export default function Integrations({ state = { status: 'unavailable' }, onRetry }) {
  const invalid = state.status === 'ready' && !Array.isArray(state.data)
  const viewState = invalid ? { status: 'error' } : state
  return (
    <section data-overview-card="integrations" aria-labelledby="integrations-heading" className="min-w-0 rounded-2xl border border-[#E2E5ED] bg-white p-5 sm:p-6 shadow-xs dark:border-[#253248] dark:bg-[#161F30]">
      <div className="flex items-center justify-between gap-3">
        <h2 id="integrations-heading" className="text-base font-semibold text-[#111827] dark:text-[#F8FAFC]">Integrations</h2>
        <Link to="/super-admin/system-health" className="shrink-0 text-xs font-semibold text-[#475AA2] hover:underline dark:text-[#A5B4FC]">View details</Link>
      </div>
      <OverviewSectionState state={viewState} onRetry={onRetry} emptyText="No integration health data available." unavailableText="Integration health monitoring is not connected yet." />
      <ul aria-label="Integration service health" className="mt-4 divide-y divide-[#E2E5ED] dark:divide-[#253248]">
        {services.map(service => {
          const health = integrationHealth(viewState.status === 'ready' ? state.data.find(record => record?.id === service.id) : null)
          const status = statuses[health.status] || statuses.unavailable
          return (
            <li key={service.id} className="flex items-center gap-3.5 py-3.5">
              <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${service.bg}`}>
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d={service.path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F8FAFC]">{service.name}</h3>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                    <span aria-hidden="true" className="text-[10px]">{status.symbol}</span>
                    <span>{status.label}</span>
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[#7A8190] dark:text-[#94A3B8]">{health.uptime} · {health.response}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
