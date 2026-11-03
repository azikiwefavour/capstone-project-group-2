import { Navigate } from 'react-router-dom'
import { SuperAdminSubscriptionsPage } from './SuperAdminSubscriptions.jsx'


export default function SuperAdminSubscriptionsPreview() {
  if (!import.meta.env.DEV || !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) return <Navigate to="/super-admin/login" replace />
  return <SuperAdminSubscriptionsPage preview />
}
