import { useOutletContext } from 'react-router-dom'
import PatientDashboardContent from '../components/PatientDashboardContent'

export default function PatientDashboard() {
  const { patientName } = useOutletContext()

  // No Patient-scoped prescription/diagnosis reads exist in the current backend.
  // Unavailable records must not appear as successfully loaded empty lists.
  return <PatientDashboardContent patientName={patientName} />
}
