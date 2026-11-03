import './systemHealth.css'
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import SuperAdminLayout from './SuperAdminLayout.jsx'
import SystemHealthPlatform from './SystemHealthPlatform.jsx'
import SystemHealthIncidents from './SystemHealthIncidents.jsx'
import SystemHealthAlert from './SystemHealthAlert.jsx'
import SystemHealthSummaryCards from './SystemHealthSummaryCards.jsx'
import { systemHealthSummary } from './systemHealthModel.js'
import { createSystemHealthState } from './systemHealthState.js'
import { getSuperAdminSystemHealth } from './systemHealthApi.js'

export function SuperAdminSystemHealthPage({ profile, onLogout, preview = false, data, state = createSystemHealthState(), live = false }) {
  const [remote, setRemote] = useState(null), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!live) return
    let controller, disposed = false
    async function read() {
      controller?.abort()
      controller = new AbortController()
      const signal = controller.signal
      try {
        const result = await getSuperAdminSystemHealth(signal)
        if (!disposed && !signal.aborted) setRemote({ attempt, result })
      } catch (error) {
        if (!disposed && !signal.aborted && error.name !== 'AbortError') setRemote({ attempt, result: { ...createSystemHealthState('error'), error: error.message } })
      }
    }
    read()
    const timer = window.setInterval(() => {
      setRemote({ attempt, result: createSystemHealthState('loading') })
      read()
    }, 60000)
    return () => { disposed = true; controller?.abort(); window.clearInterval(timer) }
  }, [live, attempt])
  const source = live ? remote?.attempt === attempt ? remote.result : createSystemHealthState('loading')
    : data === undefined ? createSystemHealthState(state?.status, state?.data) : createSystemHealthState('ready', data)
  const snapshot = source.data
  return <SuperAdminLayout profile={profile} onLogout={onLogout} preview={preview} page="system-health">
    <div data-system-health-heading className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1"><h1 className="text-2xl font-semibold tracking-normal xl:text-xl">System Health</h1><p className="mt-2 text-sm leading-6 text-[#7A8190]">{live ? 'API liveness refreshed every minute. Other monitoring data is unavailable.' : 'Live status of MedTrail and the services it depends on. Checked every minute.'}</p></div>
      <button type="button" disabled title={live ? 'Manual monitoring checks are unavailable' : 'Monitoring checks are not connected yet'} className="inline-flex shrink-0 cursor-not-allowed items-center gap-2 self-start rounded-xl bg-[#475AA2] px-3 py-2 text-xs font-semibold text-white opacity-60"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M20 7a8 8 0 1 0 0 10 M20 3v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>Run checks now</button>
    </div>
    <SystemHealthAlert services={snapshot?.services} status={source.status} neutral={live} error={source.error} onRetry={live ? () => setAttempt(value => value + 1) : undefined} />
    <SystemHealthSummaryCards summary={systemHealthSummary(snapshot)} details={snapshot?.summaryDetails} />
    <div data-system-health-details>
      <SystemHealthPlatform services={snapshot?.services} status={source.status} periodLabel={live ? 'Current check' : undefined} />
      <SystemHealthIncidents incidents={snapshot?.incidents} services={snapshot?.services} reportingPeriod={snapshot?.reportingPeriod} allowInferredPeriod={snapshot?.reportingPeriodUnavailable !== true} status={source.status} />
    </div>
  </SuperAdminLayout>
}

export default function SuperAdminSystemHealth() {
  const context = useOutletContext()
  return <SuperAdminSystemHealthPage live profile={context?.profile} onLogout={context?.onLogout} />
}
