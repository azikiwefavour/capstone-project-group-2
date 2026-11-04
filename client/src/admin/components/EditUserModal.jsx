import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getUserEdits } from '../editUserDetails'

// onSave is deliberately absent in User Management until a supported Admin
// update endpoint exists. Tests supply an isolated callback, never a fake API.
export default function EditUserModal({ user, onClose, onSave, onSaved }) {
  const [draft, setDraft] = useState(() => ({ name: user.name || '', email: user.email || '', phone: user.phone || '' }))
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const inFlight = useRef(false)
  const dialogRef = useRef(null)
  const nameRef = useRef(null)
  const id = useId()
  const { changes, errors } = getUserEdits(user, draft)
  const hasChanges = Object.keys(changes).length > 0

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const bodyOverflow = document.body.style.overflow
    const rootOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    dialog.showModal()
    nameRef.current.focus({ preventScroll: true })
    return () => {
      dialog.close()
      document.body.style.overflow = bodyOverflow
      document.documentElement.style.overflow = rootOverflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [])

  function close() {
    if (!inFlight.current) onClose()
  }

  function handleKeyDown(event) {
    if (event.key !== 'Tab') return
    const controls = dialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled])')
    const first = controls[0], last = controls[controls.length - 1]
    if (!first) { event.preventDefault(); dialogRef.current.focus() }
    else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault(); last.focus()
    } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  async function save(event) {
    event.preventDefault()
    if (inFlight.current) return
    setSubmitted(true)
    if (Object.keys(errors).length || !hasChanges || !user.id || !onSave) return
    inFlight.current = true
    setIsSaving(true)
    setSaveError('')
    dialogRef.current.focus({ preventScroll: true })
    try {
      await onSave(user.id, changes)
      onSaved?.('User details updated successfully.')
      onClose()
    } catch (cause) {
      setSaveError(cause.message || 'Unable to save changes. Please try again.')
    } finally {
      inFlight.current = false
      setIsSaving(false)
    }
  }

  return createPortal(
    <dialog ref={dialogRef} tabIndex={-1} aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
      onCancel={event => { event.preventDefault(); close() }} onKeyDown={handleKeyDown}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[500px] max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-[28px] border-0 bg-white p-6 text-[#30313D] shadow-xl backdrop:bg-[#111827]/40 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <h2 id={`${id}-title`} className="text-2xl font-semibold leading-8">Edit user details</h2>
        <button type="button" onClick={close} disabled={isSaving} aria-label="Close edit user details"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#7A8190] hover:bg-[#F7F8FB] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/20 disabled:opacity-45">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      </div>
      <p id={`${id}-description`} className="mt-2 text-base text-[#7A8190]">Edit user information</p>
      <form onSubmit={save} noValidate className="mt-4 space-y-4">
        {[['name', 'Name', 'text'], ['email', 'Email address', 'email'], ['phone', 'Phone number', 'tel']].map(([field, label, type]) => {
          const error = (submitted || touched[field]) && errors[field]
          return <div key={field}>
            <label htmlFor={`${id}-${field}`} className="mb-1.5 block text-sm font-medium text-[#52556C]">{label}</label>
            <input ref={field === 'name' ? nameRef : undefined} id={`${id}-${field}`} type={type} value={draft[field]} disabled={isSaving}
              maxLength={field === 'phone' ? 50 : 255} autoComplete="off" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-${field}-error` : undefined}
              onChange={event => setDraft(current => ({ ...current, [field]: event.target.value }))} onBlur={() => setTouched(current => ({ ...current, [field]: true }))}
              className={`h-11 w-full min-w-0 rounded-xl border bg-white px-3 text-base text-[#30313D] outline-none focus:ring-4 focus:ring-[#475AA2]/15 disabled:opacity-60 ${error ? 'border-[#E5484D]' : 'border-[#D8DCE5] focus:border-[#475AA2]'}`} />
            {error && <p id={`${id}-${field}-error`} className="mt-1 text-xs text-[#D42640]">{error}</p>}
          </div>
        })}
        <div>
          <label htmlFor={`${id}-role`} className="mb-1.5 block text-sm font-medium text-[#52556C]">Role</label>
          <input id={`${id}-role`} value={user.role || '—'} disabled className="h-11 w-full min-w-0 cursor-not-allowed rounded-xl border border-[#D8DCE5] bg-[#F7F8FB] px-3 text-base text-[#7A8190]" />
        </div>
        {!onSave && <p id={`${id}-unavailable`} role="status" className="text-sm leading-5 text-[#7A8190]">Saving is unavailable because the Admin API does not yet support updating user details. No changes will be sent.</p>}
        {saveError && <p role="alert" className="text-sm text-[#D42640]">{saveError}</p>}
        {isSaving && <p role="status" className="text-sm text-[#7A8190]">Saving changes… Please wait.</p>}
        <div className="pt-1">
          <button type="submit" disabled={!onSave || isSaving || !hasChanges || !user.id} aria-describedby={!onSave ? `${id}-unavailable` : undefined}
            className="min-h-11 rounded-xl bg-[#475AA2] px-5 py-2 text-sm font-semibold text-white hover:bg-[#3D4F91] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/25 disabled:cursor-not-allowed disabled:opacity-45 sm:text-base">{isSaving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </dialog>, document.body,
  )
}
