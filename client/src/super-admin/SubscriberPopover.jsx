import { useEffect, useId, useRef } from 'react'

export default function SubscriberPopover({ label, open, onToggle, onClose, active, children }) {
  const wrapper = useRef(null), trigger = useRef(null)
  const id = useId()
  useEffect(() => {
    if (!open) return
    function outside(event) { if (!wrapper.current.contains(event.target)) onClose() }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open, onClose])
  return <div ref={wrapper} className="relative" onKeyDown={event => { if (event.key === 'Escape' && open) { event.preventDefault(); onClose(); trigger.current.focus({ preventScroll: true }) } }}>
    <button ref={trigger} type="button" aria-label={label} aria-expanded={open} aria-controls={open ? id : undefined} onClick={onToggle} className={`flex h-9 items-center gap-2 rounded-xl border bg-white px-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-[#475AA2] ${active ? 'border-[#475AA2] text-[#475AA2]' : 'border-[#E2E5ED] text-[#52556C]'}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d={label === 'Filter' ? 'M3 5h18l-7 8v6l-4 2v-8L3 5Z' : 'M8 4v16 M4 8l4-4 4 4 M16 20V4 M12 16l4 4 4-4'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>{label}
    </button>
    {open && <div id={id} role="group" aria-label={`Subscriber ${label.toLowerCase()} options`} className="absolute right-0 top-full z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] space-y-3 rounded-xl border border-[#E2E5ED] bg-white p-3 text-xs text-[#52556C] shadow-lg">{children}</div>}
  </div>
}
