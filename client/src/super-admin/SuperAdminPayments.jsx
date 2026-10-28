import './payments.css'
import { useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import SuperAdminLayout from './SuperAdminLayout.jsx'
import PaymentSummaryCards from './PaymentSummaryCards.jsx'
import TransactionsTable from './TransactionsTable.jsx'
import { createPaymentsState } from './paymentsState.js'
import { getSuperAdminPayments, exportSuperAdminPayments } from './paymentsApi.js'

export function SuperAdminPaymentsPage({ profile, onLogout, preview = false, summary, transactions, state = createPaymentsState(), live = false }) {
  const [page, setPage] = useState(1), [attempt, setAttempt] = useState(0)
  const [remote, setRemote] = useState(null), [exportState, setExportState] = useState(null)
  const exportController = useRef(null)
  const requestKey = JSON.stringify([page, attempt])
  useEffect(() => {
    if (!live) return
    const controller = new AbortController()
    getSuperAdminPayments({ page }, controller.signal).then(result => {
      if (!controller.signal.aborted) setRemote({ key: requestKey, result })
    }).catch(error => {
      if (error.name !== 'AbortError' && !controller.signal.aborted) setRemote({ key: requestKey, result: { ...createPaymentsState('error'), error: error.message } })
    })
    return () => controller.abort()
  }, [live, page, requestKey])
  useEffect(() => () => exportController.current?.abort(), [requestKey])
  async function exportList() {
    exportController.current?.abort()
    const controller = new AbortController()
    exportController.current = controller
    setExportState({ key: requestKey, busy: true })
    try {
      const csv = await exportSuperAdminPayments({}, controller.signal)
      if (controller.signal.aborted) return
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const anchor = document.createElement('a')
      anchor.href = url; anchor.download = 'medtrail-payments.csv'
      document.body.append(anchor); anchor.click(); anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setExportState({ key: requestKey, busy: false })
    } catch (error) {
      if (error.name !== 'AbortError' && !controller.signal.aborted) setExportState({ key: requestKey, busy: false, error: error.message })
    }
  }
  const source = live ? remote?.key === requestKey ? remote.result : createPaymentsState('loading') : summary !== undefined || transactions !== undefined
    ? createPaymentsState('ready', transactions ?? [], summary)
    : createPaymentsState(state.status, state.records, state.summary)
  return <SuperAdminLayout profile={profile} onLogout={onLogout} preview={preview} page="payments">
    <div data-payments-heading className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1"><h1 className="text-2xl font-semibold tracking-normal xl:text-xl">Payments</h1><p className="mt-2 text-sm leading-6 text-[#7A8190]">Gateways that collect naira subscription payments, and every transaction they process.</p></div>
      <span aria-label="Gateway shown in design: Paystack" className="inline-flex shrink-0 self-start items-center gap-2 rounded-xl border border-[#E2E5ED] bg-white px-3 py-2 text-xs font-medium text-[#52556C]"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-[#475AA2]"><path d="M3 6h18v13H3z M3 10h18 M7 15h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>Paystack</span>
    </div>
    <PaymentSummaryCards summary={source.summary} settlement={live} />
    <TransactionsTable state={source} onPageChange={live ? setPage : undefined} onRetry={live ? () => setAttempt(value => value + 1) : undefined} onExport={live ? exportList : undefined} exportState={exportState?.key === requestKey ? exportState : null} />
  </SuperAdminLayout>
}

export default function SuperAdminPayments() {
  const context = useOutletContext()
  return <SuperAdminPaymentsPage live profile={context?.profile} onLogout={context?.onLogout} />
}
