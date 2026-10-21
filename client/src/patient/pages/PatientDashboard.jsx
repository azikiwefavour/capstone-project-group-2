import { useOutletContext } from 'react-router-dom'
import PatientDashboardContent from '../components/PatientDashboardContent'

export default function PatientDashboard() {
  const { patientName } = useOutletContext()

  // origin/main declares Patient clinical APIs. Integration is deliberately
  // deferred pending contract review; unavailable data is not a verified empty list.
  return <PatientDashboardContent patientName={patientName} />
}
