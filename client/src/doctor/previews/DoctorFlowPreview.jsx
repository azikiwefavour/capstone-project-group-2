import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import AdminHeader from '../../admin/components/AdminHeader'
import DoctorSidebar from '../components/DoctorSidebar'
import DoctorDashboard from '../pages/DoctorDashboard'
import DoctorPatients from '../pages/DoctorPatients'
import DoctorClarifications from '../pages/DoctorClarifications'
import DoctorPatientDetails, { DoctorPatientRoutes } from '../pages/DoctorPatientDetails'
import DoctorClarificationDetails from '../pages/DoctorClarificationDetails'
import DoctorClarificationRoutes from '../components/DoctorClarificationRoutes'
import { previewPatient, previewDiscontinuationTimestamps } from './patientPreviewData'
import { previewClarification } from './clarificationPreviewData'

// Visual-only layout. Never create a session, accept credentials, or authorize APIs.
// The route and this lazy module are removed entirely from production builds.
function PreviewLayout({ view, background = 'default', children }) {
  const navigate = useNavigate()
  return <main className={`min-h-screen ${background === 'white' ? 'bg-white' : 'bg-[#F6F7FB]'} text-[#111827] lg:flex lg:h-screen`}>
    <DoctorSidebar doctorName="" view={view} basePath="/doctor/preview" onLogout={() => navigate('/doctor/login')} />
    <section className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:min-h-0 lg:overflow-y-auto lg:px-8 lg:py-5 xl:px-10">
      <div className="mx-auto max-w-7xl">
        <AdminHeader adminName="" />
        {children}
        <div className="h-4 lg:hidden" />
      </div>
    </section>
  </main>
}

export default function DoctorFlowPreview() {
  if (!import.meta.env.DEV) return <Navigate to="/doctor/login" replace />
  return <>
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<DoctorDashboard Layout={PreviewLayout} patientsPath="/doctor/preview/patients" />} />
      <Route path="patients" element={<DoctorPatientRoutes />}>
        <Route index element={<DoctorPatients Layout={PreviewLayout} patients={[previewPatient]} basePath="/doctor/preview" />} />
        <Route path=":patientId" element={<DoctorPatientDetails Layout={PreviewLayout} patient={previewPatient} patientsPath="/doctor/preview/patients" getDiscontinuationTimestamp={medication => previewDiscontinuationTimestamps[medication.id]} />} />
      </Route>
      <Route path="clarifications" element={<DoctorClarificationRoutes />}>
        <Route index element={<DoctorClarifications Layout={PreviewLayout} clarifications={[previewClarification]} basePath="/doctor/preview" />} />
        <Route path=":clarificationId" element={<DoctorClarificationDetails Layout={PreviewLayout} clarification={previewClarification} clarificationsPath="/doctor/preview/clarifications" />} />
      </Route>
      <Route path="*" element={<Navigate to="/doctor/preview/dashboard" replace />} />
    </Routes>
    <aside aria-label="Development preview" className="fixed bottom-3 right-3 z-40 max-w-[calc(100vw-24px)] rounded-lg border border-[#D8DCE5] bg-white px-3 py-2 text-xs text-[#52556C] shadow-sm">
      <p className="font-semibold">Development preview - Not authenticated</p>
      <nav aria-label="Details previews" className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
        <Link to={`/doctor/preview/patients/${encodeURIComponent(previewPatient.id)}`} className="text-[#475AA2] underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#475AA2]">Patient details</Link>
        <Link to={`/doctor/preview/clarifications/${encodeURIComponent(previewClarification.id)}`} className="text-[#475AA2] underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#475AA2]">Clarification details</Link>
      </nav>
    </aside>
  </>
}
