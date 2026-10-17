import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './admin/AdminLayout'
import AdminAuditLog from './admin/pages/AdminAuditLog'
import AdminDashboard from './admin/pages/AdminDashboard'
import AdminUsers from './admin/pages/AdminUsers'
import DoctorCreatePassword from './doctor/pages/DoctorCreatePassword'
import DoctorLogin from './doctor/pages/DoctorLogin'
import DoctorDashboard from './doctor/pages/DoctorDashboard'
import DoctorPatients from './doctor/pages/DoctorPatients'
import DoctorClarifications from './doctor/pages/DoctorClarifications'
import DoctorClarificationDetails from './doctor/pages/DoctorClarificationDetails'
import DoctorClarificationRoutes from './doctor/components/DoctorClarificationRoutes'
import DoctorPatientDetails, { DoctorPatientRoutes } from './doctor/pages/DoctorPatientDetails'
import AcceptInvite from './pages/AcceptInvite'
import CreateAccount from './pages/CreateAccount'
import ForgotPassword from './pages/ForgotPassword'
import Login from './pages/Login'
import LandingPage from './pages/LandingPage'
import NewPassword from './pages/NewPassword'
import RoleSelection from './pages/RoleSelection'
import VerifyEmail from './pages/VerifyEmail'
import VerifyResetCode from './pages/VerifyResetCode'

const DoctorPatientPreview = import.meta.env.DEV
  ? lazy(() => import('./doctor/previews/DoctorPatientPreview'))
  : null

const DoctorClarificationPreview = import.meta.env.DEV
  ? lazy(() => import('./doctor/previews/DoctorClarificationPreview'))
  : null

const DoctorFlowPreview = import.meta.env.DEV
  ? lazy(() => import('./doctor/previews/DoctorFlowPreview'))
  : null

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
        <Route path="/doctor/verify-email" element={<VerifyEmail successPath="/doctor/login" />} />
        <Route path="/doctor/forgot-password" element={<ForgotPassword recoveryBasePath="/doctor" frontendOnly />} />
        <Route path="/doctor/verify-reset-code" element={<VerifyResetCode recoveryBasePath="/doctor" frontendOnly />} />
        <Route path="/doctor/new-password" element={<NewPassword recoveryBasePath="/doctor" frontendOnly />} />
        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        {import.meta.env.DEV && <Route path="/doctor/preview/*" element={<Suspense fallback={<p role="status" className="p-5 text-sm text-[#7A8190]">Loading development preview...</p>}><DoctorFlowPreview /></Suspense>} />}
        <Route path="/doctor/clarifications" element={<DoctorClarificationRoutes />}>
          <Route index element={<DoctorClarifications />} />
          <Route path=":clarificationId" element={import.meta.env.DEV
            ? <Suspense fallback={<p role="status" className="p-5 text-sm text-[#7A8190]">Loading clarification page...</p>}><DoctorClarificationPreview /></Suspense>
            : <DoctorClarificationDetails />} />
        </Route>
        <Route path="/doctor/patients" element={<DoctorPatientRoutes />}>
          <Route index element={<DoctorPatients />} />
          <Route path=":patientId" element={import.meta.env.DEV
            ? <Suspense fallback={<p role="status" className="p-5 text-sm text-[#7A8190]">Loading patient page...</p>}><DoctorPatientPreview /></Suspense>
            : <DoctorPatientDetails />} />
        </Route>
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
import { lazy, Suspense } from 'react'
