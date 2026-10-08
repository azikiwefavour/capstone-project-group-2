import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import CreateAccount from './pages/CreateAccount'
import ForgotPassword from './pages/ForgotPassword'
import Login from './pages/Login'
import NewPassword from './pages/NewPassword'
import RoleSelection from './pages/RoleSelection'
import VerifyEmail from './pages/VerifyEmail'
import VerifyResetCode from './pages/VerifyResetCode'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/create-account" replace />} />
        <Route path="/create-account" element={<CreateAccount />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/select-role" element={<RoleSelection />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-reset-code" element={<VerifyResetCode />} />
        <Route path="/new-password" element={<NewPassword />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
