import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './admin/AdminLayout'
import AdminAuditLog from './admin/pages/AdminAuditLog'
import AdminDashboard from './admin/pages/AdminDashboard'
import AdminUsers from './admin/pages/AdminUsers'
import DoctorCreatePassword from './doctor/pages/DoctorCreatePassword'
import DoctorLogin from './doctor/pages/DoctorLogin'
import DoctorDashboardPlaceholder from './doctor/pages/DoctorDashboardPlaceholder'
import AcceptInvite from './pages/AcceptInvite'
import CreateAccount from './pages/CreateAccount'
import ForgotPassword from './pages/ForgotPassword'
import Login from './pages/Login'
import LandingPage from './pages/LandingPage'
import NewPassword from './pages/NewPassword'
import RoleDashboard from './pages/RoleDashboard'
import RoleSelection from './pages/RoleSelection'
import VerifyEmail from './pages/VerifyEmail'
import VerifyResetCode from './pages/VerifyResetCode'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/create-account" element={<CreateAccount />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/select-role" element={<RoleSelection />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-reset-code" element={<VerifyResetCode />} />
        <Route path="/new-password" element={<NewPassword />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/doctor/create-password" element={<DoctorCreatePassword />} />
        <Route path="/doctor/login" element={<DoctorLogin />} />
        <Route path="/doctor/verify-email" element={<VerifyEmail frontendOnly />} />
        <Route path="/doctor/forgot-password" element={<ForgotPassword recoveryBasePath="/doctor" frontendOnly />} />
        <Route path="/doctor/verify-reset-code" element={<VerifyResetCode recoveryBasePath="/doctor" frontendOnly />} />
        <Route path="/doctor/new-password" element={<NewPassword recoveryBasePath="/doctor" frontendOnly />} />
        <Route path="/doctor/dashboard" element={<DoctorDashboardPlaceholder />} />
        <Route path="/:role/dashboard" element={<RoleDashboard />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="audit-log" element={<AdminAuditLog />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
