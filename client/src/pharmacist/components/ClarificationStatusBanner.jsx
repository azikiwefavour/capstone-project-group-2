import { useState } from 'react'
import { getClarificationStatus } from '../prescriptions'

export default function ClarificationStatusBanner({ clarification, doctorName }) {
  const [dismissed, setDismissed] = useState(false)
  const pending = clarification.status === 'awaiting_clarification'
  const doctor = doctorName ? (/^dr\.?\s+/i.test(doctorName) ? doctorName.replace(/^dr\.?\s+/i, 'Dr. ') : `Dr. ${doctorName}`) : ''
  if (pending) {
    const waiting = clarification.response ? 'A response is available; the request is still marked pending.' : doctor ? `Waiting for ${doctor} to respond.` : 'Waiting for the prescriber to respond.'
    return <>
      {!dismissed && <section aria-label="Clarification status" className="mt-4 flex w-full flex-wrap items-center gap-3 rounded-[10px] bg-[#FA7319] px-4 py-3 text-[13px] leading-5 text-white lg:h-11 lg:flex-nowrap lg:px-12">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="order-1 h-5 w-5 shrink-0"><path d="M12 3L22 20H2L12 3ZM12 9V13M12 16H12.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <h2 className="order-2 min-w-0 flex-1 font-semibold lg:flex-none lg:whitespace-nowrap">Pending clarification</h2>
        <p className="order-4 min-w-0 basis-full truncate pl-8 lg:order-3 lg:flex-1 lg:basis-auto lg:pl-0" title={`Concern: ${clarification.concern || 'Concern unavailable'} — Notes: ${clarification.notes || 'Clarification notes unavailable'}`}><span className="font-semibold">Concern: </span>{clarification.concern || 'Concern unavailable'}<span className="mx-2" aria-hidden="true">·</span><span className="font-semibold">Notes: </span>{clarification.notes || 'Clarification notes unavailable'}</p>
        <p className="order-5 min-w-0 basis-full break-words pl-8 lg:order-4 lg:max-w-[40%] lg:shrink-0 lg:basis-auto lg:truncate lg:pl-0" title={waiting}>{waiting}</p>
        <button type="button" aria-label="Dismiss clarification status" title="Hide from this view" onClick={() => setDismissed(true)} className="order-3 ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white lg:order-5">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      </section>}
      {clarification.response && <section aria-label="Prescriber response" className="mt-3 rounded-lg border border-[#DEE2F4] bg-[#EEF0FF] p-4 text-[13px] leading-5 text-[#475AA2]"><h3 className="font-semibold">Prescriber response</h3><p className="mt-1 whitespace-pre-wrap break-words">{clarification.response}</p></section>}
    </>
  }
  if (dismissed) return null
  return <section aria-label="Clarification status" className={`mt-4 flex items-start gap-3 rounded-xl border p-4 ${pending ? 'border-[#F2D2A7] bg-[#FFF4E5] text-[#9A5B13]' : 'border-[#DEE2F4] bg-[#EEF0FF] text-[#475AA2]'}`}>
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0"><path d="M12 3L22 20H2L12 3ZM12 9V13M12 16H12.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    <div className="min-w-0 flex-1 text-[13px] leading-5">
      <h2 className="font-semibold">{getClarificationStatus(clarification.status)}</h2>
      <p className="mt-1 break-words"><span className="font-semibold">Concern: </span>{clarification.concern || 'Concern unavailable'}</p>
      <p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words" title={clarification.notes || undefined}><span className="font-semibold">Notes: </span>{clarification.notes || 'Clarification notes unavailable'}</p>
      {clarification.response ? <div className="mt-3 border-t border-current/15 pt-3"><h3 className="font-semibold">Prescriber response</h3><p className="mt-1 whitespace-pre-wrap break-words">{clarification.response}</p>{pending && <p className="mt-2">A response is available; the request is still marked pending.</p>}</div>
        : pending ? <p className="mt-2">{doctor ? `Waiting for ${doctor} to respond.` : 'Waiting for the prescriber to respond.'}</p>
          : <p className="mt-2">Prescriber response unavailable.</p>}
    </div>
    <button type="button" aria-label="Dismiss clarification status" title="Hide from this view" onClick={() => setDismissed(true)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-current">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
    </button>
  </section>
}
