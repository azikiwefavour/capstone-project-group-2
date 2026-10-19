import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function LogoutConfirmationModal({ onClose, onConfirm }) {
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)
  const id = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const previousBodyOverflow = document.body.style.overflow
    const previousRootOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    dialog.showModal()
    cancelRef.current.focus({ preventScroll: true })
    return () => {
      dialog.close()
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousRootOverflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [])

  function handleKeyDown(event) {
    if (event.key !== 'Tab') return
    const buttons = dialogRef.current.querySelectorAll('button:not([disabled])')
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <dialog ref={dialogRef} aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
      onCancel={event => { event.preventDefault(); onClose() }}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%_-_2rem)] max-w-[420px] overflow-y-auto overscroll-contain rounded-2xl border border-[#E2E5ED] bg-white p-5 text-[#111827] shadow-xl backdrop:bg-[#111827]/50 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 id={`${id}-title`} className="text-[22px] leading-7 font-semibold">LOG OUT</h2>
        <button type="button" onClick={onClose} aria-label="Close log out confirmation" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#52556C] hover:bg-[#F7F8FB] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/15">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      </div>
      <p id={`${id}-description`} className="mt-2 text-sm leading-5 text-[#7A8190]">Are you sure you want to log out of your account</p>
      <div className="mt-5 flex items-center justify-between gap-3">
        <button ref={cancelRef} type="button" onClick={onClose} className="min-h-9 rounded-xl bg-[#EEF0FF] px-3 py-1.5 text-sm font-semibold text-[#475AA2] hover:bg-[#DEE2F4] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/15">Cancel</button>
        <button type="button" onClick={onConfirm} className="min-h-9 rounded-xl bg-[#5C72C9] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#475AA2] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#5C72C9]/25">Yes, Log out</button>
      </div>
    </dialog>, document.body,
  )
}
