import './subscribers.css'
import { useId, useState } from 'react'
import { auditLogPage, nextAuditSort } from './auditLogModel.js'
import { formatActivityTimestamp } from './activityData.js'
import SuperAdminPagination from './SuperAdminPagination.jsx'
import { createAuditLogState } from './auditLogState.js'

const columns = [['when', 'When'], ['who', 'Who'], ['action', 'Action'], ['facility', 'Facility']]

export default function AuditLogTable({ records, state, controls, onControlsChange, serverPagination, onRetry }) {
  const id = useId()
  const [localSort, setSort] = useState({ column: 'when', direction: 'desc' })
  const [localPage, setLocalPage] = useState(1)
  const sort = controls?.sort ?? localSort, page = controls?.page ?? localPage
  function setPage(value) { if (controls) onControlsChange({ page: value }); else setLocalPage(value) }
  const source = state ? { ...state, ...createAuditLogState(state.status, state.records) } : createAuditLogState(records === undefined ? 'unavailable' : 'ready', records)
  const ready = ['ready', 'empty'].includes(source.status)
  const result = controls && ready && serverPagination ? { records: source.records, ...serverPagination } : auditLogPage(source.records, sort, page)
  function changeSort(column) { if (controls) onControlsChange({ sort: nextAuditSort(sort, column), page: 1 }); else { setSort(current => nextAuditSort(current, column)); setPage(1) } }
  return <section data-super-admin-audit-log aria-label="Audit events" className="mt-4 min-w-0 rounded-2xl border border-[#E2E5ED] bg-white">
    <div role="region" aria-label="Audit log table" tabIndex={0} className="overflow-x-auto rounded-t-2xl focus-visible:outline-2 focus-visible:outline-[#475AA2]">
      <table className="w-full min-w-[780px] border-collapse text-left text-xs leading-4">
        <caption id={`${id}-caption`} className="sr-only">Platform audit log. Times are shown in UTC.</caption>
        <thead className="bg-[#F7F8FB] text-[#52556C]"><tr>{columns.map(([column, label]) => {
          const active = sort.column === column
          return <th key={column} scope="col" aria-sort={active ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'} className="px-3 py-2 font-medium">
            <button type="button" aria-label={`Sort by ${label}`} title={`Sort ${label}: ${nextAuditSort(sort, column).direction === 'asc' ? 'ascending' : 'descending'}`} onClick={() => changeSort(column)} className="inline-flex w-full items-center gap-2 rounded text-left focus-visible:outline-2 focus-visible:outline-[#475AA2]">
              {label}<svg aria-hidden="true" data-sort-direction={active ? sort.direction : 'none'} viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0 text-[#7A8190]"><path d={active ? sort.direction === 'asc' ? 'M12 20V4 M7 9l5-5 5 5' : 'M12 4v16 M7 15l5 5 5-5' : 'M8 20V4 M4 8l4-4 4 4 M16 4v16 M12 16l4 4 4-4'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </th>
        })}</tr></thead>
        <tbody className="text-[#52556C]">{result.records.length ? result.records.map(record => <tr key={record.id} className="border-t border-[#E2E5ED]">
          <td className="whitespace-nowrap px-3 py-2"><time dateTime={record.timestamp}>{formatActivityTimestamp(record.timestamp)}</time></td>
          <td className="px-3 py-2"><p className="whitespace-nowrap font-medium text-[#111827]">{record.actorName || 'Unavailable'}</p><p className="mt-0.5 whitespace-nowrap text-[11px] leading-4 text-[#7A8190]">{record.actorRole || 'Unavailable'}</p></td>
          <td className="whitespace-nowrap px-3 py-2">{record.action || 'Unavailable'}</td>
          <td className="whitespace-nowrap px-3 py-2">{record.facilityName || '—'}</td>
        </tr>) : <tr className="border-t border-[#E2E5ED]"><td colSpan={4} className="px-3 py-5 text-center text-sm text-[#7A8190]">{source.status === 'loading' ? <span role="status">Loading audit log records...</span> : source.status === 'error' ? <span role="alert">{source.error || 'Unable to load audit log records.'}{onRetry && <button type="button" onClick={onRetry} className="ml-2 text-[#475AA2] underline">Try again</button>}</span> : 'No audit log records available yet.'}</td></tr>}</tbody>
      </table>
    </div>
    <SuperAdminPagination page={result.page} totalPages={result.totalPages} empty={result.total === 0} onChange={setPage} label="Audit log pagination" disabled={!ready} simple />
  </section>
}
