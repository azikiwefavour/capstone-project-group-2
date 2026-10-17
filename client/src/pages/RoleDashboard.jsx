import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { setAccessToken } from '../auth/session'

function RoleDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role: routeRole } = useParams()

  const [user] = useState(() => {
    if (location.state?.user) return location.state.user
    try {
      const stored = sessionStorage.getItem('medtrailUser')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const effectiveRole = user?.role || routeRole || 'doctor'
  const roleLower = effectiveRole.toLowerCase()
  const roleTitle = roleLower.charAt(0).toUpperCase() + roleLower.slice(1)
  const isDoctor = roleLower === 'doctor'
  const isPharmacist = roleLower === 'pharmacist'
  const isPatient = roleLower === 'patient'

  const rawName = user?.name || (isDoctor ? 'Dr. User' : isPharmacist ? 'Pharm. User' : 'Patient User')
  const cleanName = rawName.replace(/^(dr\.?|pharm\.?)\s+/i, '')
  const titlePrefix = isDoctor ? 'Dr.' : isPharmacist ? 'Pharm.' : ''
  const welcomeName = titlePrefix ? `${titlePrefix} ${cleanName}` : cleanName

  function handleLogout() {
    setAccessToken(null)
    try {
      sessionStorage.removeItem('medtrailUser')
      sessionStorage.removeItem('medtrailAuthToken')
      sessionStorage.removeItem('medtrailDemoAdminName')
    } catch { /* Storage may be disabled. */ }
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#F6F7FB] text-[#111827]">
      {/* Header */}
      <header className="border-b border-[#E2E5ED] bg-white px-6 py-4 shadow-sm sm:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tracking-tight text-[#475AA2]">
              med<span className="font-normal text-[#111827]">trail</span>
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isDoctor
                  ? 'bg-[#DEE2FF] text-[#475AA2]'
                  : isPharmacist
                  ? 'bg-[#F8D6DD] text-[#B83F5C]'
                  : 'bg-[#D0E7DC] text-[#2F7D59]'
              }`}
            >
              {roleTitle} Portal
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-right">
              <div>
                <p className="text-sm font-semibold text-[#111827]">{welcomeName}</p>
                <p className="text-xs text-[#7A8190]">{user?.email || 'user@medtrail.com'}</p>
              </div>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-white font-semibold text-sm ${
                  isDoctor
                    ? 'bg-[#475AA2]'
                    : isPharmacist
                    ? 'bg-[#B83F5C]'
                    : 'bg-[#2F7D59]'
                }`}
              >
                {cleanName.charAt(0).toUpperCase()}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-[#D8DCE5] px-3.5 py-1.5 text-xs font-semibold text-[#52556C] transition hover:bg-[#F7F8FB] hover:text-[#E5484D]"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8 sm:px-10">
        {/* Welcome Banner */}
        <section className="rounded-3xl bg-gradient-to-r from-[#475AA2] to-[#364782] p-8 text-white shadow-lg shadow-[#475AA2]/15">
          <div className="max-w-2xl">
            <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
              Account Active
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Welcome, {welcomeName}!
            </h1>
            <p className="mt-2 text-base text-blue-100 leading-relaxed">
              {isDoctor &&
                'Your doctor account is verified. You can now issue prescriptions, review audit logs, and monitor medication fulfillment.'}
              {isPharmacist &&
                'Your pharmacist account is verified. You can dispense prescribed medications, verify batches, and update inventory.'}
              {isPatient &&
                'Your patient profile is active. You can track your active prescriptions, dosage schedules, and medication history.'}
            </p>
          </div>
        </section>

        {/* Quick Stats Grid */}
        <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-[#E2E5ED] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#7A8190]">
                  {isDoctor ? 'Prescriptions Written' : isPharmacist ? 'Prescriptions Dispensed' : 'Active Medications'}
                </p>
                <p className="mt-2 text-3xl font-bold text-[#111827]">0</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DEE2FF] text-[#475AA2]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
            </div>
            <p className="mt-4 text-xs font-medium text-[#2F9E44]">● System connected & ready</p>
          </div>

          <div className="rounded-2xl border border-[#E2E5ED] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#7A8190]">
                  {isDoctor ? 'Patients Under Care' : isPharmacist ? 'Pending Refills' : 'Upcoming Reminders'}
                </p>
                <p className="mt-2 text-3xl font-bold text-[#111827]">0</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D0E7DC] text-[#2F7D59]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
            </div>
            <p className="mt-4 text-xs font-medium text-[#7A8190]">All records up to date</p>
          </div>

          <div className="rounded-2xl border border-[#E2E5ED] bg-white p-6 shadow-sm sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#7A8190]">Status</p>
                <p className="mt-2 text-2xl font-bold text-[#2F9E44]">Verified</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F5E9] text-[#2F9E44]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6 w-6">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
            <p className="mt-4 text-xs font-medium text-[#7A8190]">Registered through MedTrail</p>
          </div>
        </section>

        {/* Medication Tracking Feed */}
        <section className="mt-8 rounded-2xl border border-[#E2E5ED] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E2E5ED] pb-4">
            <h3 className="text-lg font-semibold text-[#111827]">Recent Clinical Activities</h3>
            <span className="text-xs font-medium text-[#7A8190]">Real-time Trail</span>
          </div>

          <div className="flex min-h-[200px] flex-col items-center justify-center py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F7F8FB] text-[#7A8190]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 14 14" />
              </svg>
            </div>
            <h4 className="mt-4 text-base font-semibold text-[#111827]">No activity logged yet</h4>
            <p className="mt-1 text-sm text-[#7A8190] max-w-sm">
              Your account has just been configured. As prescriptions and dispensation events occur, they will appear in this trace.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}

export default RoleDashboard
