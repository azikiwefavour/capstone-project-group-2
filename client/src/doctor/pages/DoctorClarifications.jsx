import { useCallback, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import DoctorLayout from '../components/DoctorLayout'
import DoctorIcon from '../components/DoctorIcon'
import ClarificationActions from '../components/ClarificationActions'
import { formatMedicationTimestamp } from '../medicationDates'

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '\u2014'
}

function ClarificationStatus({ status }) {
  if (typeof status !== 'string' || !status.trim()) return '\u2014'
  const pending = status.trim().toLowerCase() === 'pending'
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#E2E5ED] bg-white px-2.5 py-1 text-xs font-medium text-[#111827]">
    {pending && <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#E59A35]"><path d="M10 2 19 18H1L10 2Z" fill="currentColor" /><path d="M10 7v5m0 2.5v.1" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>}
    {pending ? 'Pending' : status.trim()}
  </span>
}

// Frontend view props, not an assumed API schema. A confirmed backend adapter must
// supply id, patient (name), concern, sentBy (name), status, and date (ISO with offset).
// No clarification endpoint or Doctor API-authorized session is currently integrated.
export default function DoctorClarifications({ doctor = null, clarifications = [], isLoading = false, error = '', onRetry, timeZone, Layout = DoctorLayout, basePath = '/doctor' }) {
  const clarificationContext = useOutletContext()
  const [openRecord, setOpenRecord] = useState(null)
  const closeActions = useCallback(() => setOpenRecord(null), [])
  const records = !isLoading && !error && Array.isArray(clarifications) ? clarifications : []

  return <Layout doctor={doctor} view="clarifications">
    <section className="mt-4">
      <h1 className="text-2xl font-semibold tracking-normal text-[#111827]">Clarifications</h1>
      <p className="mt-2 text-base leading-relaxed text-[#7A8190]">Questions from pharmacists about your prescriptions.</p>
    </section>
    <section aria-label="Clarifications" aria-busy={isLoading} className="mt-[22px] overflow-hidden rounded-2xl border border-[#E2E5ED] bg-white shadow-sm shadow-[#111827]/[0.03] lg:flex lg:max-h-[calc(100vh-200px)] lg:flex-col">
      <div className="overflow-x-auto lg:min-h-0 lg:overflow-y-auto">
        <table className="w-full min-w-[800px] border-collapse">
          <thead><tr className="border-b border-[#E2E5ED] bg-[#F7F8FB] text-left text-xs font-medium text-[#52556C]">
            {['Patient', 'Concern', 'Sent by', 'Status', 'Date', 'Actions'].map(label => <th key={label} scope="col" className="px-4 py-3">{label}</th>)}
          </tr></thead>
          <tbody>
            {records.map(record => {
              const patientName = text(typeof record.patient === 'object' ? record.patient?.name : record.patient)
              const date = formatMedicationTimestamp(record.date, timeZone)
              return <tr key={record.id} className="border-b border-[#E2E5ED] text-sm text-[#111827] last:border-b-0">
                <td className="max-w-[220px] break-words px-4 py-3 font-medium">{record.id != null && String(record.id).trim() ? <Link to={`${basePath}/clarifications/${encodeURIComponent(record.id)}`} onClick={() => clarificationContext?.setSelectedClarification({ record, doctor })}
                  className="hover:text-[#475AA2] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/15">{patientName}</Link> : patientName}</td>
                <td className="max-w-[260px] break-words px-4 py-3">{text(record.concern)}</td>
                <td className="px-4 py-3">{text(typeof record.sentBy === 'object' ? record.sentBy?.name : record.sentBy)}</td>
                <td className="px-4 py-3"><ClarificationStatus status={record.status} /></td>
                <td className="px-4 py-3 text-xs text-[#7A8190]">{date ? <time dateTime={date.dateTime}>{date.label}</time> : '\u2014'}</td>
                <td className="px-4 py-3"><ClarificationActions recordId={record.id} patientName={patientName} open={openRecord !== null && openRecord === record.id}
                  onToggle={() => setOpenRecord(previous => previous === record.id ? null : record.id)} onClose={closeActions} /></td>
              </tr>
            })}
          </tbody>
        </table>
        {records.length === 0 && <div className="sticky left-0 flex min-h-[260px] flex-col items-center justify-center px-5 py-8 text-center">
          {isLoading ? <p role="status" className="text-sm text-[#7A8190]">Loading clarifications...</p>
            : error ? <div role="alert" className="text-sm text-[#E5484D]"><p>{error}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-3 font-semibold text-[#475AA2]">Try again</button>}</div>
            : <><div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#D0E7DC] text-[#2F7D59]"><DoctorIcon type="clarification" className="h-5 w-5" /></div><p role="status" className="mt-4 text-sm font-medium text-[#7A8190]">No clarifications available yet.</p></>}
        </div>}
      </div>
    </section>
  </Layout>
}
