import { useId, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

function ActionsPopover({ id, trigger, onClose }) {
  const popover = useRef(null)
  useLayoutEffect(() => {
    const element = popover.current
    const anchor = trigger.current
    const rect = anchor.getBoundingClientRect()
    const bounds = element.getBoundingClientRect()
    const left = rect.left - bounds.width - 4 >= 8 ? rect.left - bounds.width - 4 : rect.right + 4
    element.style.left = `${Math.max(8, Math.min(left, window.innerWidth - bounds.width - 8))}px`
    element.style.top = `${Math.max(8, Math.min(rect.top, window.innerHeight - bounds.height - 8))}px`
    element.focus({ preventScroll: true })
    const outside = (event) => {
      if (!element.contains(event.target) && !anchor.contains(event.target)) onClose()
    }
    const keyboard = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        anchor.focus({ preventScroll: true })
      } else if (event.key === 'Tab') onClose()
    }
    const scroll = (event) => { if (!element.contains(event.target)) onClose() }
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

  // No clarification actions have been specified yet. Do not invent menu commands.
  return createPortal(<div id={id} ref={popover} role="dialog" aria-label="Clarification actions" tabIndex={-1}
    className="fixed z-50 w-[220px] max-w-[calc(100vw-16px)] rounded-lg border border-[#E2E5ED] bg-white p-3 text-xs leading-5 text-[#7A8190] shadow-lg shadow-black/10 focus:outline-none">
    Clarification actions are not available yet.
  </div>, document.body)
}

export default function ClarificationActions({ recordId, patientName, open, onToggle, onClose }) {
  const trigger = useRef(null)
  const id = useId()
  return <>
    <button ref={trigger} type="button" disabled={recordId == null || !String(recordId).trim()} aria-label={`Clarification actions for ${patientName}`}
      aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} title="Clarification actions"
      onClick={onToggle} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7A8190] hover:bg-[#EEF0FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#475AA2] disabled:cursor-not-allowed disabled:opacity-50">
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4"><circle cx="10" cy="4" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="10" cy="16" r="1.5" /></svg>
    </button>
    {open && <ActionsPopover id={id} trigger={trigger} onClose={onClose} />}
  </>
}
