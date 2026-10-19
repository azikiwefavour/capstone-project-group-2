import { useId, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

function ActionsPopover({ id, trigger, onClose, onReview }) {
  const popover = useRef(null)
  useLayoutEffect(() => {
    const element = popover.current
    const anchor = trigger.current
    const rect = anchor.getBoundingClientRect()
    const bounds = element.getBoundingClientRect()
    element.style.left = `${Math.max(8, Math.min(rect.right - bounds.width, window.innerWidth - bounds.width - 8))}px`
    element.style.top = `${Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - bounds.height - 8))}px`
    const focusTarget = element.querySelector('button:not(:disabled)') || element
    focusTarget.focus({ preventScroll: true })
    const outside = event => {
      if (!element.contains(event.target) && !anchor.contains(event.target)) onClose()
    }
    const keyboard = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        anchor.focus({ preventScroll: true })
      } else if (event.key === 'Tab') {
        // Restore the trigger before the browser moves focus to the next row.
        anchor.focus({ preventScroll: true })
        onClose()
      }
    }
    const scroll = event => {
      if (element.contains(event.target)) return
      // Scrolling the trigger into view can dispatch a queued scroll event
      // after the menu opens. Close only when its anchor actually moves.
      const current = anchor.getBoundingClientRect()
      if (current.top !== rect.top || current.left !== rect.left) onClose()
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', keyboard)
    document.addEventListener('scroll', scroll, true)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', keyboard)
      document.removeEventListener('scroll', scroll, true)
      window.removeEventListener('resize', onClose)
    }
  }, [trigger, onClose])

  return createPortal(<div id={id} ref={popover} role="menu" aria-label="Prescription actions" tabIndex={-1}
    className="fixed z-50 w-[220px] max-w-[calc(100vw-16px)] rounded-lg border border-[#E2E5ED] bg-white p-2 text-sm text-[#111827] shadow-lg shadow-black/10 focus:outline-none">
    <button type="button" role="menuitem" disabled={!onReview} onClick={() => { onClose(); onReview?.() }}
      className="w-full rounded-md px-3 py-2 text-left hover:bg-[#EEF0FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#475AA2] disabled:cursor-not-allowed disabled:text-[#7A8190]">Open prescription</button>
    {!onReview && <p role="note" className="px-3 pb-2 text-xs leading-5 text-[#7A8190]">Prescription review is coming soon.</p>}
  </div>, document.body)
}

// Only opens read-only details; no prescription-changing commands are offered.
export default function PrescriptionActions({ patientName, label, open, onToggle, onClose, onReview }) {
  const trigger = useRef(null)
  const id = useId()
  return <>
    <button ref={trigger} type="button" aria-label={label || `Prescription actions for ${patientName || 'unnamed patient'}`}
      aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={onToggle}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7A8190] hover:bg-[#EEF0FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#475AA2]">
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4"><circle cx="10" cy="4" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="10" cy="16" r="1.5" /></svg>
    </button>
    {open && <ActionsPopover id={id} trigger={trigger} onClose={onClose} onReview={onReview} />}
  </>
}
