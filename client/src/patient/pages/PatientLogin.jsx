import Login from '../../pages/Login'
import { loginPatient } from '../../auth/patientSession'

export default function PatientLogin() {
  return <Login authenticationRole="Patient" recoveryBasePath="/patient" onAuthenticate={loginPatient} successPath="/patient/dashboard" invitationOnly />
}
