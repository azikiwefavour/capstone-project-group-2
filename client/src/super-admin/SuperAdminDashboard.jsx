import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { createOverviewState } from './overviewState.js'
import { getSuperAdminOverview } from './overviewApi.js'
import { getSuperAdminAccessToken, subscribeToSuperAdminSession } from './authentication'
import SuperAdminLayout from './SuperAdminLayout.jsx'
import RevenuePlanMix from './RevenuePlanMix'
import PlatformStatistics from './PlatformStatistics.jsx'
import UpcomingRenewals from './UpcomingRenewals.jsx'
import Integrations from './Integrations.jsx'
import RecentPlatformActivities from './RecentPlatformActivities.jsx'

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
  const facilityMessage = facilityReviewState.status === 'loading' ? 'Loading facility applications...'
    : facilityReviewState.status === 'error' ? 'Unable to load facility applications.'
      : facilityReviewState.status === 'empty' ? 'No facility applications awaiting review.'
        : facilityReviewState.status === 'ready' && facilityReviewState.data
          ? `${facilityReviewState.data.pendingCount} facility ${facilityReviewState.data.pendingCount === 1 ? 'application' : 'applications'} awaiting review (${facilityReviewState.data.facilityName}).`
          : 'Facility application notifications are not connected yet.'
  return (
    <SuperAdminLayout profile={profile} onLogout={onLogout} preview={preview}>
        <div data-overview-intro className="mt-4">
          <h1 className="text-2xl font-semibold tracking-normal">Platform overview</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-[#7A8190]">How facilities are using MedTrail this month.</p>
        </div>
        <section aria-labelledby="facility-applications-heading" className="mt-6 flex flex-col gap-4 rounded-2xl border border-[#DEE2F4] bg-[#EEF0FF] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#475AA2]">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <div><h2 id="facility-applications-heading" className="text-sm font-semibold">Facility applications</h2><p role={facilityReviewState.status === 'error' ? 'alert' : facilityReviewState.status === 'loading' ? 'status' : undefined} className="mt-1 text-sm leading-5 text-[#52556C]">{facilityMessage}</p></div>
          </div>
          <Link to="/super-admin/facilities" className="min-h-10 shrink-0 inline-flex items-center justify-center rounded-xl bg-[#475AA2] hover:bg-[#3B4C8D] active:scale-95 px-5 py-2 text-sm font-semibold text-white sm:self-center transition-all">Review</Link>
        </section>
        <div data-overview-row className="mt-6 grid min-w-0 items-stretch gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] xl:gap-6">
          <RevenuePlanMix state={statisticsState} onRetry={onRetry} />
          <PlatformStatistics state={platformState} onRetry={onRetry} />
        </div>
        <div data-overview-row className="mt-6 grid min-w-0 items-stretch gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] xl:gap-6">
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
