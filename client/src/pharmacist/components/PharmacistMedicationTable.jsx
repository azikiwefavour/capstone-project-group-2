import { useCallback, useState } from 'react'
import PrescriptionActions from './PrescriptionActions'

export default function PharmacistMedicationTable({ records, onOpenPrescription, compact = false }) {
  const cellSpacing = compact ? 'lg:py-1.5' : ''
  const [openRecord, setOpenRecord] = useState(null)
  const closeActions = useCallback(() => setOpenRecord(null), [])
  return <section aria-labelledby="current-medications-title" className={`mt-[22px] ${compact ? 'lg:mt-3' : ''}`}>
    <h2 id="current-medications-title" className={`text-base font-semibold text-[#111827] ${compact ? 'lg:text-sm' : ''}`}>Current medications</h2>
    <div className={`mt-4 overflow-hidden rounded-2xl border border-[#E2E5ED] bg-white shadow-sm shadow-[#111827]/[0.03] ${compact ? 'lg:mt-2' : ''}`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] border-collapse">
          <thead><tr className="border-b border-[#E2E5ED] bg-[#F7F8FB] text-left text-xs font-medium text-[#52556C]">
            {['Medication', 'Dose and frequency', 'Duration', 'Prescribed by', 'Status', 'Date', 'Actions'].map(label => <th key={label} scope="col" className={`px-4 py-3 ${compact ? 'lg:py-2' : ''}`}>{label}</th>)}
          </tr></thead>
          <tbody>
            {records?.map(record => {
              const isActive = record.status === 'active' || record.status === 'dispensed'
              return <tr key={record.id} className={`border-b border-[#E2E5ED] text-sm text-[#111827] last:border-b-0 ${compact ? 'lg:text-[13px]' : ''}`}>
                <td className={`max-w-[220px] break-words px-4 py-3 ${cellSpacing}`}><p className="font-medium">{record.medicationName || 'Medication unavailable'}</p>{record.reason && <p className="mt-1 text-xs text-[#7A8190]">{record.reason}</p>}</td>
                <td className={`max-w-[200px] break-words px-4 py-3 ${cellSpacing}`}>{record.dosage || record.frequency ? <><p>{record.dosage || '—'}</p><p className="mt-1 text-xs text-[#7A8190]">{record.frequency || '—'}</p></> : record.doseAndFrequency || '—'}</td>
                <td className={`max-w-[180px] break-words px-4 py-3 ${cellSpacing}`}>{record.duration || '—'}</td>
                <td className={`max-w-[220px] break-words px-4 py-3 ${cellSpacing}`}>{record.doctorName || '—'}</td>
                <td className={`px-4 py-3 ${cellSpacing}`}><span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-medium ${isActive ? 'border-[#D0E7DC] bg-[#EDF7F0] text-[#2F7D59]' : 'border-[#F8D6DD] bg-[#FFF1F3] text-[#B83F5C]'}`}><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-[#2F7D59]' : 'bg-[#B83F5C]'}`} />{isActive ? 'Active' : 'Unverified'}</span></td>
                <td className={`whitespace-nowrap px-4 py-3 text-xs text-[#7A8190] ${cellSpacing}`}>{record.timestamp ? <time dateTime={record.timestamp.dateTime}>{record.timestamp.label}</time> : '—'}</td>
                <td className={`px-4 py-3 ${cellSpacing}`}><PrescriptionActions label={`Medication actions for ${record.medicationName || 'unnamed medication'}`} open={openRecord === record.id} onToggle={() => setOpenRecord(current => current === record.id ? null : record.id)} onClose={closeActions} onReview={() => onOpenPrescription(record.id)} /></td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
      {(!records || records.length === 0) && <p role="status" className={`px-5 py-12 text-center text-sm text-[#7A8190] ${compact ? 'lg:py-6' : ''}`}>{records ? 'No current medications available.' : 'Current medications are unavailable because the patient identity is missing.'}</p>}
    </div>
  </section>
}
