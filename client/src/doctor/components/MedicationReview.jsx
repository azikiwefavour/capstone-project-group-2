import { useState } from 'react'

export function ReviewCard({ title, fields, values, comparison = false, existing = false }) {
  return (
    <div className="min-w-0 rounded-lg border border-[#E2E5ED] bg-[#F7F8FB] p-2.5">
      <h3 tabIndex={-1} data-review-heading={!existing ? '' : undefined} className={`text-sm font-semibold focus:outline-none ${existing ? 'text-[#B83F5C]' : ''}`}>{title}</h3>
      <dl className="mt-1">
        {fields.map(({ key, label }) => (
          <div key={key} className={`grid py-1.5 text-[13px] leading-5 ${comparison ? 'grid-cols-[72px_minmax(0,1fr)] gap-1.5' : 'grid-cols-[88px_minmax(0,1fr)] gap-2'}`}>
            <dt className="whitespace-nowrap text-[#7A8190]">{label}</dt>
            <dd className="min-w-0 break-words text-right font-medium">{values[key].trim()}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function MedicationReview({ fields, values, result, preview = false }) {
  const [dismissedResult, setDismissedResult] = useState(null)
  const duplicateFound = result.status === 'found'

  return (
    <>
      {duplicateFound && dismissedResult !== result && (
        <div role="alert" className="mb-2 flex items-center gap-2 rounded-lg bg-[#E5484D] px-2.5 py-1 text-[13px] leading-5 font-semibold text-white">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5 shrink-0"><path d="M12 3L22 20H2L12 3ZM12 9V13M12 16H12.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span>Duplicate found</span>
          <button type="button" aria-label="Dismiss duplicate warning" title="Dismiss warning" onClick={() => setDismissedResult(result)} className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-lg hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>
      )}
      {duplicateFound ? <div className="grid grid-cols-1 items-stretch gap-2 sm:grid-cols-2">
        <ReviewCard title="In review" fields={fields} values={values} comparison />
        <ReviewCard title="Existing" fields={fields} values={result.existing} comparison existing />
      </div> : <ReviewCard title="Review prescriptions" fields={fields} values={values} />}
      <p role={result.status === 'unavailable' ? 'status' : undefined} className="mt-2 text-xs leading-relaxed text-[#7A8190]">
        {preview ? 'Sample comparison only. No duplicate check was performed.' : result.status === 'unavailable'
          ? 'Duplicate checking is unavailable because complete patient medication records are not available. No duplicate conclusion has been made.'
          : 'MedTrailNG checks for exact duplicates only. It supports your decision and does not replace it.'}
      </p>
    </>
  )
}

export default MedicationReview
