import './messaging.css'
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import SuperAdminLayout from './SuperAdminLayout.jsx'
import MessagingSummaryCards from './MessagingSummaryCards.jsx'
import MessagingPanels from './MessagingPanels.jsx'
import MessageLogTable from './MessageLogTable.jsx'
import { messagingSummary } from './messagingModel.js'
import { createMessagingState } from './messagingState.js'
import { getSuperAdminMessaging, getSuperAdminMessagingUsage } from './messagingApi.js'

export function SuperAdminMessagingPage({ profile, onLogout, preview = false, data, referenceDate, state = createMessagingState(), live = false }) {
  const [initialDate, setInitialDate] = useState(() => new Date())
  useEffect(() => {
    if (referenceDate) return
    const timer = window.setInterval(() => setInitialDate(new Date()), 60000)
    return () => window.clearInterval(timer)
  }, [referenceDate])
  const [controls, setControls] = useState({ tab: 'all', page: 1 })
  const [attempt, setAttempt] = useState(0), [remote, setRemote] = useState(null)
  const [usageAttempt, setUsageAttempt] = useState(0), [usageRemote, setUsageRemote] = useState(null)
  const requestKey = JSON.stringify([controls, attempt])
  useEffect(() => {
    if (!live) return
    const controller = new AbortController()
    getSuperAdminMessaging(controls, controller.signal).then(result => {
      if (!controller.signal.aborted) setRemote({ key: requestKey, result })
    }).catch(error => {
      if (error.name !== 'AbortError' && !controller.signal.aborted) setRemote({ key: requestKey, result: { ...createMessagingState('error'), error: error.message } })
    })
    return () => controller.abort()
  }, [live, controls, requestKey])
  useEffect(() => {
    if (!live || !usageAttempt) return
    const controller = new AbortController()
    getSuperAdminMessagingUsage(controller.signal).then(result => {
      if (!controller.signal.aborted) setUsageRemote({ attempt: usageAttempt, result })
    }).catch(error => {
      if (error.name !== 'AbortError' && !controller.signal.aborted) setUsageRemote({ attempt: usageAttempt, result: { status: 'error', records: [], error: error.message } })
    })
    return () => controller.abort()
  }, [live, usageAttempt])
  const source = live ? remote?.key === requestKey ? remote.result : createMessagingState('loading')
    : data === undefined ? createMessagingState(state.status, state.data) : createMessagingState('ready', data)
  const usageState = !live ? null : usageAttempt ? usageRemote?.attempt === usageAttempt ? usageRemote.result : { status: 'loading', records: [] }
    : { status: ['ready', 'empty'].includes(source.status) ? 'unavailable' : source.status, records: [], error: source.error }
  function changeControls(update) { setControls(current => ({ ...current, ...update })) }
  function retry() { setAttempt(value => value + 1) }
  function viewUsage() { setUsageAttempt(value => value + 1) }
  const summary = messagingSummary(source.data.months, referenceDate ?? initialDate)
  return <SuperAdminLayout profile={profile} onLogout={onLogout} preview={preview} page="messaging">
    <div data-messaging-heading className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1"><h1 className="text-2xl font-semibold tracking-normal xl:text-xl">Messaging</h1><p className="mt-2 text-sm leading-6 text-[#7A8190]">SMS and WhatsApp messages sent to patients and staff through Termii.</p></div>
      <span className="inline-flex shrink-0 self-start items-center gap-2 rounded-xl border border-[#E2E5ED] bg-white px-3 py-2 text-xs font-medium text-[#52556C]"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-[#475AA2]"><path d="M3 4h18v13H9l-6 4z M7 8h10 M7 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>Termii</span>
    </div>
    <MessagingSummaryCards summary={summary} credit={source.data.credit} failureExplanation={source.data.failureExplanation} />
    <MessagingPanels categories={source.data.categories} usage={source.data.usage} status={source.status} usageState={usageState} onViewAll={live ? viewUsage : undefined} onUsageRetry={live ? usageAttempt ? viewUsage : retry : undefined} />
    <MessageLogTable records={source.data.messageLog} status={source.status} controls={live ? controls : undefined} onControlsChange={changeControls} pagination={source.pagination} error={source.error} onRetry={live ? retry : undefined} />
  </SuperAdminLayout>
}

export default function SuperAdminMessaging() {
  const context = useOutletContext()
  return <SuperAdminMessagingPage live profile={context?.profile} onLogout={context?.onLogout} />
}
