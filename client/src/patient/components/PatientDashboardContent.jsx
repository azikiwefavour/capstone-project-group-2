import { useState, useSyncExternalStore } from 'react'
import DoctorIcon from '../../doctor/components/DoctorIcon'
import { patientDate, prescriptionCounts, searchDiagnoses, sortDiagnoses, paginateDiagnoses } from '../dashboard'
import PatientPagination from './PatientPagination'

const desktopQuery = '(min-width: 1024px)'
function subscribeViewport(listener) {
  const media = window.matchMedia(desktopQuery)
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}
const desktopSnapshot = () => window.matchMedia(desktopQuery).matches

// Exact palette and dimensions from the existing MedTrail summary cards.
const statistics = [
  { key: 'pending', label: 'Pending prescriptions', icon: 'bell', color: 'bg-[#FEF3C7] text-[#B45309] lg:bg-[#DEE2F4] lg:text-[#7A8DD5]' },
  { key: 'active', label: 'Active prescriptions', icon: 'medicineBottle', color: 'bg-[#F8D6DD] text-[#B83F5C] lg:bg-[#D0E7DC] lg:text-[#2F7D59]' },
  { key: 'all', label: 'All prescriptions', icon: 'prescription', color: 'bg-[#DEE2FF] text-[#475AA2]' },
  { key: 'discontinued', label: 'Discontinued prescriptions', icon: 'medicineBottle', color: 'bg-[#E2E5ED] text-[#7A8190] lg:bg-[#F8D6DD] lg:text-[#B83F5C]' },
]

const text = value => typeof value === 'string' && value.trim() ? value.trim() : '—'

function RecordDate({ value }) {
  const date = patientDate(value)
  return date ? <time dateTime={date.dateTime}>{date.label}</time> : '—'
}

function ActiveStatus() {
  return <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#D0E7DC] bg-[#EDF7F0] px-2.5 py-1 text-xs font-medium text-[#2F7D59]">
    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#2F7D59]" />Active
  </span>
}

function EmptyPrescriptions({ available }) {
  return <div className="flex min-h-[160px] flex-col lg:min-h-[96px] lg:gap-2 lg:p-3 items-center justify-center gap-3 rounded-2xl border border-[#E2E5ED] bg-white p-5 text-center shadow-sm shadow-[#111827]/[0.03]">
    <span className="flex h-14 w-14 items-center justify-center rounded-full lg:h-10 lg:w-10 bg-[#D0E7DC] text-[#2F7D59]"><DoctorIcon type="medicineBottle" /></span>
    <p className="text-sm font-medium text-[#7A8190]">{available ? 'No active prescriptions yet.' : 'Prescription records are not available yet.'}</p>
  </div>
}

function PrescriptionCard({ prescription, onComplete = null }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleComplete() {
    if (submitting || !onComplete) return
    setSubmitting(true)
    setError('')
    try {
      await onComplete(prescription.id)
    } catch (err) {
      setError(err.message || 'Unable to complete medication.')
      setSubmitting(false)
    }
  }

  return <article className="min-w-0 rounded-2xl border border-[#E2E5ED] bg-white p-5 shadow-sm shadow-[#111827]/[0.03]">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col items-start gap-3 lg:flex-row lg:items-center">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#DEE2F4] text-[#475AA2]"><DoctorIcon type="medicineBottle" /></span>
        <h3 className="min-w-0 break-words text-base font-semibold">{text(prescription.medicationName)}</h3>
      </div>
      <ActiveStatus />
    </div>
    <dl className="mt-5 grid min-w-0 grid-cols-2 gap-x-4 gap-y-4 text-sm">
      {[['Dosage', prescription.dosage], ['Frequency', prescription.frequency], ['Duration', prescription.duration], ['Reason', prescription.reason], ['Prescribed by', prescription.doctorName]].map(([label, value], index) => <div key={label} className={`min-w-0 ${index > 2 ? 'col-span-2 lg:col-span-1' : ''}`}>
        <dt className="text-xs text-[#7A8190]">{label}</dt><dd className="mt-1 break-words">{text(value)}</dd>
      </div>)}
    </dl>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E5ED] pt-3">
      <p className="text-xs text-[#7A8190]">Prescribed <RecordDate value={prescription.createdAt} /></p>
      {onComplete && (
        <button
          type="button"
          onClick={handleComplete}
          disabled={submitting}
          className="inline-flex h-8 items-center rounded-lg border border-[#D0E7DC] bg-[#EDF7F0] px-2.5 text-xs font-semibold text-[#2F7D59] hover:bg-[#D0E7DC] focus:outline-none focus:ring-2 focus:ring-[#2F7D59]/30 disabled:opacity-50"
        >
          {submitting ? 'Updating...' : 'Mark as finished'}
        </button>
      )}
    </div>
    {error && <p className="mt-2 text-xs text-[#E5484D]">{error}</p>}
  </article>
}

// Presentation only. A future Patient API adapter must verify ownership and
// completeness before supplying data. No inferred diagnoses or cross-role calls.
export default function PatientDashboardContent({ patientName = '', prescriptions = null, diagnoses = null, onCompletePrescription = null }) {
  const [query, setQuery] = useState('')
  const [requestedPage, setRequestedPage] = useState(1)
  const [sort, setSort] = useState({ key: null, direction: 'ascending' })
  const desktop = useSyncExternalStore(subscribeViewport, desktopSnapshot, () => true)
  const pageSize = desktop ? 10 : 5
  const counts = prescriptionCounts(prescriptions)
  const active = prescriptions?.filter(record => record.status === 'active') || []
  const visibleDiagnoses = Array.isArray(diagnoses) ? searchDiagnoses(diagnoses, query) : []
  const paginated = paginateDiagnoses(sortDiagnoses(visibleDiagnoses, sort.key, sort.direction), requestedPage, pageSize)
  const name = patientName.trim()

  function changeSort(key) {
    setSort(current => ({ key, direction: current.key === key && current.direction === 'ascending' ? 'descending' : 'ascending' }))
    setRequestedPage(1)
  }

  return <div className="lg:flex lg:flex-col lg:gap-10">
    <section className="mt-4 lg:mt-0">
      <h1 className="break-words text-2xl font-semibold tracking-normal text-[#111827]">{name ? `Welcome, ${name}` : 'Welcome to MedTrail'}</h1>
      {!counts && <p role="status" className="mt-3 text-sm leading-5 text-[#7A8190]">{desktop ? 'Your prescription records are not available yet. Unavailable counts are shown as —.' : 'Your prescription records are not available yet. Counts show 0 until records are available.'}</p>}
    </section>
    <section aria-label="Prescription summary" className="mx-auto mt-[22px] grid w-full max-w-[361px] grid-cols-2 gap-[22px] lg:mx-0 lg:mt-0 lg:max-w-none lg:grid-cols-4">
      {statistics.map(statistic => <article key={statistic.key} className="flex h-[195px] min-w-0 flex-col items-start justify-start gap-3 rounded-2xl border border-[#E2E5ED] bg-white px-2 py-4 shadow-sm shadow-[#111827]/[0.03] lg:h-[110px] lg:min-h-0 lg:flex-row lg:items-center lg:justify-between lg:p-5">
        <div className="min-w-0">
          <p aria-label={counts ? `${counts[statistic.key]} ${statistic.label}` : `${statistic.label} count unavailable`} className="text-2xl font-semibold tracking-normal text-[#111827] lg:text-3xl">{counts ? counts[statistic.key] : desktop ? '—' : '0'}</p>
          <h2 className="mt-1.5 text-xs leading-5 font-medium text-[#7A8190] lg:text-sm">{statistic.label}</h2>
        </div>
        <span className={`order-first flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] lg:order-none lg:h-[53px] lg:w-[53px] ${statistic.color}`}><DoctorIcon type={statistic.icon} /></span>
      </article>)}
    </section>
    <section aria-labelledby="patient-active-prescriptions" className="mt-[38px] lg:mt-0">
      <h2 id="patient-active-prescriptions" className="text-base font-semibold">Active prescriptions</h2>
      <div className="mt-4 grid gap-4 lg:mt-3 lg:gap-[22px] xl:grid-cols-3">
        {active.length ? active.map(prescription => <PrescriptionCard key={prescription.id} prescription={prescription} onComplete={onCompletePrescription} />)
          : <div className="col-span-full"><EmptyPrescriptions available={counts !== null} /></div>}
      </div>
    </section>
    <section aria-labelledby="patient-diagnoses" className="mt-[38px] pb-4 lg:mt-0 lg:pb-0">
      <div className="flex flex-col items-start gap-3 lg:gap-1.5">
        <h2 id="patient-diagnoses" className="text-base font-semibold">Diagnoses</h2>
        <div className="relative w-full sm:w-[280px]">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#7A8190]"><DoctorIcon type="search" className="h-4 w-4" /></span>
          <input type="search" aria-label="Search diagnoses" placeholder="Search diagnoses" value={query} onChange={event => { setQuery(event.target.value); setRequestedPage(1) }} disabled={!Array.isArray(diagnoses)} className="h-10 w-full min-w-0 rounded-xl border border-[#E2E5ED] bg-white pl-9 pr-3 text-sm text-[#111827] placeholder:text-[#7A8190] focus:border-[#475AA2] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/10 disabled:cursor-not-allowed disabled:bg-[#F7F8FB]" />
        </div>
      </div>
      <div className="mt-4 lg:mt-3 overflow-hidden rounded-2xl border border-[#E2E5ED] bg-white shadow-sm shadow-[#111827]/[0.03]">
        <div role="region" aria-label="Diagnosis table" tabIndex={0} className="overflow-x-auto focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/15">
          <table id="patient-diagnoses-table" className="w-full min-w-[560px] table-fixed border-collapse">
            <thead><tr className="border-b border-[#E2E5ED] bg-[#F7F8FB] text-left text-xs font-medium text-[#52556C]">
              {[['Diagnosis', 'diagnosis'], ['First recorded', 'firstRecorded'], ['Treated with', 'treatedWith'], ['Status', 'status']].map(([label, key]) => <th key={key} scope="col" aria-sort={sort.key === key ? sort.direction : 'none'} className="px-4 py-3">
                <button type="button" onClick={() => changeSort(key)} title={`Sort ${label.toLowerCase()} ${sort.key === key && sort.direction === 'ascending' ? 'descending' : 'ascending'}`} className="inline-flex items-center gap-1 text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/15">
                  {label}<svg viewBox="0 0 12 12" fill="none" aria-hidden="true" className="h-3 w-3 shrink-0"><path d={sort.key !== key ? 'M3 1V11M1 3L3 1L5 3M9 11V1M7 9L9 11L11 9' : sort.direction === 'ascending' ? 'M6 11V1M2 5L6 1L10 5' : 'M6 1V11M2 7L6 11L10 7'} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </th>)}
            </tr></thead>
            <tbody>
              {paginated.records.map(diagnosis => <tr key={diagnosis.id} className="border-b border-[#E2E5ED] text-sm text-[#111827] last:border-b-0">
                <td className="break-words px-4 py-4 font-medium">{text(diagnosis.diagnosis)}</td>
                <td className="px-4 py-4"><RecordDate value={diagnosis.firstRecorded} /></td>
                <td className="break-words px-4 py-4">{text(diagnosis.treatedWith)}</td>
                <td className="break-words px-4 py-4">{diagnosis.status === 'active' ? <ActiveStatus /> : text(diagnosis.status)}</td>
              </tr>)}
              {!visibleDiagnoses.length && <tr><td colSpan={4} className="px-4 py-12 lg:py-4 text-left lg:text-center text-sm text-[#7A8190]">{!Array.isArray(diagnoses) ? 'Diagnosis records are not available yet.' : query.trim() ? 'No diagnoses match your search.' : 'No diagnoses recorded yet'}</td></tr>}
            </tbody>
          </table>
        </div>
        <PatientPagination totalItems={visibleDiagnoses.length} page={paginated.page} pageSize={pageSize} desktop={desktop} onPageChange={setRequestedPage} />
      </div>
    </section>
  </div>
}
