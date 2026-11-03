import { Navigate } from 'react-router-dom'
import { SuperAdminSystemHealthPage } from './SuperAdminSystemHealth.jsx'

export default function SuperAdminSystemHealthPreview() {
  if (!import.meta.env.DEV || !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) return <Navigate to="/super-admin/login" replace />
  return <SuperAdminSystemHealthPage preview />
}
