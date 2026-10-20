import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getPharmacistAccessToken, subscribeToPharmacistSession } from '../../auth/pharmacistSession'
import { getPharmacistPrescriptionDetails, getPharmacistClarificationDetails } from '../prescriptions'
import PharmacistMedicationTable from '../components/PharmacistMedicationTable'
import PharmacistPrescriptionInformation from '../components/PharmacistPrescriptionInformation'
import VerifyPrescriptionModal from '../components/VerifyPrescriptionModal'
import RequestClarificationModal from '../components/RequestClarificationModal'
import { requestPharmacistClarification } from '../clarifications'
import PharmacistPatientProfile from '../components/PharmacistPatientProfile'
import ClarificationStatusBanner from '../components/ClarificationStatusBanner'

export default function PharmacistPrescriptionDetails({ view = 'queue' }) {
  const clarificationView = view === 'clarification'
  const { prescriptionId } = useParams()
  const navigate = useNavigate()
  const token = useSyncExternalStore(subscribeToPharmacistSession, getPharmacistAccessToken)
  const [attempt, setAttempt] = useState(0)
  const [snapshot, setSnapshot] = useState(null)
  const [confirmation, setConfirmation] = useState(null)
  const closeConfirmation = useCallback(() => setConfirmation(null), [])
  const [clarification, setClarification] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const closeClarification = useCallback((refresh = false) => {
    setClarification(null)
    if (refresh) setAttempt(current => current + 1)
  }, [])
  const checked = snapshot?.token === token && snapshot?.attempt === attempt && snapshot?.prescriptionId === prescriptionId && snapshot?.view === view
  const loading = !checked
  const error = checked ? snapshot.error : ''
  const data = checked && !error ? snapshot.data : null
  const patient = data?.patient
  const prescription = data?.prescription
  const canRequestClarification = ['pending', 'active', 'clarified'].includes(prescription?.status)

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const load = clarificationView ? getPharmacistClarificationDetails : getPharmacistPrescriptionDetails
    load(prescriptionId, controller.signal).then(data => {
      if (!controller.signal.aborted && getPharmacistAccessToken() === token) setSnapshot({ token, attempt, prescriptionId, view, data })
    }).catch(error => {
      if (!controller.signal.aborted && error.name !== 'AbortError' && getPharmacistAccessToken() === token) setSnapshot({ token, attempt, prescriptionId, view, error: error.message })
    })
    return () => controller.abort()
  }, [token, attempt, prescriptionId, view, clarificationView])

  async function submitClarification(values, signal) {
    const result = await requestPharmacistClarification(prescriptionId, patient.id, values, signal)
    if (signal.aborted || getPharmacistAccessToken() !== token) return
    setClarification(null)
    setFeedback({ prescriptionId, token, message: result.message })
    setAttempt(current => current + 1)
  }

  return <>
    <nav aria-label="Breadcrumb" className={`mt-5 flex min-w-0 items-center gap-2 text-sm text-[#7A8190] ${clarificationView ? 'lg:mt-3' : ''}`}>
      <Link to={clarificationView ? '/pharmacist/clarifications' : '/pharmacist/verification-queue'} className="shrink-0 font-medium text-[#475AA2] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/15">{clarificationView ? 'Clarifications' : 'Queue'}</Link>
      <span aria-hidden="true">&gt;</span><span aria-current="page" className="min-w-0 break-words">{patient?.name || 'Prescription details'}</span>
    </nav>
    {feedback?.prescriptionId === prescriptionId && feedback.token === token && <p role="status" className="mt-3 text-sm text-[#2F7D59]">{feedback.message}</p>}
    <div aria-busy={loading}>
      {loading ? <p role="status" className="mt-5 text-sm text-[#7A8190]">{clarificationView ? 'Loading clarification...' : 'Loading prescription...'}</p>
        : error ? <div role="alert" className="mt-5 text-sm text-[#E5484D]"><p>{error}</p><button type="button" onClick={() => setAttempt(current => current + 1)} className="mt-3 rounded-lg px-3 py-2 font-semibold text-[#475AA2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#475AA2]">Try again</button></div> : null}
      {data && <>
        <PharmacistPatientProfile patient={patient} compact={clarificationView} />
        <PharmacistPrescriptionInformation prescription={prescription} compact={clarificationView} />
        {clarificationView ? <ClarificationStatusBanner key={`${prescriptionId}:${attempt}`} clarification={data.clarification} doctorName={prescription.doctorName} /> : <><div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" disabled={!canRequestClarification} onClick={() => { setFeedback(null); setConfirmation(null); setClarification(snapshot) }} aria-haspopup="dialog" aria-describedby={!canRequestClarification ? 'prescription-actions-unavailable' : undefined} className="inline-flex h-9 items-center justify-center rounded-xl bg-[#DEE2F4] px-3 text-[13px] font-semibold text-[#475AA2] hover:bg-[#CCD2FF] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15 disabled:cursor-not-allowed disabled:opacity-50">Request clarification</button>
          <button type="button" onClick={() => setConfirmation(snapshot)} aria-haspopup="dialog" className="inline-flex h-9 items-center justify-center rounded-xl bg-[#475AA2] px-3 text-[13px] font-semibold text-white hover:bg-[#3D4F91] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25">Verify prescription</button>
        </div>
        {!canRequestClarification && <p id="prescription-actions-unavailable" className="mt-2 text-xs text-[#7A8190]">{prescription.status === 'awaiting_clarification' ? 'Clarification has already been requested for this prescription.' : 'Clarification is not available for this prescription status.'}</p>}
        </>}
        <PharmacistMedicationTable key={prescriptionId} records={data.currentMedications} compact={clarificationView} onOpenPrescription={id => navigate(`/pharmacist/verification-queue/${encodeURIComponent(id)}`)} />
        {confirmation === snapshot && <VerifyPrescriptionModal patient={patient} prescription={prescription} onClose={closeConfirmation} />}
        {clarification === snapshot && <RequestClarificationModal patient={patient} onClose={closeClarification} onSubmit={submitClarification} />}
      </>}
    </div>
  </>
}
