import { formatStatistic } from './statisticsMetrics'

const definitions = [
  { key: 'registeredFacilities', label: 'Registered Facilities', path: 'M4 21V5h16v16 M9 21v-5h6v5 M8 9h1 M15 9h1 M8 12h1 M15 12h1', description: 'Hospitals that have previously subscribed, including expired subscriptions.' },
  { key: 'activeSubscribers', label: 'Active Subscribers', path: 'M4 5h16v15H4z M4 10h16 M8 3v4 M16 3v4 M9 15l2 2 4-4', description: 'Hospitals with currently active subscriptions.' },
  { key: 'messagesSent', label: 'Messages Sent', path: 'M3 4h18v13H9l-6 4z M7 8h10 M7 12h6', description: 'Total SMS and WhatsApp messages sent.' },
  { key: 'patientsOnRecord', label: 'Patients on Record', path: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 8v6 M17 11h6', description: 'Aggregate patient records across hospitals; no individual patient information.' },
]

function isCount(value) {
  return Number.isSafeInteger(value) && value >= 0
}

function SecondaryInformation({ metric, data }) {
  const items = []
  if (metric === 'registeredFacilities' && isCount(data.pendingApplications)) items.push(`${formatStatistic(data.pendingApplications)} pending applications`)
  if (metric === 'activeSubscribers') {
    if (isCount(data.trialSubscriptions)) items.push(`${formatStatistic(data.trialSubscriptions)} trial-period`)
    if (isCount(data.overdueSubscriptions)) items.push(`${formatStatistic(data.overdueSubscriptions)} overdue`)
  }
  if (metric === 'messagesSent' && Number.isFinite(data.deliveryPercentage) && data.deliveryPercentage >= 0 && data.deliveryPercentage <= 100) items.push(`${data.deliveryPercentage.toFixed(1)}% delivered`)
  if (metric === 'patientsOnRecord' && isCount(data.liveFacilities)) items.push(`Across ${formatStatistic(data.liveFacilities)} live facilities`)
  return <p className="mt-2 text-xs leading-5 text-[#7A8190]">{items.length ? items.join(' · ') : 'Additional details unavailable'}</p>
}

export default function PlatformStatistics({ state = { status: 'unavailable' }, onRetry }) {
  const ready = state.status === 'ready' && state.data
  return (
    <section data-overview-card="statistics" aria-label="Platform statistics" className="flex min-w-0 flex-col">
      {state.preview && <p className="mb-3 text-xs leading-5 text-[#7A8190]">Sample platform statistics — development preview only.</p>}
      {state.status === 'error' && <div role="alert" className="mb-3 text-sm text-[#52556C]">Unable to load platform statistics.{onRetry && <button type="button" onClick={onRetry} className="ml-2 rounded-lg px-2 py-1 font-semibold text-[#475AA2] underline focus-visible:outline-2 focus-visible:outline-[#475AA2]">Try again</button>}</div>}
      {state.status === 'loading' && <p role="status" className="mb-3 text-sm text-[#7A8190]">Loading platform statistics...</p>}
      {state.status === 'empty' && <p className="mb-3 text-sm text-[#7A8190]">No platform statistics available yet.</p>}
      <div className="grid flex-1 grid-cols-1 gap-4 min-[360px]:grid-cols-2 sm:gap-5">
        {definitions.map(metric => (
          <article key={metric.key} aria-label={metric.label} aria-busy={state.status === 'loading'} className="min-w-0 rounded-2xl border border-[#E2E5ED] bg-white p-4 sm:p-5">
            <span aria-hidden="true" className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#475AA2]">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d={metric.path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <h2 title={metric.description} className="text-sm font-medium leading-5 text-[#52556C]">{metric.label}</h2>
            <p className="mt-2 text-[28px] font-semibold leading-9 text-[#111827]">{ready ? formatStatistic(state.data[metric.key]) : '—'}</p>
            {ready ? <SecondaryInformation metric={metric.key} data={state.data} /> : <p className="mt-2 text-xs leading-5 text-[#7A8190]">{state.status === 'loading' ? 'Loading...' : state.status === 'error' ? 'Statistics unavailable' : state.status === 'empty' ? 'No records available' : 'Not connected yet'}</p>}
          </article>
        ))}
      </div>
    </section>
  )
}
