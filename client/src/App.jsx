import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './admin/AdminLayout'
import SuperAdminLogin from './super-admin/SuperAdminLogin'
import SuperAdminBoundary from './super-admin/SuperAdminBoundary'
import SuperAdminOverview from './super-admin/SuperAdminDashboard'
import SuperAdminFacilities from './super-admin/SuperAdminFacilities.jsx'
import SuperAdminSubscriptions from './super-admin/SuperAdminSubscriptions.jsx'
import SuperAdminPayments from './super-admin/SuperAdminPayments.jsx'
import SuperAdminMessaging from './super-admin/SuperAdminMessaging.jsx'
import SuperAdminSystemHealth from './super-admin/SuperAdminSystemHealth.jsx'
import SuperAdminAuditLog from './super-admin/SuperAdminAuditLog.jsx'
import PatientAuthLayout from './patient/components/PatientAuthLayout'
import PatientLayout from './patient/components/PatientLayout'
import PatientLogin from './patient/pages/PatientLogin'
import PatientCreatePassword from './patient/pages/PatientCreatePassword'
import PatientDashboard from './patient/pages/PatientDashboard'
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
import SelectPlan from './pages/SelectPlan'
import VerifyEmail from './pages/VerifyEmail'
import VerifyResetCode from './pages/VerifyResetCode'
import PharmacistLogin from './pharmacist/pages/PharmacistLogin'
import PharmacistCreatePassword from './pharmacist/pages/PharmacistCreatePassword'
import PharmacistLayout from './pharmacist/components/PharmacistLayout'

const PharmacistDashboard = lazy(() => import('./pharmacist/pages/PharmacistDashboard'))
const PharmacistVerificationQueue = lazy(() => import('./pharmacist/pages/PharmacistVerificationQueue'))
const PharmacistPrescriptionDetails = lazy(() => import('./pharmacist/pages/PharmacistPrescriptionDetails'))
const PharmacistClarifications = lazy(() => import('./pharmacist/pages/PharmacistClarifications'))
const PharmacistDispensationHistory = lazy(() => import('./pharmacist/pages/PharmacistDispensationHistory'))

const SuperAdminAuditLogPreview = import.meta.env.DEV
  ? lazy(() => import('./super-admin/SuperAdminAuditLogPreview.jsx'))
  : null

const SuperAdminSystemHealthPreview = import.meta.env.DEV
  ? lazy(() => import('./super-admin/SuperAdminSystemHealthPreview.jsx'))
  : null

const SuperAdminMessagingPreview = import.meta.env.DEV
  ? lazy(() => import('./super-admin/SuperAdminMessagingPreview.jsx'))
  : null

const SuperAdminPaymentsPreview = import.meta.env.DEV
  ? lazy(() => import('./super-admin/SuperAdminPaymentsPreview.jsx'))
  : null

const SuperAdminSubscriptionsPreview = import.meta.env.DEV
  ? lazy(() => import('./super-admin/SuperAdminSubscriptionsPreview.jsx'))
  : null

const SuperAdminFacilitiesPreview = import.meta.env.DEV
  ? lazy(() => import('./super-admin/SuperAdminFacilitiesPreview.jsx'))
  : null

const SuperAdminDashboardPreview = import.meta.env.DEV
  ? lazy(() => import('./super-admin/SuperAdminDashboardPreview'))
  : null

const PatientDashboardPreview = import.meta.env.DEV
  ? lazy(() => import('./patient/previews/PatientDashboardPreview'))
  : null

const PharmacistNewPasswordPreview = import.meta.env.DEV
  ? lazy(() => import('./pharmacist/previews/PharmacistNewPasswordPreview'))
  : null

const DoctorPatientPreview = import.meta.env.DEV
  ? lazy(() => import('./doctor/previews/DoctorPatientPreview'))
  : null

const DoctorClarificationPreview = import.meta.env.DEV
  ? lazy(() => import('./doctor/previews/DoctorClarificationPreview'))
  : null

const DoctorFlowPreview = import.meta.env.DEV
  ? lazy(() => import('./doctor/previews/DoctorFlowPreview'))
  : null

const HospitalInvitationEmailPreview = import.meta.env.DEV
  ? lazy(() => import('./emails/previews/HospitalInvitationEmailPreview'))
  : null

const EmailVerificationEmailPreview = import.meta.env.DEV
  ? lazy(() => import('./emails/previews/EmailVerificationEmailPreview'))
  : null

const ResetPasswordEmailPreview = import.meta.env.DEV
  ? lazy(() => import('./emails/previews/ResetPasswordEmailPreview'))
  : null

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        {import.meta.env.DEV && <Route path="/email-preview/hospital-invitation" element={<Suspense fallback={<p role="status" className="p-5 text-sm text-[#7A8190]">Loading email preview...</p>}><HospitalInvitationEmailPreview /></Suspense>} />}
        {import.meta.env.DEV && <Route path="/email-preview/email-verification" element={<Suspense fallback={<p role="status" className="p-5 text-sm text-[#7A8190]">Loading email preview...</p>}><EmailVerificationEmailPreview /></Suspense>} />}
        {import.meta.env.DEV && <Route path="/email-preview/reset-password" element={<Suspense fallback={<p role="status" className="p-5 text-sm text-[#7A8190]">Loading email preview...</p>}><ResetPasswordEmailPreview /></Suspense>} />}
        <Route path="/create-account" element={<CreateAccount />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/select-role" element={<RoleSelection />} />
        <Route path="/select-plan" element={<SelectPlan />} />
        <Route path="/login" element={<Login />} />
        <Route path="/super-admin/login" element={<SuperAdminLogin />} />
        {import.meta.env.DEV && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) && <Route path="/super-admin/preview/overview" element={<Suspense fallback={<p role="status">Loading design preview...</p>}><SuperAdminDashboardPreview /></Suspense>} />}
        {import.meta.env.DEV && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) && <Route path="/super-admin/preview/facilities" element={<Suspense fallback={<p role="status">Loading facilities preview...</p>}><SuperAdminFacilitiesPreview /></Suspense>} />}
        {import.meta.env.DEV && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) && <Route path="/super-admin/preview/subscriptions" element={<Suspense fallback={<p role="status">Loading subscriptions preview...</p>}><SuperAdminSubscriptionsPreview /></Suspense>} />}
        {import.meta.env.DEV && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) && <Route path="/super-admin/preview/payments" element={<Suspense fallback={<p role="status">Loading payments preview...</p>}><SuperAdminPaymentsPreview /></Suspense>} />}
        {import.meta.env.DEV && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) && <Route path="/super-admin/preview/messaging" element={<Suspense fallback={<p role="status">Loading messaging preview...</p>}><SuperAdminMessagingPreview /></Suspense>} />}
        {import.meta.env.DEV && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) && <Route path="/super-admin/preview/system-health" element={<Suspense fallback={<p role="status">Loading system health preview...</p>}><SuperAdminSystemHealthPreview /></Suspense>} />}
        {import.meta.env.DEV && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) && <Route path="/super-admin/preview/audit-log" element={<Suspense fallback={<p role="status">Loading audit log preview...</p>}><SuperAdminAuditLogPreview /></Suspense>} />}
        <Route path="/super-admin" element={<SuperAdminBoundary />}>
          <Route index element={<Navigate to="/super-admin/overview" replace />} />
          <Route path="overview" element={<SuperAdminOverview />} />
          <Route path="facilities" element={<SuperAdminFacilities />} />
          <Route path="subscriptions" element={<SuperAdminSubscriptions />} />
          <Route path="payments" element={<SuperAdminPayments />} />
          <Route path="messaging" element={<SuperAdminMessaging />} />
          <Route path="system-health" element={<SuperAdminSystemHealth />} />
          <Route path="audit-log" element={<SuperAdminAuditLog />} />
          <Route path="dashboard" element={<Navigate to="/super-admin/overview" replace />} />
          <Route path="*" element={<Navigate to="/super-admin/login" replace />} />
        </Route>
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-reset-code" element={<VerifyResetCode />} />
        <Route path="/new-password" element={<NewPassword />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        {import.meta.env.DEV && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) && <Route path="/patient/preview/dashboard" element={<Suspense fallback={<p role="status" className="p-5 text-sm text-[#7A8190]">Loading design preview...</p>}><PatientDashboardPreview /></Suspense>} />}
        {import.meta.env.DEV && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) && <Route path="/patient/preview/diagnoses-pagination" element={<Suspense fallback={<p role="status" className="p-5 text-sm text-[#7A8190]">Loading pagination preview...</p>}><PatientDashboardPreview key="pagination-preview" paginationPreview /></Suspense>} />}
        <Route path="/patient" element={<PatientAuthLayout />}>
          <Route path="login" element={<PatientLogin />} />
          <Route path="create-password" element={<PatientCreatePassword />} />
          <Route path="verify-email" element={<VerifyEmail successPath="/patient/login" backPath="/patient/login" allowResend resendSuccessMessage="Your request was accepted. Check your inbox for a verification code." />} />
          <Route path="forgot-password" element={<ForgotPassword recoveryBasePath="/patient" />} />
          <Route path="verify-reset-code" element={<VerifyResetCode recoveryBasePath="/patient" />} />
          <Route path="new-password" element={<NewPassword recoveryBasePath="/patient" />} />
        </Route>
        <Route path="/patient" element={<PatientLayout />}>
          <Route index element={<Navigate to="/patient/dashboard" replace />} />
          <Route path="dashboard" element={<PatientDashboard />} />
        </Route>
        <Route path="/pharmacist/login" element={<PharmacistLogin />} />
        <Route path="/pharmacist/create-password" element={<PharmacistCreatePassword />} />
        <Route path="/pharmacist/verify-email" element={<VerifyEmail successPath="/pharmacist/login" backPath="/pharmacist/login" allowResend />} />
        <Route path="/pharmacist/forgot-password" element={<ForgotPassword recoveryBasePath="/pharmacist" />} />
        <Route path="/pharmacist/verify-reset-code" element={<VerifyResetCode recoveryBasePath="/pharmacist" />} />
        <Route path="/pharmacist/new-password" element={<NewPassword recoveryBasePath="/pharmacist" />} />
        {import.meta.env.DEV && <Route path="/pharmacist/preview/new-password" element={<Suspense fallback={<p role="status" className="p-5 text-sm text-[#7A8190]">Loading design preview...</p>}><PharmacistNewPasswordPreview /></Suspense>} />}
        <Route path="/pharmacist" element={<PharmacistLayout />}>
          <Route index element={<Navigate to="/pharmacist/dashboard" replace />} />
          <Route path="dashboard" element={<Suspense fallback={<p role="status" className="p-5 text-sm text-[#7A8190]">Loading dashboard...</p>}><PharmacistDashboard /></Suspense>} />
          <Route path="verification-queue" element={<Suspense fallback={<p role="status" className="p-5 text-sm text-[#7A8190]">Loading prescriptions...</p>}><PharmacistVerificationQueue /></Suspense>} />
          <Route path="verification-queue/:prescriptionId" element={<Suspense fallback={<p role="status" className="p-5 text-sm text-[#7A8190]">Loading prescription...</p>}><PharmacistPrescriptionDetails /></Suspense>} />
          <Route path="clarifications" element={<Suspense fallback={<p role="status" className="p-5 text-sm text-[#7A8190]">Loading clarifications...</p>}><PharmacistClarifications /></Suspense>} />
          <Route path="clarifications/:prescriptionId" element={<Suspense fallback={<p role="status" className="p-5 text-sm text-[#7A8190]">Loading clarification...</p>}><PharmacistPrescriptionDetails view="clarification" /></Suspense>} />
          <Route path="dispensed-medication" element={<Suspense fallback={<p role="status" className="p-5 text-sm text-[#7A8190]">Loading dispensed medications...</p>}><PharmacistDispensationHistory /></Suspense>} />
        </Route>
        <Route path="/doctor/create-password" element={<DoctorCreatePassword />} />
        <Route path="/doctor/login" element={<DoctorLogin />} />
        <Route path="/doctor/verify-email" element={<VerifyEmail successPath="/doctor/login" />} />
        <Route path="/doctor/forgot-password" element={<ForgotPassword recoveryBasePath="/doctor" />} />
        <Route path="/doctor/verify-reset-code" element={<VerifyResetCode recoveryBasePath="/doctor" />} />
        <Route path="/doctor/new-password" element={<NewPassword recoveryBasePath="/doctor" />} />
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
