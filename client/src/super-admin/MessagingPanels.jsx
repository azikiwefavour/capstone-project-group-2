import { useId } from 'react'
import { formatStatistic } from './statisticsMetrics'
import { messagingUsage } from './messagingModel.js'

const categoryNames = ['Staff invites', 'Verification codes', 'Prescription details']
const validCount = value => Number.isSafeInteger(value) && value >= 0

export function MessagingUsagePanel({ usage, status, onViewAll, onRetry, error, unavailableMessage }) {
  const id = useId()
  return <section aria-labelledby={`${id}-usage`} className="min-w-0 rounded-2xl border border-[#E2E5ED] bg-white p-4">
    <div className="flex items-center justify-between gap-3"><h2 id={`${id}-usage`} className="text-base font-semibold">Usage</h2><button type="button" disabled={!onViewAll || status === 'loading'} onClick={onViewAll} title={onViewAll ? 'View all facility usage' : 'Usage details — coming soon'} className={`${!onViewAll || status === 'loading' ? 'cursor-not-allowed' : 'cursor-pointer'} text-xs font-semibold text-[#7A8190]`}>View all{!onViewAll && <span className="sr-only"> — coming soon</span>}</button></div>
    {Array.isArray(usage) && usage.length ? <ul className="mt-4 space-y-5">{usage.map(row => {
      const display = messagingUsage(row.used, row.allowance)
      return <li key={row.name}>
        <div className="flex items-start justify-between gap-3"><h3 className="min-w-0 text-sm font-medium leading-5 text-[#52556C]">{row.name}</h3><p className="shrink-0 text-xs leading-5 text-[#7A8190]">{display.text}</p></div>
        {display.percentage !== null ? <div role="progressbar" aria-label={`${row.name} usage`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={display.percentage} aria-valuetext={display.text} className="mt-2 h-1.5 rounded-full bg-[#EEF0FF]"><div className={`h-full rounded-full ${row.warning ? 'bg-[#E9A23B]' : 'bg-[#475AA2]'}`} style={{ width: `${display.percentage}%` }} /></div> : <div aria-hidden="true" className="mt-2 h-1.5 rounded-full bg-[#EEF0FF]" />}
      </li>
    })}</ul> : <p className="py-6 text-sm text-[#7A8190]">{status === 'loading' ? <span role="status">Loading facility usage...</span> : status === 'error' ? <span role="alert">{error || 'Unable to load facility usage.'}{onRetry && <button type="button" onClick={onRetry} className="ml-2 text-[#475AA2] underline">Try again</button>}</span> : unavailableMessage || 'No facility usage data available yet.'}</p>}
  </section>
}

export default function MessagingPanels({ categories, usage, status, usageState, onViewAll, onUsageRetry }) {
  const id = useId()
  const rows = categoryNames.map(name => ({ name, count: Array.isArray(categories) ? categories.find(row => row.name === name)?.count : undefined }))
  const max = Math.max(1, ...rows.map(row => validCount(row.count) ? row.count : 0))
  return <div data-messaging-panels className="mt-4 grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
    <section aria-labelledby={`${id}-categories`} className="min-w-0 rounded-2xl border border-[#E2E5ED] bg-white p-4">
      <h2 id={`${id}-categories`} className="text-base font-semibold">Messages</h2>
      <ul className="mt-4 space-y-5">{rows.map(row => <li key={row.name}>
        <div className="flex items-start justify-between gap-3"><h3 className="text-sm font-medium leading-5 text-[#52556C]">{row.name}</h3><p className="text-xs leading-5 text-[#7A8190]">{formatStatistic(row.count)}</p></div>
        <div aria-hidden="true" className="mt-2 h-1.5 rounded-full bg-[#EEF0FF]">{validCount(row.count) && <div className="h-full rounded-full bg-[#475AA2]" style={{ width: `${row.count / max * 100}%` }} />}</div>
      </li>)}</ul>
    </section>
    <MessagingUsagePanel usage={usageState ? usageState.records : usage} status={usageState?.status || status} error={usageState?.error} onViewAll={onViewAll} onRetry={onUsageRetry} unavailableMessage={usageState ? 'Facility SMS usage and monthly allocations are unavailable.' : undefined} />
  </div>
}
