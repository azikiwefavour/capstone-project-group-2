import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
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

  // Group multiple prescriptions for the same patient into a single patient row
  const groupedPatients = useMemo(() => {
    const groups = new Map()
    for (const record of records) {
      const key = (record.patientId || record.patientName || record.id).trim()
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          id: record.id,
          patientId: record.patientId,
          patientName: record.patientName || 'Name unavailable',
          doctorName: record.doctorName || '—',
          timestamp: record.timestamp,
          medications: [],
        })
      }
      const group = groups.get(key)
      group.medications.push(record)
      if (!group.doctorName || group.doctorName === '—') group.doctorName = record.doctorName
      if (!group.timestamp && record.timestamp) group.timestamp = record.timestamp
    }
    return Array.from(groups.values())
  }, [records])

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
      <p className="mt-2 text-base leading-relaxed text-[#7A8190]">Oldest first. Open a patient to review and verify their prescribed medications.</p>
    </section>
    <section aria-label="Prescriptions awaiting verification" aria-busy={loading} className="mt-[22px] overflow-hidden rounded-2xl border border-[#E2E5ED] bg-white shadow-sm shadow-[#111827]/[0.03] lg:flex lg:max-h-[calc(100vh-200px)] lg:flex-col">
      <div className="overflow-x-auto lg:min-h-0 lg:overflow-y-auto">
        <table className="w-full min-w-[800px] border-collapse">
          <thead><tr className="border-b border-[#E2E5ED] bg-[#F7F8FB] text-left text-xs font-medium text-[#52556C]">
            {['Patient', 'Medications', 'Prescribed by', 'Status', 'Date', 'Actions'].map(label => <th key={label} scope="col" className="px-4 py-3">{label}</th>)}
          </tr></thead>
          <tbody>
            {groupedPatients.map(group => <tr key={group.key} className="border-b border-[#E2E5ED] text-sm text-[#111827] last:border-b-0 hover:bg-[#FAFBFD]">
              <td className="max-w-[220px] break-words px-4 py-3 font-medium">
                <Link to={`/pharmacist/verification-queue/${encodeURIComponent(group.id)}`} className="rounded-sm text-[#475AA2] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#475AA2]">
                  {group.patientName}
                </Link>
                {group.medications.length > 1 && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-[#EBF0FF] px-2 py-0.5 text-xs font-semibold text-[#475AA2]">
                    {group.medications.length} drugs
                  </span>
                )}
              </td>
              <td className="max-w-[280px] break-words px-4 py-3">
                {group.medications.length === 1 ? (
                  <>
                    <p className="font-medium text-[#111827]">{group.medications[0].medicationName || 'Medication unavailable'}</p>
                    {group.medications[0].reason && <p className="mt-0.5 text-xs leading-5 text-[#7A8190]">{group.medications[0].reason}</p>}
                  </>
                ) : (
                  <div className="space-y-1.5">
                    {group.medications.map((med, idx) => (
                      <div key={med.id || idx} className="text-xs">
                        <span className="font-semibold text-[#111827]">• {med.medicationName || 'Medication'}</span>
                        {med.dosage && <span className="ml-1 text-[#52556C]">({med.dosage})</span>}
                        {med.reason && <span className="ml-1 text-[#7A8190]">— {med.reason}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </td>
              <td className="max-w-[220px] break-words px-4 py-3">{group.doctorName || '—'}</td>
              <td className="px-4 py-3">
                <span className="inline-flex whitespace-nowrap rounded-lg border border-[#F8D6DD] bg-[#FFF1F3] px-2.5 py-1 text-xs font-medium text-[#B83F5C]">
                  Unverified {group.medications.length > 1 ? `(${group.medications.length})` : ''}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-[#7A8190]">{group.timestamp ? <time dateTime={group.timestamp.dateTime}>{group.timestamp.label}</time> : '—'}</td>
              <td className="px-4 py-3">
                <PrescriptionActions
                  patientName={group.patientName}
                  open={openRecord === group.id}
                  onToggle={() => setOpenRecord(current => current === group.id ? null : group.id)}
                  onClose={closeActions}
                  onReview={() => navigate(`/pharmacist/verification-queue/${encodeURIComponent(group.id)}`)}
                />
              </td>
            </tr>)}
            {(loading || error || groupedPatients.length === 0) && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-[#7A8190]">
              {loading ? <p role="status">Loading prescriptions...</p> : error ? <div role="alert"><p className="text-[#E5484D]">{error}</p><button type="button" onClick={() => setAttempt(current => current + 1)} className="mt-3 rounded-lg px-3 py-2 font-semibold text-[#475AA2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#475AA2]">Try again</button></div> : <p role="status">No prescriptions awaiting verification.</p>}
            </td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </>
}
