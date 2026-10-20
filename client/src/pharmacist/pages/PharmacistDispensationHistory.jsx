import { useEffect, useState, useSyncExternalStore } from 'react'
import AdminPagination from '../../admin/components/AdminPagination'
import DoctorIcon from '../../doctor/components/DoctorIcon'
import { getPharmacistAccessToken, subscribeToPharmacistSession } from '../../auth/pharmacistSession'
import { getDispensedMedications } from '../prescriptions'

export default function PharmacistDispensationHistory() {
  const token = useSyncExternalStore(subscribeToPharmacistSession, getPharmacistAccessToken)
  const [attempt, setAttempt] = useState(0)
  const [snapshot, setSnapshot] = useState(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(7)
  const checked = snapshot?.token === token && snapshot?.attempt === attempt
  const loading = !checked
  const error = checked ? snapshot.error : ''
  const records = checked && !error ? snapshot.records : []
  const search = query.trim().toLowerCase()
  const filtered = records.filter(record => [record.medicationName, record.reason, record.patientName, record.dosage, record.frequency, record.doseAndFrequency, record.doctorName].some(value => value.toLowerCase().includes(search)))
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / rowsPerPage)))
  const visible = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    getDispensedMedications(controller.signal).then(records => {
      if (!controller.signal.aborted && getPharmacistAccessToken() === token) setSnapshot({ token, attempt, records })
    }).catch(error => {
      if (!controller.signal.aborted && error.name !== 'AbortError' && getPharmacistAccessToken() === token) setSnapshot({ token, attempt, error: error.message })
    })
    return () => controller.abort()
  }, [token, attempt])

  return <>
    <section className="mt-4">
      <h1 className="text-2xl font-semibold tracking-normal text-[#111827]">Dispensation History</h1>
      <p className="mt-2 text-base leading-relaxed text-[#7A8190]">All medications dispensed to patients</p>
    </section>
    <label className="relative mt-[22px] block w-full min-w-0 sm:max-w-[320px]">
      <span className="sr-only">Search dispensed medications</span>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#7A8190]"><DoctorIcon type="search" className="h-4 w-4" /></span>
      <input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder="Search medications or patients" className="h-10 w-full rounded-xl border border-[#D8DCE5] bg-white pl-9 pr-3 text-sm text-[#111827] outline-none placeholder:text-[#A6ADBA] focus:border-[#475AA2] focus:ring-4 focus:ring-[#475AA2]/15" />
    </label>
    <section aria-label="Dispensation history" aria-busy={loading} className="mt-4 overflow-hidden rounded-2xl border border-[#E2E5ED] bg-white shadow-sm shadow-[#111827]/[0.03] lg:flex lg:h-[calc(100dvh-244px)] lg:flex-col">
      <div className="overflow-x-auto lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <table className="w-full min-w-[800px] border-collapse">
          <thead className="sticky top-0 z-10"><tr className="border-b border-[#E2E5ED] bg-[#F7F8FB] text-left text-xs font-medium text-[#52556C]">
            {['Medication', 'Patient', 'Dose and frequency', 'Prescribed by', 'Dispensed on'].map(label => <th key={label} scope="col" className="px-4 py-3">{label}</th>)}
          </tr></thead>
          <tbody>
            {visible.map(record => <tr key={record.id} className="border-b border-[#E2E5ED] text-sm text-[#111827] last:border-b-0">
              <td className="max-w-[240px] break-words px-4 py-3"><p className="font-medium">{record.medicationName || 'Medication unavailable'}</p>{record.reason && <p className="mt-1 text-xs leading-5 text-[#7A8190]">{record.reason}</p>}</td>
              <td className="max-w-[220px] break-words px-4 py-3">{record.patientName || 'Name unavailable'}</td>
              <td className="max-w-[200px] break-words px-4 py-3">{record.dosage || record.frequency ? <><p>{record.dosage || '—'}</p><p className="mt-1 text-xs text-[#7A8190]">{record.frequency || '—'}</p></> : record.doseAndFrequency || '—'}</td>
              <td className="max-w-[220px] break-words px-4 py-3">{record.doctorName || '—'}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-[#7A8190]"><span aria-label="Dispensing date unavailable" title="Dispensing date unavailable">—</span></td>
            </tr>)}
          </tbody>
        </table>
        {visible.length === 0 && <div className="sticky left-0 px-5 py-12 text-center text-sm text-[#7A8190]">
          {loading ? <p role="status">Loading dispensed medications...</p> : error ? <div role="alert"><p className="text-[#E5484D]">{error}</p><button type="button" onClick={() => setAttempt(current => current + 1)} className="mt-3 rounded-lg px-3 py-2 font-semibold text-[#475AA2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#475AA2]">Try again</button></div>
            : <p role="status">{records.length === 0 ? 'No medications have been dispensed yet' : 'No dispensed medications match your search.'}</p>}
        </div>}
      </div>
      <div className="flex shrink-0 flex-col border-t border-[#E2E5ED] sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1 [&>div]:border-t-0"><AdminPagination totalItems={filtered.length} currentPage={currentPage} rowsPerPage={rowsPerPage} onPageChange={setPage} /></div>
        <select aria-label="Rows per page" value={rowsPerPage} onChange={event => { setRowsPerPage(Number(event.target.value)); setPage(1) }} className="mx-4 mb-3 h-9 self-end rounded-lg border border-[#D8DCE5] bg-white px-2 text-sm text-[#52556C] outline-none focus:ring-4 focus:ring-[#475AA2]/15 sm:mb-0 sm:ml-0 sm:self-auto">
          {[7, 14, 28].map(count => <option key={count} value={count}>{count} / page</option>)}
        </select>
      </div>
    </section>
  </>
}
