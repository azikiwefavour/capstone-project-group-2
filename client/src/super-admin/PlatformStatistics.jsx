import { formatStatistic } from './statisticsMetrics'

const definitions = [
  { key: 'registeredFacilities', label: 'Registered facilities', path: 'M4 21V5h16v16 M9 21v-5h6v5 M8 9h1 M15 9h1 M8 12h1 M15 12h1', description: 'Hospitals that have previously subscribed, including expired subscriptions.' },
  { key: 'activeSubscribers', label: 'Active subscribers', path: 'M4 5h16v15H4z M4 10h16 M8 3v4 M16 3v4 M9 15l2 2 4-4', description: 'Hospitals with currently active subscriptions.' },
  { key: 'messagesSent', label: 'Messages sent', path: 'M3 4h18v13H9l-6 4z M7 8h10 M7 12h6', description: 'Total SMS and WhatsApp messages sent.' },
  { key: 'patientsOnRecord', label: 'Patients on record', path: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 8v6 M17 11h6', description: 'Aggregate patient records across hospitals; no individual patient information.' },
]

function isCount(value) {
  return Number.isSafeInteger(value) && value >= 0
}

function SecondaryInformation({ metric, data }) {
  if (metric === 'registeredFacilities') {
    return isCount(data.pendingApplications) ? (
      <p className="mt-2 text-xs leading-5 text-[#64748B] dark:text-[#94A3B8]">
        {formatStatistic(data.pendingApplications)} {data.pendingApplications === 1 ? 'awaiting review' : 'awaiting review'}
      </p>
    ) : (
      <p className="mt-2 text-xs leading-5 text-[#7A8190] dark:text-[#94A3B8]">Additional details unavailable</p>
    )
  }

  if (metric === 'activeSubscribers') {
    const hasTrial = isCount(data.trialSubscriptions)
    const hasOverdue = isCount(data.overdueSubscriptions)
    if (!hasTrial && !hasOverdue) {
      return <p className="mt-2 text-xs leading-5 text-[#7A8190] dark:text-[#94A3B8]">Additional details unavailable</p>
    }
    return (
      <p className="mt-2 text-xs leading-5 text-[#64748B] dark:text-[#94A3B8]">
        {hasTrial && <span>{formatStatistic(data.trialSubscriptions)} in trial period</span>}
        {hasTrial && hasOverdue && <span>, </span>}
        {hasOverdue && (
          <span className="font-semibold text-rose-600 dark:text-rose-400">
            {formatStatistic(data.overdueSubscriptions)} overdue
          </span>
        )}
      </p>
    )
  }

  if (metric === 'messagesSent') {
    return Number.isFinite(data.deliveryPercentage) && data.deliveryPercentage >= 0 && data.deliveryPercentage <= 100 ? (
      <p className="mt-2 text-xs leading-5">
        <span className="font-semibold text-[#16A34A] dark:text-[#4ADE80]">
          {data.deliveryPercentage.toFixed(1)}% delivered
        </span>
      </p>
    ) : (
      <p className="mt-2 text-xs leading-5 text-[#7A8190] dark:text-[#94A3B8]">Additional details unavailable</p>
    )
  }

  if (metric === 'patientsOnRecord') {
    return isCount(data.liveFacilities) ? (
      <p className="mt-2 text-xs leading-5 text-[#64748B] dark:text-[#94A3B8]">
        Across {formatStatistic(data.liveFacilities)} live facilities
      </p>
    ) : (
      <p className="mt-2 text-xs leading-5 text-[#7A8190] dark:text-[#94A3B8]">Additional details unavailable</p>
    )
  }

  return <p className="mt-2 text-xs leading-5 text-[#7A8190] dark:text-[#94A3B8]">Additional details unavailable</p>
}

export default function PlatformStatistics({ state = { status: 'unavailable' }, onRetry }) {
  const ready = state.status === 'ready' && state.data
  return (
    <section data-overview-card="statistics" aria-label="Platform statistics" className="flex min-w-0 flex-col">
      {state.status === 'error' && (
        <div role="alert" className="mb-3 text-sm text-[#52556C] dark:text-[#CBD5E1]">
          Unable to load platform statistics.
          {onRetry && <button type="button" onClick={onRetry} className="ml-2 rounded-lg px-2 py-1 font-semibold text-[#475AA2] underline focus-visible:outline-2 focus-visible:outline-[#475AA2] dark:text-[#A5B4FC]">Try again</button>}
        </div>
      )}
      {state.status === 'loading' && <p role="status" className="mb-3 text-sm text-[#7A8190] dark:text-[#94A3B8]">Loading platform statistics...</p>}
      {state.status === 'empty' && <p className="mb-3 text-sm text-[#7A8190] dark:text-[#94A3B8]">No platform statistics available yet.</p>}
      <div className="grid flex-1 grid-cols-1 gap-4 min-[360px]:grid-cols-2 sm:gap-5">
        {definitions.map(metric => (
          <article
            key={metric.key}
            aria-label={metric.label}
            aria-busy={state.status === 'loading'}
            className="flex flex-col justify-between min-w-0 rounded-2xl border border-[#E2E5ED] bg-white p-5 shadow-xs dark:border-[#253248] dark:bg-[#161F30]"
          >
            <div>
              <div className="flex items-center gap-2.5">
                <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FC] text-[#475AA2] dark:bg-[#202C48] dark:text-[#A5B4FC]">
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d={metric.path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <h2 title={metric.description} className="text-xs sm:text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">{metric.label}</h2>
              </div>
              <p className="mt-2.5 text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
                {ready ? formatStatistic(state.data[metric.key]) : '—'}
              </p>
            </div>
            {ready ? (
              <SecondaryInformation metric={metric.key} data={state.data} />
            ) : (
              <p className="mt-2 text-xs leading-5 text-[#7A8190] dark:text-[#94A3B8]">
                {state.status === 'loading' ? 'Loading...' : state.status === 'error' ? 'Statistics unavailable' : state.status === 'empty' ? 'No records available' : 'Not connected yet'}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
