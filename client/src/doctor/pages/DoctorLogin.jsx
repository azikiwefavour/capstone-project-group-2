import Login from '../../pages/Login'

function DoctorLogin() {
  return <Login authenticationRole="Doctor" recoveryBasePath="/doctor" />
}

export default DoctorLogin
