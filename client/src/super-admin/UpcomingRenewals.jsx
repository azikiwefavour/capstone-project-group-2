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
    <section data-overview-card="renewals" aria-labelledby="upcoming-renewals-heading" className="min-w-0 rounded-2xl border border-[#E2E5ED] bg-white p-5 sm:p-6 shadow-xs dark:border-[#253248] dark:bg-[#161F30]">
      <div className="flex items-center justify-between gap-3">
        <h2 id="upcoming-renewals-heading" className="text-base font-semibold text-[#111827] dark:text-[#F8FAFC]">Upcoming renewals</h2>
        <Link to="/super-admin/subscriptions" className="shrink-0 text-xs font-semibold text-[#475AA2] hover:underline dark:text-[#A5B4FC]">View all</Link>
      </div>
      <OverviewSectionState state={viewState} onRetry={onRetry} emptyText="No renewal data available." unavailableText="No renewal data available." />
      {viewState.status === 'ready' && (renewals.length ? <ul aria-label="Upcoming subscription renewals" className="mt-4 divide-y divide-[#E2E5ED] dark:divide-[#253248]">
        {renewals.slice(0, 4).map((renewal, index) => {
          const initials = renewal.hospitalName
            ? renewal.hospitalName.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
            : 'H'
          return (
            <li key={renewal.id || `${renewal.renewalDate}-${index}`} className="flex items-center gap-3.5 py-3.5">
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFEAE8] text-xs font-bold text-[#E5484D] dark:bg-[#3D1E22] dark:text-[#F87171]">
                {initials}
              </span>
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#111827] dark:text-[#F8FAFC]">{renewal.hospitalName || 'Hospital name unavailable'}</p>
                  <p className="mt-0.5 text-xs text-[#7A8190] dark:text-[#94A3B8]">
                    <span>{renewal.plan || 'Plan unavailable'}</span>
                    <span className="mx-1.5">·</span>
                    <time dateTime={renewal.renewalDate}>{formatRenewalDate(renewal.renewalDate)}</time>
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-[#111827] dark:text-[#F8FAFC]">
                    {Number.isFinite(renewal.amount) && renewal.amount >= 0 ? formatNaira(renewal.amount) : 'Amount unavailable'}
                  </p>
                </div>
              </div>
            </li>
          )
        })}
      </ul> : <p className="py-6 text-sm text-[#7A8190] dark:text-[#94A3B8]">No renewal data available.</p>)}
    </section>
  )
}
