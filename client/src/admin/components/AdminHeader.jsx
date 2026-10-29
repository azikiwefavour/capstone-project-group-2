import { useContext, useState } from 'react'
import SettingsProfileContext from '../../auth/SettingsProfileContext'
import SettingsModal from '../../components/SettingsModal'

function IconButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2E5ED] bg-white text-[#52556C] transition hover:bg-[#F7F8FB] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15 dark:border-[#2C3852] dark:bg-[#161F30] dark:text-[#94A3B8] dark:hover:bg-[#1E293B]"
    >
      {children}
    </button>
  )
}

function AdminHeader({ adminName }) {
  const profile = useContext(SettingsProfileContext)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const effectiveProfile = profile || { name: adminName || 'Adekemi', email: 'superadmin@medtrail.ng' }

  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
        {adminName ? `Welcome, ${adminName}` : 'Welcome'}
      </p>
      <div className="flex items-center justify-end gap-2.5">
        <IconButton label="Open settings" onClick={() => setSettingsOpen(true)}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
            <path
              d="M12 15.5C13.93 15.5 15.5 13.93 15.5 12C15.5 10.07 13.93 8.5 12 8.5C10.07 8.5 8.5 10.07 8.5 12C8.5 13.93 10.07 15.5 12 15.5Z"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M19 12C19 11.55 18.96 11.11 18.88 10.69L21 9.05L19 5.59L16.5 6.6C15.82 6.08 15.05 5.68 14.2 5.43L13.85 2.75H9.85L9.5 5.43C8.65 5.68 7.88 6.08 7.2 6.6L4.7 5.59L2.7 9.05L4.82 10.69C4.74 11.11 4.7 11.55 4.7 12C4.7 12.45 4.74 12.89 4.82 13.31L2.7 14.95L4.7 18.41L7.2 17.4C7.88 17.92 8.65 18.32 9.5 18.57L9.85 21.25H13.85L14.2 18.57C15.05 18.32 15.82 17.92 16.5 17.4L19 18.41L21 14.95L18.88 13.31C18.96 12.89 19 12.45 19 12Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </IconButton>
        <div aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-[#475AA2] to-[#7B8ED8] text-sm font-bold text-white shadow-xs">
          {adminName ? adminName.charAt(0).toUpperCase() : 'S'}
        </div>
      </div>
      {settingsOpen && <SettingsModal profile={effectiveProfile} onClose={() => setSettingsOpen(false)} />}
    </header>
  )
}

export default AdminHeader
