import { Outlet } from 'react-router-dom'
import './patient-auth.css'

export default function PatientAuthLayout() {
  return <div className="patient-auth"><Outlet /></div>
}
