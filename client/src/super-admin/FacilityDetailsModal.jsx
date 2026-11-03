import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { facilityBillingDetails, facilityStatusStyles, facilityTotals } from './facilityPresentation'
import { formatStatistic } from './statisticsMetrics'
import { formatNaira } from './revenue'
import { formatRenewalDate } from './overviewData'

export default function FacilityDetailsModal({ facility, onClose, loading = false, error, onRetry }) {
  if (!facility || typeof facility.name !== 'string' || !facility.name.trim()) return null
  return <FacilityDetailsDialog facility={facility} onClose={onClose} loading={loading} error={error} onRetry={onRetry} />
}

function FacilityDetailsDialog({ facility, onClose, loading, error, onRetry }) {
  const dialogRef = useRef(null)
  const closeRef = useRef(null)
  const outsidePress = useRef(false)
  const id = useId()
  const totals = facilityTotals(facility)
  const billing = facilityBillingDetails(facility)
  const badge = facilityStatusStyles[facility.status]

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const background = document.querySelector('[data-super-admin-facilities] > section')
    const locked = [document.body, document.documentElement, background].filter(Boolean).map(node => ({ node, overflow: node.style.overflow, top: node.scrollTop, left: node.scrollLeft }))
    locked.forEach(({ node }) => { node.style.overflow = 'hidden' })
    dialog.showModal()
    closeRef.current.focus({ preventScroll: true })
    return () => {
      dialog.close()
      locked.forEach(({ node, overflow, top, left }) => { node.style.overflow = overflow; node.scrollTop = top; node.scrollLeft = left })
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [])

  function isOutside(event) {
    const bounds = dialogRef.current.getBoundingClientRect()
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom
  }

  return createPortal(
    <dialog ref={dialogRef} aria-modal="true" aria-labelledby={`${id}-title`}
      onCancel={event => { event.preventDefault(); onClose() }}
      onPointerDown={event => { outsidePress.current = event.target === event.currentTarget && isOutside(event) }}
      onClick={event => { if (outsidePress.current && event.target === event.currentTarget && isOutside(event)) onClose(); outsidePress.current = false }}
      onKeyDown={event => { if (event.key === 'Tab') { const buttons = [...dialogRef.current.querySelectorAll('button:not(:disabled)')]; const index = buttons.indexOf(document.activeElement); event.preventDefault(); buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus({ preventScroll: true }) } }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%_-_2rem)] max-w-[520px] overflow-y-auto overscroll-contain rounded-2xl border border-[#E2E5ED] bg-white p-4 text-[#111827] shadow-xl backdrop:bg-[#111827]/50 sm:p-5">
      <header className="flex items-start justify-between gap-4">
        <h2 id={`${id}-title`} className="min-w-0 break-words text-lg font-medium leading-6">{facility.name}</h2>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close facility details" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#52556C] hover:bg-[#F7F8FB] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/15"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5"><path d="m6 6 12 12 M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></button>
      </header>
      {loading && <p role="status" className="mt-3 text-xs text-[#7A8190]">Loading facility details...</p>}
      {error && <p role="alert" className="mt-3 text-xs text-[#7A8190]">{error}<button type="button" onClick={onRetry} className="ml-2 text-[#475AA2] underline">Try again</button></p>}
      <div role="group" aria-label="Facility summary" className="mt-3 grid grid-cols-1 gap-2 rounded-xl bg-[#F3EDF8] p-2 min-[360px]:grid-cols-3">
        {[['Clinicians', totals.clinicians], ['Patients', totals.patients], [facility.messagesLabel || 'Messages (Oct)', totals.messages]].map(([label, value]) => <section key={label} aria-label={label} className="min-w-0 rounded-lg bg-white p-2.5"><h3 className="text-[11px] leading-4 text-[#7A8190]">{label}</h3><p className="mt-1 break-words text-lg font-semibold leading-6">{formatStatistic(value)}</p><div aria-hidden="true" className="mt-2 h-1 rounded-full bg-[#DEE2F4]"><div className={`h-full rounded-full bg-[#475AA2] ${facility.progress === undefined ? 'w-1/2' : ''}`} style={facility.progress === undefined ? undefined : { width: `${facility.progress[['Clinicians', 'Patients'].includes(label) ? label.toLowerCase() : 'messages'] ?? 0}%` }} /></div></section>)}
      </div>
      <dl className="mt-3 space-y-2 text-xs leading-5">
        <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-3"><dt className="text-[#7A8190]">Facility Admin</dt><dd className="min-w-0"><span data-facility-admin-name className="break-words font-medium">{facility.admin?.name || 'Not available'}</span><span aria-hidden="true" className="mx-1 hidden sm:inline">•</span><span data-facility-admin-email className="block break-all text-[#52556C] sm:inline">{facility.admin?.email || 'Not available'}</span></dd></div>
        <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-3"><dt className="text-[#7A8190]">Subscription date</dt><dd>{formatRenewalDate(facility.subscriptionDate)}</dd></div>
        <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-3"><dt className="text-[#7A8190]">{billing.dateLabel}</dt><dd>{formatRenewalDate(billing.date)}</dd></div>
        <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-3"><dt className="text-[#7A8190]">Payment method</dt><dd>{billing.paymentMethod}</dd></div>
        <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-3"><dt className="text-[#7A8190]">Subscription Value</dt><dd className="font-medium">{billing.freeTrial ? '₦0 (Free trial)' : billing.amount !== null ? formatNaira(billing.amount) : 'Not available'}{!billing.freeTrial && <span className="ml-2 text-xs font-normal text-[#7A8190]">{facility.billingCycle} billing</span>}</dd></div>
        <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-3"><dt className="text-[#7A8190]">Status</dt><dd><span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${badge?.color || 'bg-[#F6F7FB] text-[#7A8190]'}`}>{badge?.label || facility.statusLabel || 'Unavailable'}</span></dd></div>
      </dl>
    </dialog>, document.body,
  )
}
