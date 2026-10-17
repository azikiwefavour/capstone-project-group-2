import { useNavigate, useParams } from 'react-router-dom'
import AdminHeader from '../../admin/components/AdminHeader'
import DoctorSidebar from '../components/DoctorSidebar'
import DoctorClarificationDetails from '../pages/DoctorClarificationDetails'

import { previewClarification } from './clarificationPreviewData'

// Match the shared Doctor shell without starting or modifying an authentication session.
function PreviewLayout({ children }) {
  const navigate = useNavigate()
  return <main className="min-h-screen bg-white text-[#111827] lg:flex lg:h-screen">
    <DoctorSidebar doctorName="" view="clarifications" basePath="/doctor/preview" onLogout={() => navigate('/doctor/login')} />
    <section className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:min-h-0 lg:overflow-y-auto lg:px-8 lg:py-5 xl:px-10">
      <div className="mx-auto max-w-7xl">
        <AdminHeader adminName="" />
        {children}
        <div className="h-4 lg:hidden" />
      </div>
    </section>
  </main>
}

export default function DoctorClarificationPreview() {
  const { clarificationId } = useParams()
  if (!import.meta.env.DEV || clarificationId !== 'preview') return <DoctorClarificationDetails />

  // The real details component and Modify modal keep saving/confirmation disabled.
  // Opening or reviewing the preview never changes the fixture or sends a request.
  return <DoctorClarificationDetails clarification={previewClarification} Layout={PreviewLayout} clarificationsPath="/doctor/preview/clarifications" />
}
