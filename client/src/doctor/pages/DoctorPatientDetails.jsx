import { useCallback, useState } from 'react'
import { Link, Outlet, useOutletContext, useParams } from 'react-router-dom'
import DoctorLayout from '../components/DoctorLayout'
import DoctorIcon from '../components/DoctorIcon'
import { formatMedicationTimestamp } from '../medicationDates'
import AddMedicationModal from '../components/AddMedicationModal'
import MedicationActionsMenu from '../components/MedicationActionsMenu'
import ModifyPrescriptionModal from '../components/ModifyPrescriptionModal'
import DiscontinuePrescriptionModal from '../components/DiscontinuePrescriptionModal'
import { createDoctorPrescription, getDoctorPatientDetails, modifyDoctorPrescription, discontinueDoctorPrescription } from '../prescriptions'
import useDoctorRecords from '../useDoctorRecords'

// Keep selected records in memory only; real details are loaded by their route ID.
export function DoctorPatientRoutes() {
  const [selectedPatient, setSelectedPatient] = useState(null)
  return <Outlet context={{ selectedPatient, setSelectedPatient }} />
}

function displayText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '-'
}

function MedicationStatus({ status, history = false }) {
  const normalized = typeof status === 'string' ? status.toLowerCase() : ''
  const styles = {
    active: { label: 'Active', badge: 'border-[#D0E7DC] bg-[#EDF7F0] text-[#2F7D59]', indicator: 'bg-[#2F7D59]' },
    dispensed: { label: 'Active', badge: 'border-[#D0E7DC] bg-[#EDF7F0] text-[#2F7D59]', indicator: 'bg-[#2F7D59]' },
    pending: { label: 'Unverified', badge: 'border-[#F8D6DD] bg-[#FFF1F3] text-[#B83F5C]', indicator: 'bg-[#B83F5C]' },
    unverified: history
      ? { label: 'Unverified', badge: 'border-[#DEE2F4] bg-[#EEF0FF] text-[#475AA2]', indicator: 'bg-[#475AA2]' }
      : { label: 'Unverified', badge: 'border-[#F8D6DD] bg-[#FFF1F3] text-[#B83F5C]', indicator: 'bg-[#B83F5C]' },
    clarified: { label: 'Clarified', badge: 'border-[#DEE2F4] bg-[#EEF0FF] text-[#475AA2]', indicator: 'bg-[#475AA2]' },
    awaiting_clarification: { label: 'Awaiting Clarification', badge: 'border-[#FED7AA] bg-[#FFF7ED] text-[#C2410C]', indicator: 'bg-[#C2410C]' },
    discontinued: { label: 'Discontinued', badge: 'border-[#E2E5ED] bg-[#F7F8FB] text-[#7A8190]', indicator: 'bg-[#7A8190]' },
    completed: { label: 'Completed', badge: 'border-[#E2E5ED] bg-[#EDF7F0] text-[#2F7D59]', indicator: 'bg-[#2F7D59]' },
  }
  const style = Object.hasOwn(styles, normalized) ? styles[normalized] : null
  if (!style) return <span>{displayText(status)}</span>
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-medium ${style.badge}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.indicator}`} />
      {style.label}
    </span>
  )
}

function MedicationDate({ value, timeZone }) {
  const formatted = formatMedicationTimestamp(value, timeZone)
  return formatted ? <time dateTime={formatted.dateTime}>{formatted.label}</time> : '\u2014'
}

function PatientDetailsContent({ patient = null, isLoading: suppliedLoading = false, error: suppliedError = '', medicationsLoading = false, medicationsError = '', onRetry: suppliedRetry, live, timeZone, getDiscontinuationTimestamp, duplicateRecords: suppliedDuplicates = null, patientsPath = '/doctor/patients' }) {
  const { patientId } = useParams()
  const context = useOutletContext()
  const loadPatient = useCallback(signal => getDoctorPatientDetails(patientId, signal), [patientId])
  const loaded = useDoctorRecords(loadPatient, live)
  const isLoading = live ? loaded.isLoading : suppliedLoading
  const error = live ? loaded.error : suppliedError
  const onRetry = live ? loaded.onRetry : suppliedRetry
  const duplicateRecords = live ? loaded.records?.duplicateRecords : suppliedDuplicates
  const candidate = live ? loaded.records?.patient || context?.selectedPatient?.patient : patient || context?.selectedPatient?.patient
  const selectedPatient = candidate && String(candidate.id).toLowerCase() === String(patientId).toLowerCase() ? candidate : null
  const [feedback, setFeedback] = useState(null)
  const [tabState, setTabState] = useState(null)
  const [modalPatientId, setModalPatientId] = useState(null)
  const [actionState, setActionState] = useState(null)
  const [discontinuation, setDiscontinuation] = useState(null)
  const closeDiscontinuation = useCallback(() => setDiscontinuation(null), [])
  const [modification, setModification] = useState(null)
  const closeModification = useCallback(() => setModification(null), [])
  const closeActions = useCallback(() => setActionState(null), [])
  const changeTab = (value) => {
    setTabState({ patientId, tab: value })
    setActionState(null)
  }
  const closeMedicationModal = useCallback(() => setModalPatientId(null), [])
  const tab = tabState?.patientId === patientId ? tabState.tab : 'current'
  const name = selectedPatient ? displayText(selectedPatient.name) : 'Patient details'
  const hasName = selectedPatient && name !== '-'
  const initials = hasName ? name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() : ''
  const age = Number.isSafeInteger(selectedPatient?.age) && selectedPatient.age >= 0 ? `${selectedPatient.age} years old` : 'Age unavailable'
  const records = tab === 'current' ? selectedPatient?.currentMedications : selectedPatient?.medicationHistory
  const unavailable = isLoading || Boolean(error) || medicationsLoading || Boolean(medicationsError) || !selectedPatient
  const medications = !unavailable && Array.isArray(records) ? records : []

  async function saveMedication(action, signal) {
    if (!live || !selectedPatient) {
      throw new Error('Please select a valid patient before submitting.')
    }
    const result = await action()
    if (signal.aborted) return
    setFeedback({ patientId, message: result.message })
    setModalPatientId(null)
    setModification(null)
    setDiscontinuation(null)
    setTabState({ patientId, tab: 'current' })
    loaded.onRetry()
  }

  return (
    <>
      <nav aria-label="Breadcrumb" className="mt-5 flex min-w-0 items-center gap-2 text-sm text-[#7A8190]">
        <Link to={patientsPath} className="shrink-0 font-medium text-[#475AA2] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/15">Patients</Link>
        <span aria-hidden="true">&gt;</span>
        <span aria-current="page" className="min-w-0 break-words">{hasName ? name : 'Patient details'}</span>
      </nav>

      <section aria-label="Patient profile" aria-busy={isLoading} className="mt-5 flex items-center gap-4 rounded-xl border border-[#DEE2F4] bg-[#EEF0FF] p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#DEE2F4] text-sm font-semibold text-[#475AA2]">
          {initials || <DoctorIcon type="user" className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          <h1 className="break-words text-xl font-semibold text-[#111827]">{hasName ? name : 'Patient information unavailable'}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#7A8190]">
            <span>{age}</span><span aria-hidden="true">&bull;</span><span>{displayText(selectedPatient?.gender) === '-' ? 'Gender unavailable' : selectedPatient.gender}</span>
          </div>
        </div>
      </section>

      {!isLoading && !error && !selectedPatient && <p role="status" className="mt-3 text-sm text-[#7A8190]">Patient information is not available. Return to Patients to select a patient.</p>}
      {feedback?.patientId === patientId && <p role="status" className="mt-3 text-sm text-[#2F7D59]">{feedback.message}</p>}

      <div className="mt-[22px] flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E5ED]">
        <div role="tablist" aria-label="Patient medications" className="flex min-w-0 max-w-full">
          {[['current', 'Current medications'], ['history', 'Medication history']].map(([value, label]) => (
            <button key={value} id={`medications-tab-${value}`} type="button" role="tab" aria-selected={tab === value} aria-controls="patient-medications-panel" tabIndex={tab === value ? 0 : -1}
              onClick={() => changeTab(value)}
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
                event.preventDefault()
                const next = event.key === 'Home' ? 'current' : event.key === 'End' ? 'history' : value === 'current' ? 'history' : 'current'
                changeTab(next)
                document.getElementById(`medications-tab-${next}`)?.focus()
              }}
              className={`min-w-0 border-b-2 px-3 py-3 text-sm font-medium transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/15 ${tab === value ? 'border-[#475AA2] text-[#475AA2]' : 'border-transparent text-[#7A8190] hover:text-[#475AA2]'}`}>{label}</button>
          ))}
        </div>
        <button type="button" onClick={() => { closeActions(); setFeedback(null); setModalPatientId(patientId) }} aria-haspopup="dialog" className="mb-2 inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#475AA2] px-4 text-sm font-semibold text-white transition hover:bg-[#3D4F91] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25">
          <span aria-hidden="true" className="text-lg leading-none">+</span>Add medication
        </button>
      </div>

      <section id="patient-medications-panel" role="tabpanel" aria-labelledby={`medications-tab-${tab}`} tabIndex={0} aria-busy={isLoading || medicationsLoading} className="mt-5 overflow-hidden rounded-2xl border border-[#E2E5ED] bg-white shadow-sm shadow-[#111827]/[0.03] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/15 lg:flex lg:max-h-[calc(100vh-330px)] lg:flex-col">
        <div className="overflow-x-auto lg:min-h-0 lg:overflow-y-auto">
          <table className="w-full min-w-[940px] border-collapse">
            <thead><tr className="border-b border-[#E2E5ED] bg-[#F7F8FB] text-left text-xs font-medium text-[#52556C]">
              {['Medication', 'Dose and frequency', 'Duration', 'Prescribed by', 'Status', tab === 'history' ? 'Date and time' : 'Date', 'Actions'].map((label) => <th key={label} scope="col" className="px-4 py-3">{label}</th>)}
            </tr></thead>
            <tbody>
              {medications.map((medication) => <tr key={medication.id} className="border-b border-[#E2E5ED] text-sm text-[#111827] last:border-b-0">
                <td className="max-w-[220px] break-words px-4 py-3"><p className="font-medium">{displayText(medication.name)}</p>{(medication.description || medication.indication) && <p className="mt-1 text-xs text-[#7A8190]">{displayText(medication.description || medication.indication)}</p>}</td>
                <td className="px-4 py-3"><p>{displayText(medication.dose)}</p><p className="mt-1 text-xs text-[#7A8190]">{displayText(medication.frequency)}</p></td>
                <td className="px-4 py-3">{displayText(medication.duration)}</td>
                <td className="px-4 py-3">{displayText(typeof medication.prescribedBy === 'object' ? medication.prescribedBy?.name : medication.prescribedBy)}</td>
                <td className="px-4 py-3"><MedicationStatus status={medication.status} history={tab === 'history'} /></td>
                <td className="px-4 py-3 text-xs text-[#7A8190]">
                  <MedicationDate value={medication.date} timeZone={timeZone} />
                  {tab === 'history' && typeof medication.status === 'string' && medication.status.toLowerCase() === 'discontinued' && typeof getDiscontinuationTimestamp === 'function' && (
                    <p className="mt-1">Discontinued: <MedicationDate value={getDiscontinuationTimestamp(medication)} timeZone={timeZone} /></p>
                  )}
                </td>
                <td className="px-4 py-3"><MedicationActionsMenu medication={medication} readOnly={tab === 'history' || medication.id == null}
                  open={tab === 'current' && actionState?.patientId === patientId && actionState?.medicationId === medication.id}
                  onToggle={() => setActionState((previous) => previous?.patientId === patientId && previous?.medicationId === medication.id ? null : { patientId, medicationId: medication.id })}
                  onClose={closeActions}
                  onSelect={(action) => {
                    setFeedback(null)
                    if (action === 'Modify prescription') {
                      setModification({ patientId, prescription: medication })
                    } else if (action === 'Discontinue') {
                      setDiscontinuation({ patientId, prescription: medication })
                    }
                  }} />
                </td>
              </tr>)}
            </tbody>
          </table>
          {medications.length === 0 && <div className="sticky left-0 flex min-h-[240px] flex-col items-center justify-center px-5 py-8 text-center">
            {isLoading || medicationsLoading ? <p role="status" className="text-sm text-[#7A8190]">{isLoading ? 'Loading patient...' : 'Loading medications...'}</p>
              : error || medicationsError ? <div role="alert" className="text-sm text-[#E5484D]"><p>{error || medicationsError}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-3 font-semibold text-[#475AA2]">Try again</button>}</div>
              : <><div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#D0E7DC] text-[#2F7D59]"><DoctorIcon type="medicineBottle" className="h-5 w-5" /></div><p className="mt-4 text-sm text-[#7A8190]">{tab === 'current' ? 'No medications available yet.' : 'No medication history available yet.'}</p></>}
          </div>}
        </div>
      </section>
      {modalPatientId !== null && modalPatientId === patientId && <AddMedicationModal key={patientId} patient={selectedPatient} onClose={() => { closeMedicationModal(); if (live) loaded.onRetry() }} duplicateRecords={duplicateRecords} onSubmitPrescription={live && selectedPatient ? (values, signal) => saveMedication(() => createDoctorPrescription(patientId, values, signal), signal) : null} />}
      {modification?.patientId === patientId && selectedPatient && <ModifyPrescriptionModal key={`${patientId}:${modification.prescription.id}`} patient={selectedPatient} prescription={modification.prescription} onClose={() => { closeModification(); if (live) loaded.onRetry() }} onSubmitPrescription={live && selectedPatient ? (values, signal) => saveMedication(() => modifyDoctorPrescription(patientId, modification.prescription.id, values, signal), signal) : null} />}
      {discontinuation?.patientId === patientId && selectedPatient && <DiscontinuePrescriptionModal key={`${patientId}:${discontinuation.prescription.id}`} patient={selectedPatient} prescription={discontinuation.prescription} onClose={() => { closeDiscontinuation(); if (live) loaded.onRetry() }} onSubmitPrescription={live && selectedPatient ? (reason, signal) => saveMedication(() => discontinueDoctorPrescription(patientId, discontinuation.prescription.id, reason, signal), signal) : null} />}
    </>
  )
}

export default function DoctorPatientDetails({ doctor = null, Layout = DoctorLayout, ...props }) {
  const context = useOutletContext()
  return <Layout doctor={doctor || context?.selectedPatient?.doctor || null} view="patients">
    <PatientDetailsContent {...props} live={Layout === DoctorLayout} />
  </Layout>
}
