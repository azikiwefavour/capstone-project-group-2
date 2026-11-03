import { Link } from 'react-router-dom'
import { formatActivityTimestamp, normalizePlatformActivity, recentPlatformActivities } from './activityData'
import OverviewSectionState from './OverviewSectionState.jsx'

export default function RecentPlatformActivities({ state = { status: 'unavailable' }, onRetry }) {
  const apiRecords = state.source === 'dashboard-api'
  const invalid = state.status === 'ready' && (!Array.isArray(state.data) || (!apiRecords && state.data.some(record => !normalizePlatformActivity(record))))
  const viewState = invalid ? { status: 'error' } : state
  const records = viewState.status === 'ready' ? (apiRecords ? state.data.slice().sort((a, b) => b.timestamp - a.timestamp) : recentPlatformActivities(state.data)).slice(0, 5) : []
  const tableState = viewState.status === 'ready' && !records.length ? { status: 'empty' } : viewState

  return (
    <section data-overview-card="activities" aria-labelledby="recent-platform-activities-heading" className="mt-6 min-w-0 rounded-2xl border border-[#E2E5ED] bg-white p-5 sm:p-6 shadow-xs dark:border-[#253248] dark:bg-[#161F30]">
      <div className="flex items-center justify-between gap-3">
        <h2 id="recent-platform-activities-heading" className="text-base font-semibold text-[#111827] dark:text-[#F8FAFC]">Recent platform activities</h2>
        <Link to="/super-admin/audit-log" className="shrink-0 text-xs font-semibold text-[#475AA2] hover:underline dark:text-[#A5B4FC]">View all</Link>
      </div>
      <div role="region" aria-label="Recent platform activities table" tabIndex={0} className="relative mt-4 min-w-0 overflow-x-auto rounded-xl border border-[#E2E5ED] dark:border-[#253248] focus-visible:outline-2 focus-visible:outline-[#475AA2]">
        <table className="w-full min-w-[640px] border-collapse text-left text-xs">
          <caption className="sr-only">The five most recent platform activities. Times are shown in UTC.</caption>
          <thead className="bg-[#F7F8FB] text-[#52556C] dark:bg-[#1E293B] dark:text-[#94A3B8]">
            <tr>
              {['When', 'Who', 'Action', 'Facility'].map(label => (
                <th key={label} scope="col" className="px-4 py-3 font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    {label}
                    <svg className="h-3.5 w-3.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m7 15 5 5 5-5M7 9l5-5 5 5" /></svg>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-[#52556C] dark:text-[#CBD5E1]">
            {records.length ? records.map((record, index) => (
              <tr key={`${record.occurredAt}-${index}`} className="border-t border-[#E2E5ED] dark:border-[#253248] hover:bg-[#F9FAFD] dark:hover:bg-[#1A253A] transition">
                <td className="whitespace-nowrap px-4 py-3.5"><time dateTime={record.occurredAt}>{formatActivityTimestamp(record.occurredAt)}</time></td>
                <td className="max-w-[200px] break-words px-4 py-3.5 font-medium text-[#111827] dark:text-[#F8FAFC]">{record.actor}</td>
                <td className="px-4 py-3.5">{record.action}</td>
                <td className="max-w-[240px] break-words px-4 py-3.5">{record.facility}</td>
              </tr>
            )) : (
              <tr className="border-t border-[#E2E5ED] dark:border-[#253248]">
                <td colSpan={4} className="px-4 py-6">
                  <OverviewSectionState state={tableState} onRetry={onRetry} emptyText="No activity data available." unavailableText="No activity data available." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
