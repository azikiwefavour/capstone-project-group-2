import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import AdminHeader from '../../admin/components/AdminHeader'
import DoctorSidebar from '../components/DoctorSidebar'
import DoctorPatientDetails from '../pages/DoctorPatientDetails'
import AddMedicationModal from '../components/AddMedicationModal'

import { duplicatePreviewValues, previewPatient, previewDiscontinuationTimestamps } from './patientPreviewData'

// This isolated visual shell never starts or changes a Doctor authentication session.
function PreviewLayout({ children }) {
  const navigate = useNavigate()
  return (
    <main className="min-h-screen bg-[#F6F7FB] text-[#111827] lg:flex lg:h-screen">
      <DoctorSidebar doctorName="" view="patients" basePath="/doctor/preview" onLogout={() => navigate('/doctor/login')} />
      <section className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:min-h-0 lg:overflow-y-auto lg:px-8 lg:py-5 xl:px-10">
        <div className="mx-auto max-w-7xl">
          <AdminHeader adminName="" />
          {children}
          <div className="h-4 lg:hidden" />
        </div>
      </section>
    </main>
  )
}

function DoctorPatientPreview() {
  const { patientId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  if (!import.meta.env.DEV || patientId !== 'preview') return <DoctorPatientDetails />

  function closeDuplicatePreview() {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('modal')
    setSearchParams(nextParams, { replace: true })
  }

  return <>
    <DoctorPatientDetails patient={previewPatient} Layout={PreviewLayout} patientsPath="/doctor/preview/patients" getDiscontinuationTimestamp={(medication) => previewDiscontinuationTimestamps[medication.id]} />
    <button type="button" onClick={() => setSearchParams({ modal: 'duplicate' })} className="fixed bottom-4 right-4 z-40 h-9 rounded-lg border border-[#D8DCE5] bg-white px-3 text-sm font-medium text-[#475AA2] shadow-sm focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15">Preview duplicate warning</button>
    {searchParams.get('modal') === 'duplicate' && <AddMedicationModal patient={{ ...previewPatient, name: `${previewPatient.name} (preview)` }} onClose={closeDuplicatePreview} developmentPreviewValues={duplicatePreviewValues} />}
  </>
}

export default DoctorPatientPreview
