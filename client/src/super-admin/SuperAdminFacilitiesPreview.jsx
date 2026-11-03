import { Navigate } from 'react-router-dom'
import { SuperAdminFacilitiesPage } from './SuperAdminFacilities.jsx'

export default function SuperAdminFacilitiesPreview() {
  if (!import.meta.env.DEV || !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) return <Navigate to="/super-admin/login" replace />
  return <SuperAdminFacilitiesPage preview />
}
