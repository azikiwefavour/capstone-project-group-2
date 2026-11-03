import Login from '../pages/Login'
import { authenticateSuperAdmin } from './authentication'

export default function SuperAdminLogin() {
  return <Login
    authenticationRole="Super Admin"
    heading="Super Admin Login"
    onAuthenticate={authenticateSuperAdmin}
    successPath="/super-admin/overview"
    recoveryUnavailable
    accountNotice=""
  />
}
