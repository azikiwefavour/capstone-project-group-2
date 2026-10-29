import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getSettingsPasswordErrors } from '../auth/settingsPassword'
import { getTheme, setTheme } from '../utils/theme.js'

export default function SettingsModal({ profile, onClose }) {
  const dialogRef = useRef(null)
  const id = useId()
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [touched, setTouched] = useState({})
  const [currentTheme, setCurrentTheme] = useState(() => getTheme())
  const errors = getSettingsPasswordErrors(passwords)
  const name = typeof profile?.name === 'string' ? profile.name.trim() : ''
  const email = typeof profile?.email === 'string' ? profile.email.trim() : ''
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()

  function handleThemeChange(newTheme) {
    setCurrentTheme(newTheme)
    setTheme(newTheme)
  }

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const bodyOverflow = document.body.style.overflow
    const rootOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    dialog.showModal()
    dialog.querySelector('button').focus({ preventScroll: true })
    return () => {
      dialog.close()
      document.body.style.overflow = bodyOverflow
      document.documentElement.style.overflow = rootOverflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [])

  function handleKeyDown(event) {
    if (event.key !== 'Tab') return
    const controls = dialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled])')
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <dialog ref={dialogRef} aria-modal="true" aria-labelledby={`${id}-title`} onKeyDown={handleKeyDown}
      onCancel={event => { event.preventDefault(); onClose() }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%_-_2rem)] max-w-[520px] overflow-y-auto overscroll-contain rounded-2xl border border-[#E2E5ED] bg-white p-4 text-[#111827] shadow-xl backdrop:bg-[#111827]/50 sm:p-5 dark:border-[#28354E] dark:bg-[#161F30] dark:text-[#F8FAFC]">
      <div className="flex items-center justify-between gap-4">
        <h2 id={`${id}-title`} className="text-xl leading-6 font-semibold">Settings</h2>
        <button type="button" onClick={onClose} aria-label="Close settings" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#52556C] hover:bg-[#F7F8FB] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/15 dark:text-[#94A3B8] dark:hover:bg-[#1E293B]">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      </div>

      <section aria-labelledby={`${id}-theme`} className="mt-4 rounded-xl border border-[#E2E5ED] bg-[#F7F8FB] p-3.5 dark:border-[#28354E] dark:bg-[#1A2438]">
        <h3 id={`${id}-theme`} className="text-sm font-semibold">Appearance & Theme</h3>
        <p className="mt-1 text-xs text-[#7A8190] dark:text-[#94A3B8]">Switch between light, dark, or automatic system appearance.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${
              currentTheme === 'light'
                ? 'border-[#475AA2] bg-white text-[#475AA2] shadow-sm dark:bg-[#28354E] dark:text-[#A5B4FC]'
                : 'border-[#D8DCE5] bg-white text-[#52556C] hover:bg-[#F1F3F9] dark:border-[#334155] dark:bg-[#161F30] dark:text-[#94A3B8]'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
            Light
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${
              currentTheme === 'dark'
                ? 'border-[#475AA2] bg-white text-[#475AA2] shadow-sm dark:bg-[#28354E] dark:text-[#A5B4FC]'
                : 'border-[#D8DCE5] bg-white text-[#52556C] hover:bg-[#F1F3F9] dark:border-[#334155] dark:bg-[#161F30] dark:text-[#94A3B8]'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
            Dark
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange('system')}
            className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition ${
              currentTheme === 'system'
                ? 'border-[#475AA2] bg-white text-[#475AA2] shadow-sm dark:bg-[#28354E] dark:text-[#A5B4FC]'
                : 'border-[#D8DCE5] bg-white text-[#52556C] hover:bg-[#F1F3F9] dark:border-[#334155] dark:bg-[#161F30] dark:text-[#94A3B8]'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="14" x="2" y="3" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" />
            </svg>
            System
          </button>
        </div>
      </section>

      <section aria-labelledby={`${id}-profile`} className="mt-4">
        <h3 id={`${id}-profile`} className="text-sm font-semibold">Profile</h3>
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#F7F8FB] px-3 py-2 dark:bg-[#1A2438]">
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DEE2F4] text-sm font-semibold text-[#475AA2] dark:bg-[#34446E] dark:text-[#A5B4FC]">{initials || '—'}</span>
          <div className="min-w-0 text-sm"><p className="break-words font-semibold">{name || 'Name unavailable'}</p><p className="mt-0.5 break-words text-xs text-[#7A8190] dark:text-[#94A3B8]">{email || 'Email unavailable'}</p></div>
        </div>
        <div className="mt-2 rounded-xl bg-[#F7F8FB] p-2 dark:bg-[#1A2438]">
          <label htmlFor={`${id}-name`} className="block text-sm font-medium text-[#52556C] dark:text-[#94A3B8]">Full Name</label>
          <input id={`${id}-name`} value={name} readOnly className="mt-1 h-8 w-full rounded-lg border border-[#D8DCE5] bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[#475AA2]/15 dark:border-[#334155] dark:bg-[#161F30] dark:text-[#F8FAFC]" />
        </div>
      </section>
      <form aria-labelledby={`${id}-password`} className="mt-3" noValidate onSubmit={event => {
        event.preventDefault()
        setTouched({ currentPassword: true, newPassword: true, confirmPassword: true })
      }}>
        <h3 id={`${id}-password`} className="text-sm font-semibold">Change Password</h3>
        <p id={`${id}-password-help`} className="mt-1 text-xs leading-4 text-[#7A8190] dark:text-[#94A3B8]">Use at least 8 characters, an uppercase letter, a number, and a special character.</p>
        <div className="mt-2 space-y-1.5">
          {[['currentPassword', 'Current Password'], ['newPassword', 'New Password'], ['confirmPassword', 'Confirm New Password']].map(([field, label]) => {
            const error = touched[field] && errors[field]
            return <div key={field}>
              <label htmlFor={`${id}-${field}`} className="block text-sm font-medium text-[#52556C] dark:text-[#94A3B8]">{label}</label>
              <input id={`${id}-${field}`} name={field} type="password" required autoComplete={field === 'currentPassword' ? 'current-password' : 'new-password'} value={passwords[field]}
                onChange={event => setPasswords(current => ({ ...current, [field]: event.target.value }))}
                onBlur={() => setTouched(current => ({ ...current, [field]: true }))}
                aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-${field}-error` : `${id}-password-help`}
                className={`mt-1 h-[38px] w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[#475AA2]/15 dark:border-[#334155] dark:bg-[#161F30] dark:text-[#F8FAFC] ${error ? 'border-[#E5484D]' : 'border-[#D8DCE5]'}`} />
              {error && <p id={`${id}-${field}-error`} role="alert" className="mt-1 text-xs leading-4 text-[#E5484D]">{error}</p>}
            </div>
          })}
        </div>
        <p id={`${id}-password-unavailable`} role="status" className="mt-2 text-xs leading-4 text-[#7A8190] dark:text-[#94A3B8]">Password changes from Settings are not available yet.</p>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-8 rounded-xl bg-[#EEF0FF] px-3 py-1 text-xs font-semibold text-[#475AA2] hover:bg-[#DEE2F4] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/15 dark:bg-[#28354E] dark:text-[#A5B4FC]">Cancel</button>
          <button type="submit" disabled aria-describedby={`${id}-password-unavailable`} className="min-h-8 rounded-xl bg-[#5C72C9] px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">Update Password</button>
        </div>
      </form>
    </dialog>, document.body,
  )
}
