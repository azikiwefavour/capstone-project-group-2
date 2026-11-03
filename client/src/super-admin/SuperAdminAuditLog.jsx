import './auditLog.css'
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import SuperAdminLayout from './SuperAdminLayout.jsx'
import AuditLogTable from './AuditLogTable.jsx'
import { createAuditLogState } from './auditLogState.js'
import { getSuperAdminAuditLog, getAuditLogForSorting } from './auditLogApi.js'

export function SuperAdminAuditLogPage({ profile, onLogout, preview = false, records, state = createAuditLogState(), live = false }) {
  const [controls, setControls] = useState({ sort: { column: 'when', direction: 'desc' }, page: 1 })
  const [remote, setRemote] = useState(null), [attempt, setAttempt] = useState(0)
  const bulk = controls.sort.column !== 'when' || controls.sort.direction !== 'desc'
  const serverPage = bulk ? 1 : controls.page
  const requestKey = JSON.stringify([bulk, serverPage, attempt])
  useEffect(() => {
    if (!live) return
    const controller = new AbortController()
    const request = bulk ? getAuditLogForSorting : getSuperAdminAuditLog
    request({ page: serverPage }, controller.signal).then(result => {
      if (!controller.signal.aborted) setRemote({ key: requestKey, result })
    }).catch(error => {
      if (error.name !== 'AbortError' && !controller.signal.aborted) setRemote({ key: requestKey, result: { ...createAuditLogState('error'), error: error.message } })
    })
    return () => controller.abort()
  }, [live, bulk, serverPage, requestKey])
  const source = live ? remote?.key === requestKey ? remote.result : createAuditLogState('loading')
    : records === undefined ? state : createAuditLogState('ready', records)
  function changeControls(update) { setControls(current => ({ ...current, ...update })) }
  return <SuperAdminLayout profile={profile} onLogout={onLogout} preview={preview} page="audit-log">
    <div data-audit-log-heading className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1"><h1 className="text-2xl font-semibold tracking-normal xl:text-xl">Audit log</h1><p className="mt-2 text-sm leading-6 text-[#7A8190]">Platform events: facility approvals, billing and plan changes.</p></div>
      <button type="button" disabled title={live ? 'Audit log export is not available from the backend' : 'Export data — functionality pending'} className="inline-flex shrink-0 cursor-not-allowed items-center gap-2 self-start rounded-xl border border-[#E2E5ED] bg-white px-3 py-2 text-xs font-medium text-[#7A8190]"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>Export data</button>
    </div>
    <AuditLogTable state={source} controls={live ? controls : undefined} onControlsChange={changeControls} serverPagination={live && !bulk ? source.pagination : undefined} onRetry={live ? () => setAttempt(value => value + 1) : undefined} />
  </SuperAdminLayout>
}

export default function SuperAdminAuditLog() {
  const context = useOutletContext()
  return <SuperAdminAuditLogPage live profile={context?.profile} onLogout={context?.onLogout} />
}
