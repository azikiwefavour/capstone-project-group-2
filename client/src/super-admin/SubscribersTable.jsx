import './subscribers.css'
import { useId, useState } from 'react'
import { facilityStatusStyles } from './facilityPresentation.js'
import { formatNaira } from './revenue'
import { formatSubscriberDate, subscriberPage, subscriberSortOptions } from './subscriberTableModel.js'
import SubscriberPopover from './SubscriberPopover.jsx'
import SuperAdminPagination from './SuperAdminPagination.jsx'

export default function SubscribersTable({ records, state, controls, onControlsChange, onRetry }) {
  const [localSearch, setLocalSearch] = useState(''), [localStatus, setLocalStatus] = useState(''), [localPlan, setLocalPlan] = useState('')
  const [localSort, setLocalSort] = useState('charge_asc'), [localPage, setLocalPage] = useState(1), [popover, setPopover] = useState(null)
  const search = controls?.search ?? localSearch, status = controls?.status ?? localStatus, plan = controls?.plan ?? localPlan
  const sort = controls?.sort ?? localSort, page = controls?.page ?? localPage
  function setSearch(value) { if (controls) onControlsChange({ search: value, page: 1 }); else setLocalSearch(value) }
  function setStatus(value) { if (controls) onControlsChange({ status: value, page: 1 }); else setLocalStatus(value) }
  function setPlan(value) { if (controls) onControlsChange({ plan: value, page: 1 }); else setLocalPlan(value) }
  function setSort(value) { if (controls) onControlsChange({ sort: value, page: 1 }); else setLocalSort(value) }
  function setPage(value) { if (controls) onControlsChange({ page: value }); else setLocalPage(value) }
  const id = useId()
  const source = state ?? { status: Array.isArray(records) ? 'ready' : 'unavailable', records: records ?? [] }
  const viewStatus = source.status === 'ready' && !Array.isArray(source.records) ? 'error' : source.status
  const available = viewStatus === 'ready' ? source.records : []
  const ready = ['ready', 'empty'].includes(viewStatus)
  const result = controls ? { records: available, page: ready ? source.pagination?.page ?? 1 : 1, totalPages: ready ? source.pagination?.totalPages ?? 1 : 1, total: ready ? source.pagination?.total ?? 0 : 0 } : subscriberPage(available, { search, status, plan, sort }, page)
  const filtered = Boolean(search.trim() || status || plan)
  const selectClass = 'mt-1 h-9 w-full rounded-lg border border-[#E2E5ED] bg-white px-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#475AA2]'
  return <section data-super-admin-subscribers aria-labelledby={`${id}-title`} className="mt-2 h-fit min-h-0 min-w-0 flex-none self-start">
    <h2 id={`${id}-title`} className="text-base font-semibold">Subscribers</h2>
    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-[340px]">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#7A8190]"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" /><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        <input type="search" aria-label={controls ? "Search subscribers" : "Search subscribers by facility name"} placeholder="Search hospitals" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} className="h-9 w-full rounded-xl border border-[#E2E5ED] bg-white pl-9 pr-3 text-xs text-[#52556C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#475AA2]" />
      </div>
      <div className="flex justify-end gap-2">
        <SubscriberPopover label="Filter" open={popover === 'filter'} active={Boolean(status || plan)} onToggle={() => setPopover(popover === 'filter' ? null : 'filter')} onClose={() => setPopover(null)}>
          <label className="block">Subscription status<select aria-label="Subscription status" value={status} onChange={event => { setStatus(event.target.value); setPage(1) }} className={selectClass}><option value="">All statuses</option><option value="paid">Paid</option><option value="past_due">Past due</option><option value="trial">In trial</option></select></label>
          <label className="block">Subscription plan<select aria-label="Subscription plan" value={plan} onChange={event => { setPlan(event.target.value); setPage(1) }} className={selectClass}><option value="">All plans</option><option value="Starter">Starter</option><option value="Growth">Growth</option></select></label>
          <button type="button" onClick={() => { setStatus(''); setPlan(''); setPage(1) }} className="rounded-lg px-2 py-1 font-semibold text-[#475AA2] underline focus-visible:outline-2 focus-visible:outline-[#475AA2]">Clear filters</button>
        </SubscriberPopover>
        <SubscriberPopover label="Sort" open={popover === 'sort'} active={sort !== 'charge_asc'} onToggle={() => setPopover(popover === 'sort' ? null : 'sort')} onClose={() => setPopover(null)}>
          <label className="block">Sort subscribers<select aria-label="Sort subscribers" value={sort} onChange={event => setSort(event.target.value)} className={selectClass}>{subscriberSortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </SubscriberPopover>
      </div>
    </div>
    <div data-subscribers-card className="mt-2 min-w-0 rounded-2xl border border-[#E2E5ED] bg-white">
      <div role="region" aria-label="Subscribers table" tabIndex={0} className="relative overflow-x-auto rounded-t-2xl focus-visible:outline-2 focus-visible:outline-[#475AA2]">
        <table className="w-full min-w-[850px] border-collapse text-left text-xs leading-4">
          <caption className="sr-only">Subscribers. Each hospital retains its own billing cycle independently of the plan-card switch.</caption>
          <thead className="bg-[#F7F8FB] text-[#52556C]"><tr>{['Facility', 'Plan', 'Cycle', 'Amount', 'Next charge', 'Method', 'Status'].map(label => <th key={label} scope="col" className="whitespace-nowrap px-3 py-2 font-medium">{label}</th>)}</tr></thead>
          <tbody className="text-[#52556C]">{result.records.length ? result.records.map(record => {
            const badge = facilityStatusStyles[record.status === 'paid' ? 'active' : record.status] ?? { label: 'Not available', color: 'bg-[#F6F7FB] text-[#7A8190]' }
            return <tr key={record.id} className="border-t border-[#E2E5ED]">
              <td className="whitespace-nowrap px-3 py-1 font-medium text-[#111827]">{record.facilityName}</td><td className="px-3 py-1">{record.plan || 'Not available'}</td><td className="px-3 py-1">{record.cycle || 'Not available'}</td><td className="whitespace-nowrap px-3 py-1 tabular-nums">{Number.isFinite(record.amount) && record.amount >= 0 ? formatNaira(record.amount) : 'Not available'}</td><td className="whitespace-nowrap px-3 py-1"><time dateTime={record.chargeDate}>{formatSubscriberDate(record.chargeDate)}</time></td><td className="whitespace-nowrap px-3 py-1">{record.paymentMethod || 'Not available'}</td><td className="px-3 py-1"><span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] leading-4 ${badge.color}`}>{record.status === 'paid' ? 'Paid' : badge.label}</span></td>
            </tr>
          }) : <tr className="border-t border-[#E2E5ED]"><td colSpan={7} className="px-4 py-3 text-center text-sm text-[#7A8190]">{viewStatus === 'loading' ? <span role="status">Loading subscriptions...</span> : viewStatus === 'error' ? <span role="alert">{source.error || 'Unable to load subscriptions.'}{onRetry && <button type="button" onClick={onRetry} className="ml-2 text-[#475AA2] underline">Try again</button>}</span> : filtered ? 'No matching subscriptions found.' : 'No subscriptions available yet.'}</td></tr>}</tbody>
        </table>
      </div>
      <SuperAdminPagination page={result.page} totalPages={result.totalPages} empty={result.total === 0} onChange={setPage} disabled={!ready} simple />
    </div>
  </section>
}
