import { Link, Navigate } from 'react-router-dom'
import { endDoctorPreviewSession, hasDoctorPreviewSession } from '../previewAuth'
import MedTrailLogo from '../../admin/components/MedTrailLogo'

function DoctorDashboardPlaceholder() {
  if (!hasDoctorPreviewSession()) {
    return <Navigate to="/doctor/login" replace />
  }

  return (
    <main className="min-h-screen bg-[#F6F7FB] px-5 py-6 text-[#111827] sm:px-8">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="w-[134px] [&_g]:fill-[#475AA2]"><MedTrailLogo /></div>
        <Link to="/doctor/login" replace onClick={endDoctorPreviewSession} className="rounded-xl border border-[#D8DCE5] bg-white px-4 py-2 text-sm font-semibold text-[#475AA2] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15">
          Log out
        </Link>
      </header>
      <section className="mx-auto mt-12 max-w-7xl">
        <h1 className="text-2xl font-semibold">Doctor Dashboard — Coming Soon</h1>
        <p className="mt-2 text-base text-[#7A8190]">Temporary frontend-only preview. This is a simulated session, not a real authenticated account. Passwords are not saved.</p>
      </section>
    </main>
  )
}

export default DoctorDashboardPlaceholder
