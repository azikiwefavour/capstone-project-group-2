import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import DoctorIcon from './DoctorIcon'

export default function PrescriptionDialog({ patient, title, subtitle = 'Provide prescription details', idPrefix, onClose, dialogRef, children }) {
  const internalRef = useRef(null)
  const ref = dialogRef || internalRef
  const name = typeof patient?.name === 'string' ? patient.name.trim() : ''
  const initials = name ? name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() : ''
  const age = Number.isSafeInteger(patient?.age) && patient.age >= 0 ? `${patient.age} years old` : 'Age unavailable'
  const gender = typeof patient?.gender === 'string' && patient.gender.trim() ? patient.gender : 'Gender unavailable'

  useEffect(() => {
    const dialog = ref.current
    const previousFocus = document.activeElement
    const previousBodyOverflow = document.body.style.overflow
    const previousRootOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    dialog.showModal()
    dialog.querySelector('input')?.focus({ preventScroll: true })
    return () => {
      dialog.close()
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousRootOverflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [ref])

  return createPortal(
    <dialog ref={ref} aria-modal="true" aria-labelledby={`${idPrefix}-title`} aria-describedby={`${idPrefix}-description`}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%_-_2rem)] max-w-[500px] overflow-y-auto rounded-2xl border border-[#E2E5ED] bg-white p-4 text-[#111827] shadow-xl backdrop:bg-[#111827]/50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={`${idPrefix}-title`} className="text-xl font-semibold">{title}</h2>
          <p id={`${idPrefix}-description`} className="mt-1 text-[13px] leading-5 text-[#7A8190]">{subtitle}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={`Close ${title.toLowerCase()}`} title="Close" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#52556C] hover:bg-[#F7F8FB] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#EEF0FF] p-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DEE2F4] text-xs font-semibold text-[#475AA2]">{initials || <DoctorIcon type="user" className="h-4 w-4" />}</span>
        <div className="min-w-0"><p className="break-words text-[13px] leading-5 font-semibold">{name || 'Patient information unavailable'}</p><p className="mt-0.5 text-xs text-[#7A8190]">{age} &bull; {gender}</p></div>
      </div>
      {children}
    </dialog>, document.body,
  )
}
