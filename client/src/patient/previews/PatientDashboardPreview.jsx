import { useState } from 'react'
import MedTrailLogo from '../../admin/components/MedTrailLogo'
import LogoutConfirmationModal from '../../components/LogoutConfirmationModal'
import DoctorIcon from '../../doctor/components/DoctorIcon'
import PatientDashboardContent from '../components/PatientDashboardContent'

// Entire module is lazy-loaded only in local development, never in production.
// Empty visual state only. No API calls, session reads/writes or auth bypass.
const prescriptions = []
const diagnoses = []

// Temporary visual fixtures belong only to the separate pagination preview.
const paginationDiagnoses = Array.from({ length: 25 }, (_, index) => ({
  id: `local-pagination-test-${index + 1}`,
  diagnosis: `Test diagnosis ${String(index + 1).padStart(2, '0')}`,
  firstRecorded: '2026-10-01',
  treatedWith: index < 12 ? 'Test group Alpha' : 'Test group Beta',
  status: 'Test status',
}))

export default function PatientDashboardPreview({ paginationPreview = false }) {
  const [logoutOpen, setLogoutOpen] = useState(false)
  if (!import.meta.env.DEV || !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) return null

  return <main className="min-h-screen bg-[#F6F7FB] text-[#111827] lg:flex lg:min-h-dvh lg:flex-col">
    <header className="bg-[#475AA2] text-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:max-w-[1440px] lg:px-6">
      <MedTrailLogo />
      <button type="button" onClick={() => setLogoutOpen(true)} aria-haspopup="dialog" className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/20"><DoctorIcon type="logout" />Log out</button>
    </div></header>
    {logoutOpen && <LogoutConfirmationModal onClose={() => setLogoutOpen(false)} onConfirm={() => setLogoutOpen(false)} />}
    <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:w-full lg:max-w-[1440px] lg:flex-1 lg:px-6 lg:pt-6 lg:pb-[22px]">
      {paginationPreview && <aside aria-label="Development preview" className="rounded-xl border border-[#DEE2F4] bg-[#EEF0FF] px-3 py-2 text-xs leading-5 text-[#475AA2]">
        <p><span className="font-semibold">Local pagination test — 25 fictitious diagnoses.</span> Visual test records only, not patient data. No API calls, database writes or active login. Search “Alpha” for 12 results.</p>
      </aside>}
      <PatientDashboardContent patientName="Sample Patient (mock)" prescriptions={prescriptions} diagnoses={paginationPreview ? paginationDiagnoses : diagnoses} />
    </div>
  </main>
}
