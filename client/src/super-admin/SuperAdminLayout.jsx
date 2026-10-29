import './overview.css'
import { useState } from 'react'
import AdminHeader from '../admin/components/AdminHeader'
import LogoutConfirmationModal from '../components/LogoutConfirmationModal'
import SuperAdminSidebar from './SuperAdminSidebar'
import SettingsProfileContext from '../auth/SettingsProfileContext'
import { ToastProvider } from '../components/ToastNotification'

export default function SuperAdminLayout({ profile, onLogout, preview = false, page = 'overview', children }) {
  const [logoutOpen, setLogoutOpen] = useState(false)
  const name = typeof profile?.name === 'string' ? profile.name.trim() : ''
  const email = typeof profile?.email === 'string' ? profile.email.trim() : 'superadmin@medtrail.ng'
  const canLogout = preview || typeof onLogout === 'function'
  function confirmLogout() {
    setLogoutOpen(false)
    if (!preview) onLogout?.()
  }

  const profileContextValue = {
    name: name || 'Adekemi',
    email: email || 'superadmin@medtrail.ng',
    role: 'super_admin',
  }

  return (
    <ToastProvider>
      <SettingsProfileContext.Provider value={profileContextValue}>
        <main
          data-super-admin-layout
          data-super-admin-facilities={page === 'facilities' ? true : undefined}
          data-super-admin-overview={page === 'overview' ? true : undefined}
          className="min-h-screen bg-[#F6F7FB] text-[#111827] dark:bg-[#0B0F19] dark:text-[#F1F5F9] lg:flex lg:h-screen"
        >
          <SuperAdminSidebar name={name} preview={preview} onLogout={canLogout ? () => setLogoutOpen(true) : undefined} />
          <section
            aria-label={
              page === 'overview'
                ? 'Platform overview content'
                : page === 'subscriptions'
                ? 'Subscriptions content'
                : page === 'payments'
                ? 'Payments content'
                : page === 'messaging'
                ? 'Messaging content'
                : page === 'system-health'
                ? 'System Health content'
                : page === 'audit-log'
                ? 'Audit log content'
                : 'Facilities content'
            }
            className="relative min-w-0 flex-1 px-5 py-6 sm:px-8 lg:min-h-0 lg:overflow-y-auto lg:px-8 lg:py-6 xl:px-10 dark:bg-[#0B0F19]"
          >
            <AdminHeader adminName={name} />
            {preview && (
              <p role="status" className="mt-3 text-xs leading-5 text-[#7A8190] dark:text-[#94A3B8]">
                {page === 'overview'
                  ? 'Local design preview — no active login or platform data. Facility applications and account settings are not connected.'
                  : page === 'subscriptions'
                  ? 'Local design preview — subscription plan configuration only. No active login or subscriber data.'
                  : page === 'payments'
                  ? 'Local design preview — no active login, payment data or gateway connection.'
                  : page === 'messaging'
                  ? 'Local design preview — no active login, messaging data or Termii connection.'
                  : page === 'system-health'
                  ? 'Local design preview — no active login, monitoring data or automatic checks.'
                  : page === 'audit-log'
                  ? 'Local design preview — no active login, audit data or event tracking.'
                  : 'Local design preview — no active login or facility data. Backend integration is not connected.'}
              </p>
            )}
            {children}
          </section>
          {logoutOpen && <LogoutConfirmationModal onClose={() => setLogoutOpen(false)} onConfirm={confirmLogout} />}
        </main>
      </SettingsProfileContext.Provider>
    </ToastProvider>
  )
}
