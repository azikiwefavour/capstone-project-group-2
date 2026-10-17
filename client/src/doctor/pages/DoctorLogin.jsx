import Login from '../../pages/Login'
import { loginDoctor } from '../../auth/doctorSession'

function DoctorLogin() {
  return <Login authenticationRole="Doctor" recoveryBasePath="/doctor" onAuthenticate={loginDoctor} />
}

export default DoctorLogin
