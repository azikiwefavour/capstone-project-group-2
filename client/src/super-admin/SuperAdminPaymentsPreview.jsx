import { Navigate } from 'react-router-dom'
import { SuperAdminPaymentsPage } from './SuperAdminPayments.jsx'

export default function SuperAdminPaymentsPreview() {
  if (!import.meta.env.DEV || !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) return <Navigate to="/super-admin/login" replace />
  return <SuperAdminPaymentsPage preview />
}
