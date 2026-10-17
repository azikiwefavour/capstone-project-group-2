import { useId, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

function ActionIcon({ discontinue = false }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4 shrink-0">
    {discontinue ? <><circle cx="12" cy="12" r="8" /><path d="m6.5 6.5 11 11" /></> : <><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15Z" /></>}
  </svg>
}

function FloatingMenu({ id, trigger, onClose, onSelect }) {
  const menu = useRef(null)
  useLayoutEffect(() => {
    const element = menu.current
    const anchor = trigger.current
    const rect = anchor.getBoundingClientRect()
    const bounds = element.getBoundingClientRect()
    const margin = 8
    // Portal positioning avoids clipping by the medication table's scroll container.
    const left = rect.left - bounds.width - 4 >= margin ? rect.left - bounds.width - 4 : rect.right + 4
    element.style.left = `${Math.max(margin, Math.min(left, window.innerWidth - bounds.width - margin))}px`
    element.style.top = `${Math.max(margin, Math.min(rect.top, window.innerHeight - bounds.height - margin))}px`
    element.querySelector('[role="menuitem"]')?.focus({ preventScroll: true })
    const outside = (event) => {
      if (!element.contains(event.target) && !anchor.contains(event.target)) onClose()
    }
    const scroll = (event) => {
      if (!element.contains(event.target)) onClose()
    }
    const keyboard = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        anchor.focus({ preventScroll: true })
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', keyboard)
    window.addEventListener('resize', onClose)
    document.addEventListener('scroll', scroll, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', keyboard)
      window.removeEventListener('resize', onClose)
      document.removeEventListener('scroll', scroll, true)
    }
  }, [trigger, onClose])

  return createPortal(<div ref={menu} id={id} role="menu" aria-label="Medication actions" className="fixed z-50 w-[208px] max-w-[calc(100vw-16px)] rounded-lg border border-[#E2E5ED] bg-white p-1 shadow-lg shadow-black/10"
    onKeyDown={(event) => {
      if (event.key === 'Tab') onClose()
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const items = [...menu.current.querySelectorAll('[role="menuitem"]')]
      const index = items.indexOf(document.activeElement)
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
      items[next].focus()
    }}>
    {['Modify prescription', 'Discontinue'].map((label, index) => <button key={label} type="button" role="menuitem" tabIndex={-1}
      onClick={() => { onSelect(label); onClose(); trigger.current?.focus({ preventScroll: true }) }}
      className="flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-[#111827] hover:bg-[#F7F8FB] focus:bg-[#EEF0FF] focus:outline-none">
      <ActionIcon discontinue={index === 1} />{label}
    </button>)}
  </div>, document.body)
}

export default function MedicationActionsMenu({ medication, readOnly, open, onToggle, onClose, onSelect }) {
  const trigger = useRef(null)
  const id = useId()
  return <>
    <button ref={trigger} type="button" disabled={readOnly} aria-label={`Medication actions for ${medication.name || 'medication'}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
      title={readOnly ? 'Medication history is read-only' : 'Medication actions'}
      onClick={onToggle}
      onKeyDown={(event) => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!open) onToggle() } }}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7A8190] hover:bg-[#EEF0FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#475AA2] disabled:cursor-not-allowed disabled:opacity-50">
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4"><circle cx="10" cy="4" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="10" cy="16" r="1.5" /></svg>
    </button>
    {open && !readOnly && <FloatingMenu id={id} trigger={trigger} onClose={onClose} onSelect={onSelect} />}
  </>
}
