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
import { getSuperAdminSystemHealth, runSystemHealthChecks } from './systemHealthApi.js'

export function SuperAdminSystemHealthPage({ profile, onLogout, preview = false, data, state = createSystemHealthState(), live = false }) {
  const [remote, setRemote] = useState(null), [attempt, setAttempt] = useState(0)
  const [runningChecks, setRunningChecks] = useState(false)
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
      read()
    }, 60000)
    return () => { disposed = true; controller?.abort(); window.clearInterval(timer) }
  }, [live, attempt])

  async function handleRunChecks() {
    if (runningChecks) return
    setRunningChecks(true)
    try {
      const result = await runSystemHealthChecks()
      setRemote({ attempt, result })
    } catch {
      setAttempt(value => value + 1)
    } finally {
      setRunningChecks(false)
    }
  }

  const source = live ? remote?.attempt === attempt ? remote.result : createSystemHealthState('loading')
    : data === undefined ? createSystemHealthState(state?.status, state?.data) : createSystemHealthState('ready', data)
  const snapshot = source.data
  return <SuperAdminLayout profile={profile} onLogout={onLogout} preview={preview} page="system-health">
    <div data-system-health-heading className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1"><h1 className="text-2xl font-semibold tracking-normal xl:text-xl">System Health</h1><p className="mt-2 text-sm leading-6 text-[#7A8190]">Live status of MedTrail and the services it depends on. Checked every minute.</p></div>
      <button type="button" onClick={live ? handleRunChecks : undefined} disabled={runningChecks} title="Execute live diagnostic pings across all platform components" className="inline-flex shrink-0 cursor-pointer items-center gap-2 self-start rounded-xl bg-[#475AA2] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#3B4B88] active:scale-[0.98] transition-all disabled:opacity-60"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={`h-4 w-4 ${runningChecks ? 'animate-spin' : ''}`}><path d="M20 7a8 8 0 1 0 0 10 M20 3v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>{runningChecks ? 'Running checks...' : 'Run checks now'}</button>
    </div>
    <SystemHealthAlert services={snapshot?.services} alert={snapshot?.alert} status={source.status} neutral={false} error={source.error} onRetry={live ? () => setAttempt(value => value + 1) : undefined} />
    <SystemHealthSummaryCards summary={systemHealthSummary(snapshot)} details={snapshot?.summaryDetails} />
    <div data-system-health-details>
      <SystemHealthPlatform services={snapshot?.services} status={source.status} periodLabel="Last 30 days" />
      <SystemHealthIncidents incidents={snapshot?.incidents} services={snapshot?.services} reportingPeriod={snapshot?.reportingPeriod} allowInferredPeriod={snapshot?.reportingPeriodUnavailable !== true} status={source.status} />
    </div>
  </SuperAdminLayout>
}

export default function SuperAdminSystemHealth() {
  const context = useOutletContext()
  return <SuperAdminSystemHealthPage live profile={context?.profile} onLogout={context?.onLogout} />
}
