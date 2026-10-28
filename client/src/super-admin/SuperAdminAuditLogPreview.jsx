import { Navigate } from 'react-router-dom'
import { SuperAdminAuditLogPage } from './SuperAdminAuditLog.jsx'

export default function SuperAdminAuditLogPreview() {
  if (!import.meta.env.DEV || !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) return <Navigate to="/super-admin/login" replace />
  return <SuperAdminAuditLogPage preview />
}
