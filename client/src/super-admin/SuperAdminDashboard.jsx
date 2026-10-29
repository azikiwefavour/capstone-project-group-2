import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { createOverviewState } from './overviewState.js'
import { getSuperAdminOverview, exportOverviewExcel } from './overviewApi.js'
import { getSuperAdminAccessToken, subscribeToSuperAdminSession } from './authentication'
import SuperAdminLayout from './SuperAdminLayout.jsx'
import RevenuePlanMix from './RevenuePlanMix'
import PlatformStatistics from './PlatformStatistics.jsx'
import UpcomingRenewals from './UpcomingRenewals.jsx'
import Integrations from './Integrations.jsx'
import RecentPlatformActivities from './RecentPlatformActivities.jsx'
import { useToast } from '../components/ToastNotification'

// profile and onLogout come from the verified Super Admin boundary.
export function SuperAdminDashboard({
  profile, onLogout, preview = false,
  overviewState = createOverviewState(),
  statisticsState = overviewState.statisticsState,
  platformState = overviewState.platformState,
  renewalsState = overviewState.renewalsState,
  integrationsState = overviewState.integrationsState,
  activitiesState = overviewState.activitiesState,
  facilityReviewState = overviewState.facilityReviewState ?? { status: 'unavailable' },
  onRetry,
}) {
  const [isExporting, setIsExporting] = useState(false)
  const toast = useToast()

  async function handleExport() {
    if (preview) {
      toast.info('Export preview: In live mode, this downloads a 6-sheet Excel workbook.', 'Local Preview')
      return
    }
    setIsExporting(true)
    try {
      const { blob, filename } = await exportOverviewExcel()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000)
      toast.success('Platform overview workbook exported successfully.', 'Export Complete')
    } catch (err) {
      toast.error(err.message || 'Unable to export overview workbook.', 'Export Failed')
    } finally {
      setIsExporting(false)
    }
  }

  const facilityMessage = facilityReviewState.status === 'loading' ? 'Loading facility applications...'
    : facilityReviewState.status === 'error' ? 'Unable to load facility applications.'
      : facilityReviewState.status === 'empty' ? 'No facility applications awaiting review.'
        : facilityReviewState.status === 'ready' && facilityReviewState.data
          ? `${facilityReviewState.data.pendingCount} facility ${facilityReviewState.data.pendingCount === 1 ? 'application is waiting for review' : 'applications are waiting for review'} (${facilityReviewState.data.facilityName}).`
          : 'Facility application notifications are not connected yet.'

  return (
    <SuperAdminLayout profile={profile} onLogout={onLogout} preview={preview}>
      <div data-overview-intro className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">Platform overview</h1>
          <p className="mt-1 text-sm text-[#64748B] dark:text-[#94A3B8]">How facilities are using MedTrail this month.</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          aria-label="Export platform data"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#D0D5DD] bg-white px-3.5 py-2 text-xs font-semibold text-[#344054] shadow-xs hover:bg-[#F9FAFB] active:scale-95 disabled:opacity-60 dark:border-[#2C3852] dark:bg-[#161F30] dark:text-[#CBD5E1] dark:hover:bg-[#1E293B] transition-all"
        >
          <svg className="h-4 w-4 text-[#667085] dark:text-[#94A3B8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M12 12v9m-4-4 4 4 4-4" />
          </svg>
          {isExporting ? 'Exporting...' : 'Export data'}
        </button>
      </div>

      <section
        aria-labelledby="facility-applications-heading"
        className="mt-6 flex flex-col gap-4 rounded-2xl border border-[#FFE2DC] bg-[#FFF5F3] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-[#52251E] dark:bg-[#2A1815]"
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFE6DE] text-[#EA580C] dark:bg-[#461D15] dark:text-[#FB923C]">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
              <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <h2 id="facility-applications-heading" className="sr-only">Facility applications</h2>
            <p
              role={facilityReviewState.status === 'error' ? 'alert' : facilityReviewState.status === 'loading' ? 'status' : undefined}
              className="text-sm font-semibold text-[#1E293B] dark:text-[#F8FAFC]"
            >
              {facilityMessage}
            </p>
          </div>
        </div>
        <Link
          to="/super-admin/facilities"
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-[#4558B2] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#384896] active:scale-95 transition-all"
        >
          Review
        </Link>
      </section>

      <div data-overview-row className="mt-6 grid min-w-0 items-stretch gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <RevenuePlanMix state={statisticsState} onRetry={onRetry} />
        <PlatformStatistics state={platformState} onRetry={onRetry} />
      </div>

      <div data-overview-row className="mt-6 grid min-w-0 items-stretch gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <UpcomingRenewals state={renewalsState} onRetry={onRetry} />
        <Integrations state={integrationsState} onRetry={onRetry} />
      </div>

      <RecentPlatformActivities state={activitiesState} onRetry={onRetry} />
    </SuperAdminLayout>
  )
}

export default function SuperAdminOverview() {
  const context = useOutletContext()
  const token = useSyncExternalStore(subscribeToSuperAdminSession, getSuperAdminAccessToken)
  const [attempt, setAttempt] = useState(0)
  const [snapshot, setSnapshot] = useState(null)
  const checked = snapshot?.token === token && snapshot?.attempt === attempt
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    getSuperAdminOverview(controller.signal).then(state => {
      if (!controller.signal.aborted && getSuperAdminAccessToken() === token) setSnapshot({ token, attempt, state })
    }).catch(error => {
      if (error.name !== 'AbortError' && !controller.signal.aborted && getSuperAdminAccessToken() === token) {
        setSnapshot({ token, attempt, state: { ...createOverviewState('error'), facilityReviewState: { status: 'error' } } })
      }
    })
    return () => controller.abort()
  }, [token, attempt])
  const state = checked ? snapshot.state : { ...createOverviewState(token ? 'loading' : 'unavailable'), facilityReviewState: { status: token ? 'loading' : 'unavailable' } }
  return <SuperAdminDashboard profile={context?.profile} onLogout={context?.onLogout} overviewState={state} onRetry={() => setAttempt(value => value + 1)} />
}
