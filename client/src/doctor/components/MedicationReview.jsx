import { useState } from 'react'

export function ReviewCard({ title, fields, values, comparison = false, existing = false }) {
  return (
    <div className={`min-w-0 rounded-2xl border bg-[#F7F8FB] p-4 ${existing ? 'border-[#F8B4C0] bg-[#FFF5F7]' : 'border-[#E2E5ED]'}`}>
      <h3
        tabIndex={-1}
        data-review-heading={!existing ? '' : undefined}
        className={`text-sm font-semibold focus:outline-none ${existing ? 'text-[#B83F5C]' : 'text-[#111827]'}`}
      >
        {title}
      </h3>
      <dl className="mt-3 divide-y divide-[#E2E5ED]/70">
        {fields.map(({ key, label }) => {
          const val = values?.[key]
          const displayVal = typeof val === 'string' ? val.trim() : (val || '—')
          return (
            <div
              key={key}
              className={`flex items-center justify-between py-2 text-[13px] leading-5 ${
                comparison ? 'gap-2' : 'gap-4'
              }`}
            >
              <dt className="text-[#7A8190] shrink-0">{label}</dt>
              <dd className={`break-words text-right font-medium ${existing ? 'text-[#B83F5C]' : 'text-[#111827]'}`}>
                {displayVal}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}

export function MultiItemReviewCard({ values, onRemoveItem }) {
  const items = Array.isArray(values?.items) ? values.items : []
  const illness = values?.illness || values?.reason || '—'
  const symptoms = values?.symptoms || '—'

  return (
    <div className="min-w-0 rounded-2xl border border-[#E2E5ED] bg-[#F7F8FB] p-4">
      <div className="flex items-center justify-between border-b border-[#E2E5ED] pb-3">
        <h3 tabIndex={-1} data-review-heading="" className="text-sm font-semibold text-[#111827] focus:outline-none">
          Review prescriptions
        </h3>
        <span className="rounded-full bg-[#DEE2F4] px-2.5 py-0.5 text-xs font-semibold text-[#475AA2]">
          {items.length} {items.length === 1 ? 'medication' : 'medications'}
        </span>
      </div>

      {/* Medication Chips / Rows with Remove Button matching Frame 38 */}
      <div className="mt-3 space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id || index}
            className="flex items-center justify-between gap-3 rounded-xl border border-[#D8DCE5] bg-white px-3 py-2 text-xs text-[#111827] shadow-xs"
          >
            <span className="font-medium text-[#111827]">
              {item.medication}, {item.dose}, {item.frequency} for {item.duration}
            </span>
            {typeof onRemoveItem === 'function' && (
              <button
                type="button"
                onClick={() => onRemoveItem(item.id)}
                aria-label={`Remove ${item.medication}`}
                title="Remove drug"
                className="text-[#7A8190] hover:text-[#E5484D] focus:outline-none cursor-pointer"
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
                  <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Illness and Symptoms Rows matching Frame 38 */}
      <div className="mt-4 border-t border-[#E2E5ED] pt-3 text-xs divide-y divide-[#E2E5ED]/70">
        <div className="flex items-center justify-between py-2">
          <span className="text-[#7A8190] font-medium">Illness</span>
          <span className="font-semibold text-[#111827] break-words text-right">{illness}</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-[#7A8190] font-medium">Symptoms</span>
          <span className="font-semibold text-[#111827] break-words text-right">{symptoms}</span>
        </div>
      </div>
    </div>
  )
}

function MedicationReview({ fields, values, result, preview = false, onRemoveItem }) {
  const [dismissedResult, setDismissedResult] = useState(null)
  const [showExisting, setShowExisting] = useState(false)
  const duplicateFound = result?.status === 'found'
  const isMulti = Array.isArray(values?.items) && values.items.length > 0
  const existing = result?.existing || {}
  const duplicateMedName = result?.duplicateItem?.medication || existing.medication || existing.name || ''

  return (
    <>
      {duplicateFound && dismissedResult !== result && (
        <div
          role="alert"
          className="mb-3 overflow-hidden rounded-xl border border-[#E5484D] bg-[#FFF5F5] shadow-xs transition"
        >
          {/* Main notification bar */}
          <div className="flex items-center justify-between gap-2 bg-[#E5484D] px-3.5 py-2.5 text-white">
            <button
              type="button"
              onClick={() => setShowExisting((prev) => !prev)}
              className="flex flex-1 items-center gap-2 text-left text-[13px] font-semibold leading-5 text-white hover:opacity-95 focus:outline-none cursor-pointer"
              aria-expanded={showExisting}
              title="Click to view existing prescription details"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5 shrink-0">
                <path d="M12 3L22 20H2L12 3ZM12 9V13M12 16H12.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Duplicate found {duplicateMedName ? `(${duplicateMedName})` : ''}</span>
              <span className="ml-1.5 inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium text-white hover:bg-white/30 transition">
                <span>{showExisting ? 'Hide existing' : 'Click to view existing'}</span>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${showExisting ? 'rotate-180' : ''}`}
                >
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </span>
            </button>
            <button
              type="button"
              aria-label="Dismiss duplicate warning"
              title="Dismiss warning"
              onClick={() => setDismissedResult(result)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
                <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Expanded existing prescription details */}
          {showExisting && (
            <div className="border-t border-[#FCDAD7] bg-[#FFF5F5] p-3.5 text-xs text-[#111827]">
              <div className="flex items-center justify-between pb-2 border-b border-[#FCDAD7]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold uppercase tracking-wider text-[11px] text-[#B83F5C]">
                    Existing Prescription on Patient Record
                  </span>
                </div>
                {existing.status && (
                  <span className="rounded-full bg-[#FFE4E6] px-2 py-0.5 text-[10px] font-semibold text-[#B83F5C] uppercase tracking-wide">
                    {existing.status}
                  </span>
                )}
              </div>
              <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                <div>
                  <dt className="text-[#7A8190] text-[11px]">Medication</dt>
                  <dd className="font-semibold text-[#111827]">{existing.medication || existing.name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[#7A8190] text-[11px]">Dose</dt>
                  <dd className="font-semibold text-[#111827]">{existing.dose || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[#7A8190] text-[11px]">Frequency</dt>
                  <dd className="font-semibold text-[#111827]">{existing.frequency || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[#7A8190] text-[11px]">Duration</dt>
                  <dd className="font-semibold text-[#111827]">{existing.duration || '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[#7A8190] text-[11px]">Reason</dt>
                  <dd className="font-semibold text-[#111827]">{existing.reason || '—'}</dd>
                </div>
                {existing.prescribedBy && (
                  <div>
                    <dt className="text-[#7A8190] text-[11px]">Prescribed by</dt>
                    <dd className="font-semibold text-[#111827]">{existing.prescribedBy}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-white/70 px-2.5 py-1.5 border border-[#FCDAD7] text-[11px] text-[#7A8190]">
                <span>This patient is currently using or has been prescribed this medication.</span>
                <span className="font-medium text-[#475AA2]">Click Back to remove, or Submit to approve</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Review Card */}
      {isMulti ? (
        <MultiItemReviewCard values={values} onRemoveItem={onRemoveItem} />
      ) : (
        <ReviewCard title="Review prescriptions" fields={fields} values={values} />
      )}

      <p role={result?.status === 'unavailable' ? 'status' : undefined} className="mt-2 text-xs leading-relaxed text-[#7A8190]">
        {preview ? 'Sample comparison only. No duplicate check was performed.' : result?.status === 'unavailable'
          ? 'Duplicate checking is unavailable because complete patient medication records are not available. No duplicate conclusion has been made.'
          : 'MedTrailNG checks for exact duplicates only. It supports your decision and does not replace it.'}
      </p>
    </>
  )
}

export default MedicationReview
