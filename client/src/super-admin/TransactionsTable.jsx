import './subscribers.css'
import { useId, useState } from 'react'
import { facilityStatusStyles } from './facilityPresentation.js'
import { formatPaymentAmount } from './paymentsResponse.js'
import { formatSubscriberDate } from './subscriberTableModel.js'
import { transactionPage } from './transactionTableModel.js'
import SuperAdminPagination from './SuperAdminPagination.jsx'
import { createPaymentsState } from './paymentsState.js'

const statuses = {
  successful: { label: 'Successful', color: facilityStatusStyles.active.color },
  pending: { label: 'Pending', color: 'bg-[#FFF4CE] text-[#946200]' },
  failed: { label: 'Failed', color: facilityStatusStyles.past_due.color },
}

export default function TransactionsTable({ records, state, onPageChange, onRetry, onExport, exportState }) {
  const [page, setPage] = useState(1)
  const id = useId()
  const source = state ? { ...state, ...createPaymentsState(state.status, state.records, state.summary) } : createPaymentsState(records === undefined ? 'unavailable' : 'ready', records)
  const ready = ['ready', 'empty'].includes(source.status)
  const result = onPageChange && ready && source.pagination ? { records: source.records, ...source.pagination } : transactionPage(source.records, page)
  const exporting = Boolean(exportState?.busy)
  return <section data-super-admin-transactions aria-labelledby={`${id}-title`} className="mt-4 min-w-0">
    <div className="flex shrink-0 items-center justify-between gap-3">
      <h2 id={`${id}-title`} className="text-base font-semibold">Transactions</h2>
      <button type="button" disabled={!onExport || !ready || exporting} aria-disabled={!onExport || !ready || exporting} aria-busy={exporting} onClick={onExport} title={onExport ? 'Export list' : 'Export list — functionality pending'} className={`flex h-8 shrink-0 items-center gap-2 rounded-xl border border-[#E2E5ED] bg-[#F7F8FB] px-3 text-xs font-medium text-[#7A8190] ${!onExport || !ready || exporting ? 'cursor-not-allowed' : 'cursor-pointer'}`}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>Export list</button>
    </div>
    {exporting && <p role="status" className="mt-2 text-xs text-[#7A8190]">Preparing payment export...</p>}
    {exportState?.error && <p role="alert" className="mt-2 text-xs text-[#7A8190]">{exportState.error}</p>}
    <div data-transactions-card className="mt-2 min-w-0 rounded-2xl border border-[#E2E5ED] bg-white">
      <div role="region" aria-label="Transactions table" tabIndex={0} className="relative overflow-x-auto rounded-t-2xl focus-visible:outline-2 focus-visible:outline-[#475AA2]">
        <table className="w-full min-w-[850px] border-collapse text-left text-xs leading-4">
          <caption className="sr-only">Payment transactions</caption>
          <thead className="bg-[#F7F8FB] text-[#52556C]"><tr>{['Reference', 'Facility', 'Amount', 'Channel', 'Gateway', 'Date', 'Status'].map(label => <th key={label} scope="col" className="whitespace-nowrap px-3 py-2 font-medium">{label}</th>)}</tr></thead>
          <tbody className="text-[#52556C]">{result.records.length ? result.records.map(record => {
            const badge = statuses[record.status] || { label: 'Unavailable', color: 'bg-[#F6F7FB] text-[#7A8190]' }
            return <tr key={record.id || record.reference} className="border-t border-[#E2E5ED]">
              <td className="whitespace-nowrap px-3 py-1 font-medium text-[#111827]">{record.reference}</td><td className="whitespace-nowrap px-3 py-1">{record.facilityName || 'Not available'}</td><td className="whitespace-nowrap px-3 py-1 tabular-nums">{Number.isFinite(record.amount) && record.amount >= 0 ? formatPaymentAmount(record.amount) : 'Not available'}</td><td className="whitespace-nowrap px-3 py-1">{record.channel || 'Not available'}</td><td className="px-3 py-1">{record.gateway || 'Not available'}</td><td className="whitespace-nowrap px-3 py-1"><time dateTime={record.date}>{formatSubscriberDate(record.date)}</time></td><td className="px-3 py-1"><span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] leading-4 ${badge.color}`}>{badge.label}</span></td>
            </tr>
          }) : <tr className="border-t border-[#E2E5ED]"><td colSpan={7} className="px-4 py-6 text-center text-sm text-[#7A8190]">{source.status === 'loading' ? <span role="status">Loading payment transactions...</span> : source.status === 'error' ? <span role="alert">{source.error || 'Unable to load payment transactions.'}{onRetry && <button type="button" onClick={onRetry} className="ml-2 text-[#475AA2] underline">Try again</button>}</span> : 'No payment transactions available yet.'}</td></tr>}</tbody>
        </table>
      </div>
      <SuperAdminPagination page={result.page} totalPages={result.totalPages} empty={result.total === 0} onChange={onPageChange || setPage} label="Transactions pagination" disabled={!ready || result.totalPages === 1} simple />
    </div>
  </section>
}
