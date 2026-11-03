import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import AdminHeader from '../components/AdminHeader'
import AdminPagination from '../components/AdminPagination'
import { getAdminAuditLog } from '../api'

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M16 16L20 20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M5 7H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 12H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M10.5 17H13.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-8 w-8">
      <path d="M8 7H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 12H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 17H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 7H5.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M5 12H5.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M5 17H5.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

function SortArrowIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" className="h-3.5 w-3.5">
      <path
        d="M4 5L7 2L10 5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 9L7 12L4 9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function AdminAuditLog() {
  const { adminName } = useOutletContext()
  const [auditRecords, setAuditRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [searchQuery, setSearchQuery] = useState('')
  const [activityFilter, setActivityFilter] = useState('All')
  const [sortBy, setSortBy] = useState('Newest')
  const rowsPerPage = 7
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const controller = new AbortController()
    getAdminAuditLog(controller.signal)
      .then((records) => {
        setAuditRecords(Array.isArray(records) ? records : [])
        setLoading(false)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setError(err.message || 'Failed to load audit activities.')
        setLoading(false)
      })
    return () => controller.abort()
  }, [reloadKey])

  const visibleRecords = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return [...auditRecords]
      .filter((record) => {
        if (activityFilter === 'All') return true
        const act = (record.actionType || '').toLowerCase()
        const ev = (record.event || '').toLowerCase()
        const filt = activityFilter.toLowerCase()
        return act.includes(filt) || ev.includes(filt)
      })
      .filter((record) => {
        if (!normalizedQuery) {
          return true
        }

        return [
          record.when || '',
          record.who || '',
          record.event || '',
          record.patient || '',
        ].some((value) => value.toLowerCase().includes(normalizedQuery))
      })
      .sort((firstRecord, secondRecord) => {
        if (sortBy === 'Oldest') {
          return new Date(firstRecord.createdAt || 0) - new Date(secondRecord.createdAt || 0)
        }

        if (sortBy === 'Who') {
          return (firstRecord.who || '').localeCompare(secondRecord.who || '')
        }

        if (sortBy === 'Event') {
          return (firstRecord.event || '').localeCompare(secondRecord.event || '')
        }

        if (sortBy === 'Patient') {
          return (firstRecord.patient || '').localeCompare(secondRecord.patient || '')
        }

        // Default Newest
        return new Date(secondRecord.createdAt || 0) - new Date(firstRecord.createdAt || 0)
      })
  }, [activityFilter, auditRecords, searchQuery, sortBy])

  const totalPages = Math.max(1, Math.ceil(visibleRecords.length / rowsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStartIndex = (safeCurrentPage - 1) * rowsPerPage
  const paginatedRecords = visibleRecords.slice(
    pageStartIndex,
    pageStartIndex + rowsPerPage,
  )

  return (
    <section className="mx-auto max-w-7xl lg:flex lg:min-h-full lg:flex-col">
      <AdminHeader adminName={adminName} />

      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-normal text-[#111827]">
          Audit log
        </h1>
        <p className="mt-2 text-base leading-relaxed text-[#7A8190]">
          Who did what, and when. Medication details are not shown here.
        </p>
      </div>

      <div className="mt-[22px] flex flex-col gap-3 rounded-2xl border border-[#E2E5ED] bg-white p-3 shadow-sm shadow-[#111827]/[0.03] lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full lg:max-w-[320px]">
          <span className="sr-only">Search audit log</span>
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A8190]">
            <SearchIcon />
          </span>
          <input
            type="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setCurrentPage(1)
            }}
            className="h-10 w-full rounded-xl border border-[#D8DCE5] bg-white pl-10 pr-4 text-sm text-[#111827] outline-none transition placeholder:text-[#A6ADBA] focus:border-[#475AA2] focus:ring-4 focus:ring-[#475AA2]/15"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <label className="relative inline-flex h-10 items-center gap-2 rounded-xl border border-[#D8DCE5] bg-white px-3 text-sm font-medium text-[#52556C] transition focus-within:ring-4 focus-within:ring-[#475AA2]/15">
            <FilterIcon />
            <span>Filter</span>
            <select
              value={activityFilter}
              onChange={(event) => {
                setActivityFilter(event.target.value)
                setCurrentPage(1)
              }}
              className="appearance-none bg-transparent pr-6 text-sm outline-none"
              aria-label="Filter audit log by activity"
            >
              <option value="All">All</option>
              <option value="Updated">Updated</option>
              <option value="Prescribed">Prescribed</option>
              <option value="Clarification">Clarification</option>
              <option value="Dispensed">Dispensed</option>
            </select>
            <span className="pointer-events-none absolute right-2 text-[#7A8190]">
              <ChevronDownIcon />
            </span>
          </label>

          <label className="relative inline-flex h-10 items-center gap-2 rounded-xl border border-[#D8DCE5] bg-white px-3 text-sm font-medium text-[#52556C] transition focus-within:ring-4 focus-within:ring-[#475AA2]/15">
            <span>Sort by</span>
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value)
                setCurrentPage(1)
              }}
              className="appearance-none bg-transparent pr-6 text-sm outline-none"
              aria-label="Sort audit log"
            >
              <option value="Newest">Newest</option>
              <option value="Oldest">Oldest</option>
              <option value="Who">Who</option>
              <option value="Event">Event</option>
              <option value="Patient">Patient</option>
            </select>
            <span className="pointer-events-none absolute right-2 text-[#7A8190]">
              <ChevronDownIcon />
            </span>
          </label>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#E2E5ED] bg-white shadow-sm shadow-[#111827]/[0.03] lg:flex lg:h-[clamp(360px,calc(100vh-286px),520px)] lg:flex-col">
        <div className="overflow-x-auto lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          <table className={`w-full min-w-[820px] border-collapse ${visibleRecords.length === 0 ? 'lg:h-full' : ''}`}>
            <thead className="h-[42px]">
              <tr className="border-b border-[#E2E5ED] bg-[#F7F8FB] text-left text-xs font-medium text-[#52556C]">
                <th className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    When
                    <SortArrowIcon />
                  </span>
                </th>
                <th className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    Who
                    <SortArrowIcon />
                  </span>
                </th>
                <th className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    Event
                    <SortArrowIcon />
                  </span>
                </th>
                <th className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    Patient
                    <SortArrowIcon />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="h-full p-0">
                    <div className="flex min-h-[300px] flex-col items-center justify-center px-5 py-10 text-center">
                      <p className="text-sm font-medium text-[#7A8190]">
                        Loading audit activities...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="4" className="h-full p-0">
                    <div className="flex min-h-[300px] flex-col items-center justify-center px-5 py-10 text-center">
                      <p className="text-sm font-medium text-[#E5484D]">{error}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setLoading(true)
                          setError('')
                          setReloadKey((k) => k + 1)
                        }}
                        className="mt-3 text-sm font-semibold text-[#475AA2] hover:underline"
                      >
                        Try again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : paginatedRecords.length > 0 ? (
                paginatedRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-[#E2E5ED] text-sm font-medium text-[#111827] last:border-b-0 hover:bg-[#F9FAFC]"
                  >
                    <td className="px-4 py-3 text-[#7A8190]">{record.when}</td>
                    <td className="px-4 py-3 text-[#111827]">{record.who}</td>
                    <td className="px-4 py-3 text-[#7A8190]">{record.event}</td>
                    <td className="px-4 py-3 text-[#7A8190]">
                      {record.patient}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="h-full p-0">
                    <div className="flex min-h-[300px] flex-col items-center justify-center px-5 py-10 text-center lg:h-full lg:min-h-0">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#D0E7DC] text-[#2F7D59]">
                        <ListIcon />
                      </div>
                      <p className="mt-4 text-sm font-medium text-[#7A8190]">
                        No activities
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination
          totalItems={visibleRecords.length}
          currentPage={safeCurrentPage}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </section>
  )
}

export default AdminAuditLog
