import Login from '../../pages/Login'
import { loginPharmacist } from '../../auth/pharmacistSession'

export default function PharmacistLogin() {
  return <Login authenticationRole="Pharmacist" recoveryBasePath="/pharmacist" onAuthenticate={loginPharmacist} successPath="/pharmacist/dashboard" invitationOnly />
}
