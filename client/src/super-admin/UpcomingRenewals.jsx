import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatNaira } from './revenue'
import { formatRenewalDate, futureRenewals } from './overviewData'
import OverviewSectionState from './OverviewSectionState.jsx'

export default function UpcomingRenewals({ state = { status: 'unavailable' }, onRetry, now }) {
  const [clock, setClock] = useState(() => Date.now())
  useEffect(() => {
    if (now !== undefined || state.status !== 'ready' || !Array.isArray(state.data) || !state.data.length) return
    const refresh = () => setClock(Date.now())
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [now, state.status, state.data])
  const invalid = state.status === 'ready' && !Array.isArray(state.data)
  const viewState = invalid ? { status: 'error' } : state
  const renewals = viewState.status === 'ready'
    ? (Array.isArray(state.data) ? (now !== undefined ? futureRenewals(state.data, now) : state.data) : [])
    : []
  return (
    <section data-overview-card="renewals" aria-labelledby="upcoming-renewals-heading" className="min-w-0 rounded-2xl border border-[#E2E5ED] bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="upcoming-renewals-heading" className="text-base font-semibold">Upcoming renewals</h2>
        <Link to="/super-admin/subscriptions" className="shrink-0 text-sm font-semibold text-[#475AA2] hover:underline">View all</Link>
      </div>
      <OverviewSectionState state={viewState} onRetry={onRetry} emptyText="No renewal data available." unavailableText="No renewal data available." />
      {viewState.status === 'ready' && (renewals.length ? <ul aria-label="Upcoming subscription renewals" className="mt-3 divide-y divide-[#E2E5ED]">
        {renewals.slice(0, 4).map((renewal, index) => <li key={renewal.id || `${renewal.renewalDate}-${index}`} className="flex items-start gap-3 py-4">
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#475AA2]"><svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M4 21V5h16v16 M9 21v-5h6v5 M8 9h1 M15 9h1 M8 12h1 M15 12h1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
          <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="min-w-0 flex-1 basis-28"><p className="break-words text-sm font-medium">{renewal.hospitalName || 'Hospital name unavailable'}</p><p className="mt-1 text-xs leading-5 text-[#7A8190]">{renewal.plan || 'Plan unavailable'}</p></div>
            <div className="text-right"><p className="text-sm font-semibold">{Number.isFinite(renewal.amount) && renewal.amount >= 0 ? formatNaira(renewal.amount) : 'Amount unavailable'}</p><time dateTime={renewal.renewalDate} className="mt-1 block text-xs leading-5 text-[#7A8190]">{formatRenewalDate(renewal.renewalDate)}</time></div>
          </div>
        </li>)}
      </ul> : <p className="py-6 text-sm text-[#7A8190]">No renewal data available.</p>)}
    </section>
  )
}
