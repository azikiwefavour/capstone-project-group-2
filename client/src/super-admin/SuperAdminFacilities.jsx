import './facilities.css'
import { createFacilitiesState, facilitiesView, nextFacilitySort } from './facilitiesModel.js'
import { useEffect, useState } from 'react'
import { getSuperAdminFacilities, getFacilitiesForSorting, getSuperAdminFacility } from './facilitiesApi.js'
import FacilityDetailsModal from './FacilityDetailsModal.jsx'
import { useOutletContext } from 'react-router-dom'
import SuperAdminLayout from './SuperAdminLayout.jsx'
import { formatStatistic } from './statisticsMetrics'
import { facilityStatusStyles, facilityTotals } from './facilityPresentation'

export function SuperAdminFacilitiesPage({ profile, onLogout, preview = false, state = createFacilitiesState(), data, live = false }) {
  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState({ column: null, direction: 'asc' })
  const [page, setPage] = useState(1)
  const [remote, setRemote] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const sorted = Boolean(sort.column)
  const requestPage = sorted ? 1 : page
  const requestKey = JSON.stringify([query, status, sorted, requestPage, attempt])
  useEffect(() => {
    if (!live) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      const request = sorted ? getFacilitiesForSorting : getSuperAdminFacilities
      request({ query, status, page: requestPage }, controller.signal).then(result => {
        if (!controller.signal.aborted) setRemote({ key: requestKey, result })
      }).catch(error => {
        if (error.name !== 'AbortError' && !controller.signal.aborted) setRemote({ key: requestKey, result: { status: 'error', records: [], error: error.message } })
      })
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [live, query, status, sorted, requestPage, requestKey])
  const source = live ? remote?.key === requestKey ? remote.result : createFacilitiesState('loading')
    : data === undefined ? state : createFacilitiesState('ready', data?.rows)
  const valid = source.status !== 'ready' || Array.isArray(source.records)
  const viewStatus = valid ? source.status : 'error'
  const ready = ['ready', 'empty'].includes(viewStatus)
  const local = facilitiesView(viewStatus === 'ready' ? source.records : [], { query: live ? '' : query, status: live ? 'all' : status, sort, page })
  const result = live ? { ...local, counts: source.counts || [], ...(ready && !sorted ? { records: source.records, page: source.page, total: source.total, totalPages: source.totalPages } : {}) } : local
  const rows = result.records
  const selectedFacility = result.available.find(row => row.id === selectedId)
  function setSelectedFacility(row) { setSelectedId(row?.id ?? null) }
  function changeSort(column) { setSort(current => nextFacilitySort(current, column)); setPage(1) }
  const filtered = query.trim() || status !== 'all'
  return (
    <SuperAdminLayout profile={profile} onLogout={onLogout} preview={preview} page="facilities">
      <div className="mt-4"><h1 className="text-2xl font-semibold tracking-normal xl:text-xl">Facilities</h1><p className="mt-2 text-sm leading-6 text-[#7A8190]">Every hospital and clinic on MedTrail. You see accounts, usage and billing, never patient records.</p></div>
      <div role="group" aria-label="Facility status filters" className="mt-5 flex flex-wrap gap-2">
        {['All', 'Active', 'Trial', 'Past due'].map((label, index) => <button key={label} type="button" aria-pressed={status === ['all', 'active', 'trial', 'past_due'][index]} onClick={() => { setStatus(['all', 'active', 'trial', 'past_due'][index]); setPage(1) }} className={`flex min-h-9 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${status === ['all', 'active', 'trial', 'past_due'][index] ? 'border-[#475AA2] bg-[#EEF0FF] text-[#475AA2]' : 'border-[#E2E5ED] bg-white text-[#52556C]'}`}>{label}<span className="rounded-md bg-[#F6F7FB] px-1.5 py-0.5 text-[11px]">{ready ? formatStatistic(result.counts[index]) : '—'}</span></button>)}
      </div>
      <div className="relative mt-4 w-full sm:max-w-[340px]">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#7A8190]"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" /><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        <input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} aria-label="Search hospitals by name" placeholder="Search hospitals" className="h-10 w-full rounded-xl border border-[#E2E5ED] bg-white pl-9 pr-3 text-sm text-[#52556C] opacity-100 placeholder:text-[#7A8190]" />
      </div>
      <section aria-label="Facilities table and pagination" className="mt-4 min-w-0 rounded-2xl border border-[#E2E5ED] bg-white">
        <div role="region" aria-label="Facilities table" tabIndex={0} className="relative overflow-x-auto rounded-t-2xl focus-visible:outline-2 focus-visible:outline-[#475AA2]">
          <table className="w-full min-w-[850px] border-collapse text-left text-xs">
            <caption className="sr-only">Facilities. Seven rows per page. Sort using the column headings; rows and eye buttons open facility details.</caption>
            <thead className="bg-[#F7F8FB] text-[#52556C]"><tr>
              <th scope="col" className="w-10 px-3 py-2.5"><input type="checkbox" disabled aria-label="Select all facilities" className="h-4 w-4 accent-[#475AA2]" /></th>
              {[['name', 'Facility'], ['plan', 'Plan'], ['clinicians', 'Clinicians'], ['patients', 'Patients'], ['messages', 'Messages'], ['status', 'Status']].map(([column, label]) => <th key={column} scope="col" aria-sort={sort.column === column ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'} className="px-3 py-2.5 font-medium"><button type="button" aria-label={`Sort by ${label}`} title={`Sort ${label}`} onClick={() => changeSort(column)} className="w-full rounded text-left font-medium focus-visible:outline-2 focus-visible:outline-[#475AA2]">{label}</button></th>)}
              <th scope="col" className="w-12 px-3 py-2.5"><span className="sr-only">Details</span></th>
            </tr></thead>
            <tbody className="text-[#52556C]">{rows.length ? rows.map(row => {
              const totals = facilityTotals(row), badge = facilityStatusStyles[row.status]
              return <tr key={row.id} tabIndex={0} aria-label={`Details for ${row.name}`} aria-haspopup="dialog" onClick={event => { if (event.target.closest('input, button, [data-facility-checkbox]')) return; event.currentTarget.focus({ preventScroll: true }); setSelectedFacility(row) }} onKeyDown={event => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); setSelectedFacility(row) } }} className="cursor-pointer border-t border-[#E2E5ED] hover:bg-[#F7F8FB] focus-visible:outline-2 focus-visible:outline-[#475AA2]">
                <td data-facility-checkbox onClick={event => event.stopPropagation()} className="px-3 py-2.5"><input type="checkbox" disabled aria-label={`Select ${row.name}`} className="h-4 w-4 accent-[#475AA2]" /></td>
                <td className="max-w-[240px] break-words px-3 py-2.5 font-medium text-[#111827]">{row.name}</td>
                <td className="px-3 py-2.5"><p className="font-medium">{row.plan || 'Not available'}</p><p className="mt-1 text-[11px] text-[#7A8190]">{row.billingCycle || 'Not available'}</p></td>
                <td className="px-3 py-2.5 tabular-nums">{formatStatistic(totals.clinicians)}</td><td className="px-3 py-2.5 tabular-nums">{formatStatistic(totals.patients)}</td><td className="px-3 py-2.5 tabular-nums">{formatStatistic(totals.messages)}</td>
                <td className="px-3 py-2.5"><span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-medium ${badge?.color || 'bg-[#F6F7FB] text-[#7A8190]'}`}>{badge?.label || row.statusLabel || 'Unavailable'}</span></td>
                <td className="px-3 py-2.5"><button type="button" onClick={event => { event.stopPropagation(); event.currentTarget.focus({ preventScroll: true }); setSelectedFacility(row) }} aria-label={`View ${row.name}`} title="View facility details" className="flex h-7 w-7 items-center justify-center rounded-lg text-[#7A8190]"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" /></svg></button></td>
              </tr>
            }) : <tr><td colSpan={8} className="px-4 py-8 text-sm text-[#7A8190]">{viewStatus === 'loading' ? <span role="status">Loading facilities...</span> : viewStatus === 'error' ? <span role="alert">{source.error || 'Unable to load facilities.'}{live && <button type="button" onClick={() => setAttempt(value => value + 1)} className="ml-2 text-[#475AA2] underline">Try again</button>}</span> : filtered ? 'No matching facilities found.' : 'No facilities available yet.'}</td></tr>}</tbody>
          </table>
        </div>
        <div className="facilities-pagination border-t border-[#E2E5ED] text-xs text-[#7A8190]">
          <p className="facilities-pagination-summary" aria-live="polite">Page {result.page} of {result.totalPages}</p>
          <nav aria-label="Facilities pagination" className="facilities-pagination-controls">
            {[
              ['Previous page', 'M15 6l-6 6 6 6', result.page - 1, result.page === 1],
              ['Next page', 'M9 6l6 6-6 6', result.page + 1, result.page === result.totalPages],
            ].map(([label, path, target, unavailable]) => <button key={label} type="button" disabled={!ready || !result.total || unavailable} aria-label={label} onClick={() => setPage(target)} className="facilities-page-button"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button>)}
          </nav>
          <button type="button" disabled aria-label="Rows per page: 7, fixed" className="facilities-page-size flex h-7 items-center gap-2 rounded-lg border border-[#E2E5ED] px-2 text-[#52556C]">7 / page<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
        </div>
      </section>
      {selectedFacility && (live ? <ConnectedFacilityDetails key={selectedFacility.id} facility={selectedFacility} onClose={() => setSelectedFacility(null)} /> : <FacilityDetailsModal facility={selectedFacility} onClose={() => setSelectedFacility(null)} />)}
    </SuperAdminLayout>
  )
}

export default function SuperAdminFacilities() {
  const context = useOutletContext()
  return <SuperAdminFacilitiesPage live profile={context?.profile} onLogout={context?.onLogout} />
}

function ConnectedFacilityDetails({ facility, onClose }) {
  const [response, setResponse] = useState(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getSuperAdminFacility(facility.id, controller.signal).then(record => {
      if (!controller.signal.aborted) setResponse({ record, attempt })
    }).catch(error => {
      if (error.name !== 'AbortError' && !controller.signal.aborted) setResponse({ error: error.message, attempt })
    })
    return () => controller.abort()
  }, [facility.id, attempt])
  const current = response?.attempt === attempt ? response : null
  const record = current?.record ? { ...current.record, nextRenewalDate: facility.nextRenewalDate, trialEndDate: facility.trialEndDate, subscriptionExpiryDate: facility.subscriptionExpiryDate } : { id: facility.id, name: facility.name, messagesLabel: 'Messages', progress: {} }
  return <FacilityDetailsModal facility={record} onClose={onClose} loading={!current} error={current?.error} onRetry={() => setAttempt(value => value + 1)} />
}
