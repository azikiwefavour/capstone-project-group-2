import { Navigate } from 'react-router-dom'
import { SuperAdminDashboard } from './SuperAdminDashboard'

export default function SuperAdminDashboardPreview() {
  if (!import.meta.env.DEV || !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) {
    return <Navigate to="/super-admin/login" replace />
  }
  // Preview layout only. The same unavailable-data defaults as the protected page.
  return <SuperAdminDashboard preview />
}
