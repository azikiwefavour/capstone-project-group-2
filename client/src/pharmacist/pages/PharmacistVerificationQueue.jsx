import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPharmacistAccessToken, subscribeToPharmacistSession } from '../../auth/pharmacistSession'
import { getVerificationQueue } from '../prescriptions'
import PrescriptionActions from '../components/PrescriptionActions'

export default function PharmacistVerificationQueue() {
  const navigate = useNavigate()
  const token = useSyncExternalStore(subscribeToPharmacistSession, getPharmacistAccessToken)
  const [attempt, setAttempt] = useState(0)
  const [snapshot, setSnapshot] = useState(null)
  const [openRecord, setOpenRecord] = useState(null)
  const closeActions = useCallback(() => setOpenRecord(null), [])
  const checked = snapshot?.token === token && snapshot?.attempt === attempt
  const loading = !checked
  const error = checked ? snapshot.error : ''
  const records = checked && !error ? snapshot.records : []

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    getVerificationQueue(controller.signal).then(records => {
      if (!controller.signal.aborted && getPharmacistAccessToken() === token) setSnapshot({ token, attempt, records })
    }).catch(error => {
      if (!controller.signal.aborted && error.name !== 'AbortError' && getPharmacistAccessToken() === token) setSnapshot({ token, attempt, error: error.message })
    })
    return () => controller.abort()
  }, [token, attempt])

  return <>
    <section className="mt-4">
      <h1 className="text-2xl font-semibold tracking-normal text-[#111827]">Verification queue</h1>
      <p className="mt-2 text-base leading-relaxed text-[#7A8190]">Oldest first. Open a prescription to review and verify it.</p>
    </section>
    <section aria-label="Prescriptions awaiting verification" aria-busy={loading} className="mt-[22px] overflow-hidden rounded-2xl border border-[#E2E5ED] bg-white shadow-sm shadow-[#111827]/[0.03] lg:flex lg:max-h-[calc(100vh-200px)] lg:flex-col">
      <div className="overflow-x-auto lg:min-h-0 lg:overflow-y-auto">
        <table className="w-full min-w-[800px] border-collapse">
          <thead><tr className="border-b border-[#E2E5ED] bg-[#F7F8FB] text-left text-xs font-medium text-[#52556C]">
            {['Patient', 'Medication', 'Prescribed by', 'Status', 'Date', 'Actions'].map(label => <th key={label} scope="col" className="px-4 py-3">{label}</th>)}
          </tr></thead>
          <tbody>
            {records.map(record => <tr key={record.id} className="border-b border-[#E2E5ED] text-sm text-[#111827] last:border-b-0">
              <td className="max-w-[220px] break-words px-4 py-3 font-medium"><Link to={`/pharmacist/verification-queue/${encodeURIComponent(record.id)}`} className="rounded-sm text-[#475AA2] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#475AA2]">{record.patientName || 'Name unavailable'}</Link></td>
              <td className="max-w-[240px] break-words px-4 py-3"><p className="font-medium">{record.medicationName || 'Medication unavailable'}</p>{record.reason && <p className="mt-1 text-xs leading-5 text-[#7A8190]">{record.reason}</p>}</td>
              <td className="max-w-[220px] break-words px-4 py-3">{record.doctorName || '—'}</td>
              <td className="px-4 py-3"><span className="inline-flex whitespace-nowrap rounded-lg border border-[#F8D6DD] bg-[#FFF1F3] px-2.5 py-1 text-xs font-medium text-[#B83F5C]">Unverified</span></td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-[#7A8190]">{record.timestamp ? <time dateTime={record.timestamp.dateTime}>{record.timestamp.label}</time> : '—'}</td>
              <td className="px-4 py-3"><PrescriptionActions patientName={record.patientName} open={openRecord === record.id} onToggle={() => setOpenRecord(current => current === record.id ? null : record.id)} onClose={closeActions} onReview={() => navigate(`/pharmacist/verification-queue/${encodeURIComponent(record.id)}`)} /></td>
            </tr>)}
            {(loading || error || records.length === 0) && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-[#7A8190]">
              {loading ? <p role="status">Loading prescriptions...</p> : error ? <div role="alert"><p className="text-[#E5484D]">{error}</p><button type="button" onClick={() => setAttempt(current => current + 1)} className="mt-3 rounded-lg px-3 py-2 font-semibold text-[#475AA2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#475AA2]">Try again</button></div> : <p role="status">No prescriptions awaiting verification.</p>}
            </td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </>
}
