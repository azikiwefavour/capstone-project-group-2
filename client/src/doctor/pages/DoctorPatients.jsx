import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import DoctorLayout from '../components/DoctorLayout'
import DoctorIcon from '../components/DoctorIcon'
import AdminPagination from '../../admin/components/AdminPagination'
import { filterAndSortPatients, getMedicationCount } from '../patients'
import { getDoctorPatients } from '../api'
import useDoctorRecords from '../useDoctorRecords'

const controlClassName = 'relative inline-flex h-10 max-w-full items-center gap-2 rounded-xl border border-[#D8DCE5] bg-white px-3 text-sm font-medium text-[#52556C] focus-within:ring-4 focus-within:ring-[#475AA2]/15'

function PatientsContent({ doctor = null, patients: suppliedPatients = [], isLoading: suppliedLoading = false, error: suppliedError = '', onRetry: suppliedRetry, live, controls, basePath = '/doctor' }) {
  const loaded = useDoctorRecords(getDoctorPatients, live)
  const patients = live ? loaded.records : suppliedPatients
  const isLoading = live ? loaded.isLoading : suppliedLoading
  const error = live ? loaded.error : suppliedError
  const onRetry = live ? loaded.onRetry : suppliedRetry
  const patientContext = useOutletContext()
  const { query, setQuery, filter, setFilter, sort, setSort, page, setPage, rowsPerPage, setRowsPerPage, selectedIds, setSelectedIds } = controls
  const visiblePatients = useMemo(() => filterAndSortPatients(patients, query, filter, sort), [patients, query, filter, sort])
  const unavailable = isLoading || Boolean(error)
  const currentPage = Math.min(page, Math.max(1, Math.ceil(visiblePatients.length / rowsPerPage)))
  const pagePatients = unavailable ? [] : visiblePatients.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
  const allSelected = pagePatients.length > 0 && pagePatients.every((patient) => selectedIds.has(patient.id))

  function toggleSelection(id) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function changeSort(field) {
    const [currentField, direction] = sort.split('-')
    setSort(`${field}-${currentField === field && direction === 'asc' ? 'desc' : 'asc'}`)
    setPage(1)
  }

  return (
    <>
      <section className="mt-4">
        <h1 className="text-2xl font-semibold tracking-normal text-[#111827]">Patients</h1>
        <p className="mt-2 text-base leading-relaxed text-[#7A8190]">Search by name</p>
      </section>
      <div className="mt-[22px] flex flex-col gap-3 rounded-2xl border border-[#E2E5ED] bg-white p-3 shadow-sm shadow-[#111827]/[0.03] lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block min-w-0 w-full lg:max-w-[320px]">
          <span className="sr-only">Search patients by name</span>
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A8190]"><DoctorIcon type="search" className="h-4 w-4" /></span>
          <input type="search" placeholder="Search..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} className="h-10 w-full rounded-xl border border-[#D8DCE5] bg-white pl-10 pr-4 text-sm text-[#111827] outline-none transition placeholder:text-[#A6ADBA] focus:border-[#475AA2] focus:ring-4 focus:ring-[#475AA2]/15" />
        </label>
        <div className="flex flex-wrap gap-3">
          <label className={controlClassName}>
            <DoctorIcon type="filter" className="h-4 w-4" /><span>Filter</span>
            <select aria-label="Filter patients" value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1) }} className="min-w-0 max-w-[160px] appearance-none bg-transparent pr-5 text-sm outline-none">
              <option value="all">All patients</option><option value="with">With medications</option><option value="without">Without medications</option>
            </select>
            <span className="pointer-events-none absolute right-2"><DoctorIcon type="chevron" className="h-4 w-4" /></span>
          </label>
          <label className={controlClassName}>
            <DoctorIcon type="sort" className="h-4 w-4" /><span>Sort by</span>
            <select aria-label="Sort patients" value={sort} onChange={(event) => { setSort(event.target.value); setPage(1) }} className="min-w-0 max-w-[160px] appearance-none bg-transparent pr-5 text-sm outline-none">
              <option value="name-asc">Name A-Z</option><option value="name-desc">Name Z-A</option>
              <option value="email-asc">Email A-Z</option><option value="email-desc">Email Z-A</option>
              <option value="phone-asc">Phone ascending</option><option value="phone-desc">Phone descending</option>
              <option value="medications-desc">Most medications</option><option value="medications-asc">Fewest medications</option>
            </select>
            <span className="pointer-events-none absolute right-2"><DoctorIcon type="chevron" className="h-4 w-4" /></span>
          </label>
        </div>
      </div>
      <div aria-busy={isLoading} className="mt-5 overflow-hidden rounded-2xl border border-[#E2E5ED] bg-white shadow-sm shadow-[#111827]/[0.03] lg:flex lg:h-[clamp(360px,calc(100vh-286px),520px)] lg:flex-col">
        <div className="overflow-x-auto lg:flex-1 lg:overflow-y-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead><tr className="border-b border-[#E2E5ED] bg-[#F7F8FB] text-left text-xs font-medium text-[#52556C]">
              <th scope="col" className="w-12 px-4 py-3"><input type="checkbox" aria-label="Select all patients on this page" checked={allSelected} ref={(node) => { if (node) node.indeterminate = !allSelected && pagePatients.some((patient) => selectedIds.has(patient.id)) }} disabled={!pagePatients.length} onChange={() => setSelectedIds((current) => {
                const next = new Set(current)
                pagePatients.forEach((patient) => { if (allSelected) next.delete(patient.id); else next.add(patient.id) })
                return next
              })} className="h-4 w-4 rounded border-[#D8DCE5] accent-[#475AA2]" /></th>
              {[['name', 'Name'], ['email', 'Email'], ['phone', 'Phone'], ['medications', 'Current medications']].map(([field, label]) => (
                <th key={field} scope="col" aria-sort={sort.startsWith(`${field}-`) ? sort.endsWith('asc') ? 'ascending' : 'descending' : 'none'} className="px-4 py-3">
                  <button type="button" onClick={() => changeSort(field)} className="inline-flex items-center gap-2 text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/15">{label}<DoctorIcon type="sort" className="h-3.5 w-3.5" /></button>
                </th>
              ))}
            </tr></thead>
            <tbody>
              {pagePatients.map((patient) => (
                <tr key={patient.id} className="border-b border-[#E2E5ED] text-sm font-medium text-[#111827] last:border-b-0">
                  <td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${patient.name || 'patient'}`} checked={selectedIds.has(patient.id)} onChange={() => toggleSelection(patient.id)} className="h-4 w-4 rounded border-[#D8DCE5] accent-[#475AA2]" /></td>
                  <td className="px-4 py-3">{patient.id != null && String(patient.id).trim() ? <Link to={`${basePath}/patients/${encodeURIComponent(patient.id)}`} onClick={() => patientContext?.setSelectedPatient({ patient, doctor })} className="hover:text-[#475AA2] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/15">{patient.name || '-'}</Link> : patient.name || '-'}</td><td className="px-4 py-3 text-[#7A8190]">{patient.email || '-'}</td><td className="px-4 py-3 text-[#7A8190]">{patient.phone || '-'}</td><td className="px-4 py-3">{getMedicationCount(patient) ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pagePatients.length === 0 && (
                <div className="sticky left-0 flex min-h-[220px] flex-col items-center justify-center px-5 text-center lg:min-h-[calc(100vh-430px)]">
                  {isLoading ? <p role="status" className="text-sm text-[#7A8190]">Loading patients...</p> : error ? <div role="alert" className="text-sm text-[#E5484D]"><p>{error}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-3 font-semibold text-[#475AA2]">Try again</button>}</div> : <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#D0E7DC] text-[#2F7D59]"><DoctorIcon type="user" className="h-5 w-5" /></div>
                    <p className="mt-4 text-sm font-medium text-[#7A8190]">{patients.length ? 'No patients match your search or filters.' : 'No patients available yet.'}</p>
                  </>}
                </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col border-t border-[#E2E5ED] sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 [&>div]:border-t-0"><AdminPagination totalItems={unavailable ? 0 : visiblePatients.length} currentPage={currentPage} rowsPerPage={rowsPerPage} onPageChange={setPage} /></div>
          <select aria-label="Rows per page" value={rowsPerPage} onChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(1) }} className="mx-4 mb-3 h-9 self-end rounded-lg border border-[#D8DCE5] bg-white px-2 text-sm text-[#52556C] outline-none focus:ring-4 focus:ring-[#475AA2]/15 sm:mb-0 sm:ml-0 sm:self-auto">
            {[7, 14, 28].map((count) => <option key={count} value={count}>{count} / page</option>)}
          </select>
        </div>
      </div>
    </>
  )
}

export default function DoctorPatients({ doctor = null, Layout = DoctorLayout, ...props }) {
  // Keep controls stable while DoctorLayout rechecks the session on window focus.
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('name-asc')
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(7)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const controls = { query, setQuery, filter, setFilter, sort, setSort, page, setPage, rowsPerPage, setRowsPerPage, selectedIds, setSelectedIds }
  return <Layout doctor={doctor} view="patients">
    <PatientsContent {...props} doctor={doctor} live={Layout === DoctorLayout} controls={controls} />
  </Layout>
}
