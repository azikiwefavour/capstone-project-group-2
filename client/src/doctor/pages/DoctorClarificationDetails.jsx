import { useCallback, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import DoctorLayout from '../components/DoctorLayout'
import DoctorIcon from '../components/DoctorIcon'
import ModifyPrescriptionModal from '../components/ModifyPrescriptionModal'
import ConfirmPrescriptionModal from '../components/ConfirmPrescriptionModal'
import { clarificationMatchesId } from '../clarifications'
import { formatMedicationTimestamp } from '../medicationDates'
import { getDoctorClarificationDetails, confirmDoctorClarification, modifyDoctorClarification } from '../clarificationApi'
import useDoctorRecords from '../useDoctorRecords'

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '\u2014'
}

function DetailRows({ rows }) {
  return <dl className="mt-2">
    {rows.map(([label, value]) => <div key={label} className="grid grid-cols-[108px_minmax(0,1fr)] gap-3 py-1 text-[13px] leading-5 sm:grid-cols-[140px_minmax(0,1fr)]">
      <dt className="text-[#7A8190]">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap break-words font-medium text-[#111827]">{value}</dd>
    </div>)}
  </dl>
}

function ClarificationDetailsContent({ clarification = null, isLoading: suppliedLoading = false, error: suppliedError = '', onRetry: suppliedRetry, timeZone, live, clarificationsPath = '/doctor/clarifications' }) {
  const { clarificationId } = useParams()
  const context = useOutletContext()
  const navigate = useNavigate()
  const loadClarification = useCallback(signal => getDoctorClarificationDetails(clarificationId, signal), [clarificationId])
  const loaded = useDoctorRecords(loadClarification, live)
  const isLoading = live ? loaded.isLoading : suppliedLoading
  const error = live ? loaded.error : suppliedError
  const onRetry = live ? loaded.onRetry : suppliedRetry
  const candidate = live ? loaded.records : clarification || context?.selectedClarification?.record
  const record = !isLoading && !error && clarificationMatchesId(candidate, clarificationId) ? candidate : null
  const patient = record?.patient && typeof record.patient === 'object' ? record.patient : { name: typeof record?.patient === 'string' ? record.patient : '' }
  const name = text(patient.name)
  const hasName = name !== '\u2014'
  const initials = hasName ? name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() : ''
  const age = Number.isSafeInteger(patient.age) && patient.age >= 0 ? `${patient.age} years old` : 'Age unavailable'
  const date = formatMedicationTimestamp(record?.date, timeZone)
  const prescription = record?.prescription && typeof record.prescription === 'object' && !Array.isArray(record.prescription) ? record.prescription : null
  const canModify = prescription?.id != null && String(prescription.id).trim() !== ''
  const [modifyingId, setModifyingId] = useState(null)
  const closeModification = useCallback(() => setModifyingId(null), [])
  const [confirmingId, setConfirmingId] = useState(null)
  const closeConfirmation = useCallback(() => setConfirmingId(null), [])

  async function respond(action, signal) {
    if (!live || !canModify) throw new Error('Refresh the clarification before responding.')
    const result = await action()
    if (signal.aborted) return
    context?.setSelectedClarification(null)
    navigate(clarificationsPath, { replace: true, state: { doctorClarificationSuccess: result.message } })
  }

  return <>
    <nav aria-label="Breadcrumb" className="mt-5 flex min-w-0 items-center gap-2 text-sm text-[#7A8190]">
      <Link to={clarificationsPath} className="shrink-0 font-medium text-[#475AA2] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/15">Clarifications</Link>
      <span aria-hidden="true">&gt;</span><span aria-current="page" className="min-w-0 break-words">{hasName ? name : 'Clarification details'}</span>
    </nav>

    <div aria-busy={isLoading}>
      {isLoading ? <p role="status" className="mt-5 text-sm text-[#7A8190]">Loading clarification...</p>
        : error ? <div role="alert" className="mt-5 text-sm text-[#E5484D]"><p>{error}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-3 font-semibold text-[#475AA2]">Try again</button>}</div>
        : !record ? <p role="status" className="mt-5 text-sm text-[#7A8190]">Clarification information is not available. Return to Clarifications to select a record.</p> : null}

      <section aria-label="Patient profile" className="mt-5 flex items-center gap-3 rounded-xl border border-[#DEE2F4] bg-[#EEF0FF] p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DEE2F4] text-sm font-semibold text-[#475AA2]">{initials || <DoctorIcon type="user" className="h-5 w-5" />}</div>
        <div className="min-w-0"><h1 className="break-words text-lg font-semibold text-[#111827]">{hasName ? name : 'Patient information unavailable'}</h1>
          <p className="mt-1 text-sm text-[#7A8190]">{age} &bull; {text(patient.gender) === '\u2014' ? 'Gender unavailable' : text(patient.gender)}</p>
        </div>
      </section>

      <section aria-label="Clarification and prescription details" className="mt-4 rounded-lg border border-[#E2E5ED] bg-[#F7F8FB] p-4">
        <h2 className="text-sm font-semibold text-[#111827]">Clarification details</h2>
        <DetailRows rows={[
          ['Requested by', text(typeof record?.sentBy === 'object' ? record.sentBy?.name : record?.sentBy)],
          ['Concern', text(record?.concern)],
          ['Note', text(record?.note)],
          ['Submitted on', record?.dateLabel !== undefined ? text(record.dateLabel) : date ? <time dateTime={date.dateTime}>{date.label}</time> : '\u2014'],
        ]} />
        <div className="mt-3 border-t border-[#E2E5ED] pt-3">
          <h2 className="text-sm font-semibold text-[#111827]">Prescription details</h2>
          <DetailRows rows={[
            ['Medication', text(prescription?.name)], ['Dose', text(prescription?.dose)],
            ['Frequency', text(prescription?.frequency)], ['Duration', text(prescription?.duration)],
            ['Reason', text(prescription?.reason)],
          ]} />
        </div>
      </section>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={!canModify} onClick={() => setModifyingId(clarificationId)} aria-haspopup="dialog" aria-describedby={!canModify ? 'clarification-modification-unavailable' : undefined}
          className="inline-flex h-9 items-center justify-center rounded-xl bg-[#DEE2F4] px-3 text-[13px] font-semibold text-[#475AA2] hover:bg-[#CCD2FF] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15 disabled:cursor-not-allowed disabled:opacity-45">Modify prescription</button>
        <button type="button" disabled={!canModify} onClick={() => setConfirmingId(clarificationId)} aria-haspopup="dialog" aria-describedby={!live ? 'clarification-confirmation-unavailable' : undefined} className="inline-flex h-9 items-center justify-center rounded-xl bg-[#475AA2] px-3 text-[13px] font-semibold text-white hover:bg-[#3D4F91] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25 disabled:cursor-not-allowed disabled:opacity-45">Confirm prescription</button>
      </div>
      {!canModify && <p id="clarification-modification-unavailable" className="mt-2 text-xs text-[#7A8190]">Modification is unavailable because the associated prescription information is missing.</p>}
      {!live && <p id="clarification-confirmation-unavailable" className="mt-2 text-xs text-[#7A8190]">Prescription confirmation is not available yet. No changes have been made.</p>}
    </div>
    {modifyingId === clarificationId && canModify && <ModifyPrescriptionModal key={`${clarificationId}:${prescription.id}`} patient={patient} prescription={prescription} onClose={() => { closeModification(); if (live) loaded.onRetry() }} onSubmitPrescription={live ? (values, signal) => respond(() => modifyDoctorClarification(clarificationId, values, signal), signal) : null} />}
    {confirmingId === clarificationId && canModify && <ConfirmPrescriptionModal key={`${clarificationId}:${prescription.id}`} patient={patient} prescription={prescription} onClose={() => { closeConfirmation(); if (live) loaded.onRetry() }} onSubmitPrescription={live ? (note, signal) => respond(() => confirmDoctorClarification(clarificationId, note, signal), signal) : null} />}
  </>
}

export default function DoctorClarificationDetails({ doctor = null, Layout = DoctorLayout, ...props }) {
  const context = useOutletContext()
  return <Layout doctor={doctor || context?.selectedClarification?.doctor || null} view="clarifications" background="white">
    <ClarificationDetailsContent {...props} live={Layout === DoctorLayout} />
  </Layout>
}
