import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function DeleteUserModal({ user, onClose, onRemove, focusFallbackRef }) {
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)
  const inFlight = useRef(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState('')
  const id = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const fallbackFocus = focusFallbackRef?.current
    const bodyOverflow = document.body.style.overflow
    const rootOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    dialog.showModal()
    cancelRef.current.focus({ preventScroll: true })
    return () => {
      dialog.close()
      document.body.style.overflow = bodyOverflow
      document.documentElement.style.overflow = rootOverflow
      const target = previousFocus?.isConnected ? previousFocus : fallbackFocus
      target?.focus({ preventScroll: true })
    }
  }, [focusFallbackRef])

  function close() {
    if (!inFlight.current) onClose()
  }

  function handleKeyDown(event) {
    if (event.key !== 'Tab') return
    const buttons = dialogRef.current.querySelectorAll('button:not([disabled])')
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    if (!first) {
      event.preventDefault()
      dialogRef.current.focus()
    } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  async function remove() {
    if (inFlight.current || !user.id) return
    inFlight.current = true
    setIsRemoving(true)
    setError('')
    dialogRef.current.focus({ preventScroll: true })
    try {
      // Capture this dialog's user ID; never derive the target from a row index.
      await onRemove(user.id)
      onClose()
    } catch (cause) {
      setError(cause.message || 'Unable to remove this user. Please try again.')
    } finally {
      inFlight.current = false
      setIsRemoving(false)
    }
  }

  return createPortal(
    <dialog ref={dialogRef} tabIndex={-1} aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
      onCancel={event => { event.preventDefault(); close() }} onKeyDown={handleKeyDown}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[500px] max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-[28px] border-0 bg-white p-6 text-[#30313D] shadow-xl backdrop:bg-[#111827]/40 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <h2 id={`${id}-title`} className="text-2xl font-semibold leading-8">Delete user</h2>
        <button type="button" onClick={close} disabled={isRemoving} aria-label="Close delete user confirmation"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#7A8190] hover:bg-[#F7F8FB] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/20 disabled:opacity-45">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      </div>
      <p id={`${id}-description`} className="mt-2 text-base leading-6 text-[#7A8190]">Are you sure you want to remove this user?</p>
      <dl className="mt-4 space-y-3 rounded-2xl bg-[#F7F8FB] p-4 text-sm sm:p-5 sm:text-base">
        {[['Name', user.name], ['Email', user.email], ['Phone', user.phone], ['Role', user.role]].map(([label, value]) => (
          <div key={label} className="grid grid-cols-[56px_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[72px_minmax(0,1fr)]">
            <dt className="text-[#7A8190]">{label}</dt>
            <dd className="min-w-0 text-right font-semibold text-[#656B7A] [overflow-wrap:anywhere]">{value || '—'}</dd>
          </div>
        ))}
      </dl>
      {error && <p role="alert" className="mt-4 text-sm text-[#D42640]">{error}</p>}
      {isRemoving && <p role="status" className="mt-4 text-sm text-[#7A8190]">Removing user… Please wait.</p>}
      <div className="mt-5 flex items-center justify-between gap-3">
        <button ref={cancelRef} type="button" onClick={close} disabled={isRemoving}
          className="min-h-11 rounded-xl bg-[#EEF0FF] px-4 py-2 text-sm font-semibold text-[#475AA2] hover:bg-[#DEE2F4] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/20 disabled:opacity-45 sm:px-5 sm:text-base">Cancel</button>
        <button type="button" onClick={remove} disabled={isRemoving || !user.id}
          className="min-h-11 rounded-xl bg-[#FF3650] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E52E46] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#FF3650]/25 disabled:opacity-45 sm:px-5 sm:text-base">{isRemoving ? 'Removing…' : 'Remove user'}</button>
      </div>
    </dialog>, document.body,
  )
}
