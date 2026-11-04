import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getUserEdits } from '../editUserDetails'

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

  const nameError = (submitted || touched.name) && errors.name
  const emailError = (submitted || touched.email) && errors.email
  const phoneError = (submitted || touched.phone) && errors.phone
  const displayRole = user.role ? (user.role[0].toUpperCase() + user.role.slice(1).toLowerCase()) : (user.role || '—')

  return createPortal(
    <dialog ref={dialogRef} tabIndex={-1} aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
      onCancel={event => { event.preventDefault(); close() }} onKeyDown={handleKeyDown}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[500px] max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-[28px] border-0 bg-white p-6 text-[#30313D] shadow-xl backdrop:bg-[#111827]/40 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <h2 id={`${id}-title`} className="text-2xl font-semibold leading-8 text-[#111827]">Edit user details</h2>
        <button type="button" onClick={close} disabled={isSaving} aria-label="Close edit user details"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#7A8190] hover:bg-[#F7F8FB] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/20 disabled:opacity-45 cursor-pointer">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      </div>
      <p id={`${id}-description`} className="mt-1 text-base text-[#7A8190]">Edit user information</p>

      <form onSubmit={save} noValidate className="mt-5 space-y-4">
        {/* Name Field */}
        <div>
          <label htmlFor={`${id}-name`} className="mb-1.5 block text-sm font-medium text-[#52556C]">Name</label>
          <input
            ref={nameRef}
            id={`${id}-name`}
            type="text"
            value={draft.name}
            disabled={isSaving}
            maxLength={255}
            autoComplete="off"
            placeholder="Dr. Adewale"
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? `${id}-name-error` : undefined}
            onChange={event => setDraft(current => ({ ...current, name: event.target.value }))}
            onBlur={() => setTouched(current => ({ ...current, name: true }))}
            className={`h-11 w-full min-w-0 rounded-xl border bg-white px-3 text-base text-[#30313D] outline-none transition focus:ring-4 focus:ring-[#475AA2]/15 disabled:opacity-60 ${nameError ? 'border-[#E5484D]' : 'border-[#D8DCE5] focus:border-[#475AA2]'}`}
          />
          {nameError && <p id={`${id}-name-error`} className="mt-1 text-xs text-[#D42640]">{nameError}</p>}
        </div>

        {/* Email Address Field */}
        <div>
          <label htmlFor={`${id}-email`} className="mb-1.5 block text-sm font-medium text-[#52556C]">Email address</label>
          <input
            id={`${id}-email`}
            type="email"
            value={draft.email}
            disabled={isSaving}
            maxLength={255}
            autoComplete="off"
            placeholder="adewale@medtrail.com"
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? `${id}-email-error` : undefined}
            onChange={event => setDraft(current => ({ ...current, email: event.target.value }))}
            onBlur={() => setTouched(current => ({ ...current, email: true }))}
            className={`h-11 w-full min-w-0 rounded-xl border bg-white px-3 text-base text-[#30313D] outline-none transition focus:ring-4 focus:ring-[#475AA2]/15 disabled:opacity-60 ${emailError ? 'border-[#E5484D]' : 'border-[#D8DCE5] focus:border-[#475AA2]'}`}
          />
          {emailError && <p id={`${id}-email-error`} className="mt-1 text-xs text-[#D42640]">{emailError}</p>}
        </div>

        {/* Phone Field matching design with Nigerian flag */}
        <div>
          <label htmlFor={`${id}-phone`} className="mb-1.5 block text-sm font-medium text-[#52556C]">Phone</label>
          <div className={`flex h-11 w-full min-w-0 items-center rounded-xl border bg-white focus-within:ring-4 focus-within:ring-[#475AA2]/15 ${phoneError ? 'border-[#E5484D]' : 'border-[#D8DCE5] focus-within:border-[#475AA2]'}`}>
            <div className="flex shrink-0 items-center gap-1.5 border-r border-[#D8DCE5] px-3 text-sm font-medium text-[#111827]">
              <span className="flex h-4 w-4 shrink-0 overflow-hidden rounded-full" aria-label="Nigeria">
                <span className="h-full flex-1 bg-[#008753]" />
                <span className="h-full flex-1 bg-white" />
                <span className="h-full flex-1 bg-[#008753]" />
              </span>
              <span>+234</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="text-[#6B7280]">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <input
              id={`${id}-phone`}
              aria-label="Phone number"
              type="tel"
              placeholder="0000-0000"
              value={draft.phone}
              disabled={isSaving}
              maxLength={50}
              autoComplete="off"
              aria-invalid={Boolean(phoneError)}
              aria-describedby={phoneError ? `${id}-phone-error` : undefined}
              onChange={event => setDraft(current => ({ ...current, phone: event.target.value }))}
              onBlur={() => setTouched(current => ({ ...current, phone: true }))}
              className="h-full w-full min-w-0 rounded-r-xl bg-transparent px-3 text-base text-[#30313D] outline-none disabled:opacity-60 placeholder:text-[#A6ADBA]"
            />
          </div>
          {phoneError && <p id={`${id}-phone-error`} className="mt-1 text-xs text-[#D42640]">{phoneError}</p>}
        </div>

        {/* Role Field (Read-only permanent) */}
        <div>
          <label htmlFor={`${id}-role`} className="mb-1.5 block text-sm font-medium text-[#52556C]">Role</label>
          <div className="relative">
            <input
              id={`${id}-role`}
              value={displayRole}
              disabled
              className="h-11 w-full min-w-0 cursor-not-allowed rounded-xl border border-[#D8DCE5] bg-[#F7F8FB] px-3 pr-10 text-base text-[#7A8190]"
            />
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#A6ADBA]">
              <path d="M6 8L10 12L14 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {!onSave && (
          <p id={`${id}-unavailable`} role="status" className="text-sm leading-5 text-[#7A8190]">
            Saving is unavailable because the Admin API does not yet support updating user details. No changes will be sent.
          </p>
        )}
        {saveError && <p role="alert" className="text-sm text-[#D42640]">{saveError}</p>}
        {isSaving && <p role="status" className="text-sm text-[#7A8190]">Saving changes… Please wait.</p>}

        <div className="pt-2">
          <button
            type="submit"
            disabled={!onSave || isSaving || !hasChanges || !user.id || Object.keys(errors).length > 0}
            aria-describedby={!onSave ? `${id}-unavailable` : undefined}
            className="min-h-11 rounded-xl bg-[#475AA2] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3D4F91] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/25 disabled:cursor-not-allowed disabled:opacity-45 sm:text-base cursor-pointer"
          >
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </dialog>, document.body,
  )
}
