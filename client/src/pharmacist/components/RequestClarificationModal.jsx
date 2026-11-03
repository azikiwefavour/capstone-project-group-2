import { useState } from 'react'
import PrescriptionDialog from '../../doctor/components/PrescriptionDialog'
import usePrescriptionSubmission from '../../doctor/components/usePrescriptionSubmission'
import { clarificationConcerns, validateClarification } from '../clarificationForm'

export default function RequestClarificationModal({ patient, onClose, onSubmit }) {
  const [concern, setConcern] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})
  const submission = usePrescriptionSubmission(onSubmit)
  const close = () => { if (!submission.busy.current) onClose(submission.uncertain) }
  const locked = submission.isSubmitting || submission.uncertain

  return <PrescriptionDialog patient={patient} title="Request clarification" subtitle="Choose what you would like the prescriber to confirm." idPrefix="pharmacist-request-clarification" onClose={close}>
    <form noValidate aria-label="Request clarification" aria-busy={submission.isSubmitting} className="mt-4" onSubmit={event => {
      event.preventDefault()
      // Submit only through an explicit click on Submit request, not Enter in a field.
    }}>
      <fieldset disabled={locked} aria-describedby={errors.concern ? 'clarification-concern-error' : undefined}>
        <legend className="text-[13px] font-semibold text-[#111827]">Concern</legend>
        <div className="mt-2 space-y-2">
          {clarificationConcerns.map(option => <label key={option} className="flex items-center gap-2 py-1 text-[13px] text-[#52556C]">
            <input type="radio" name="concern" value={option} required checked={concern === option} onChange={() => setConcern(option)} aria-invalid={Boolean(errors.concern)} className="h-4 w-4 shrink-0 accent-[#475AA2] focus:ring-[#475AA2]" />{option}
          </label>)}
        </div>
      </fieldset>
      {errors.concern && <p id="clarification-concern-error" role="alert" className="mt-1 text-xs text-[#E5484D]">{errors.concern}</p>}
      <label htmlFor="clarification-notes" className="mb-2 mt-4 block text-[13px] font-semibold text-[#111827]">Notes</label>
      <div className="relative">
        <textarea id="clarification-notes" name="notes" placeholder="Start typing..." required minLength={10} maxLength={200} rows={5} value={notes} disabled={locked} onChange={event => setNotes(event.target.value)} aria-invalid={Boolean(errors.notes)} aria-describedby={`clarification-notes-count${errors.notes ? ' clarification-notes-error' : ''}`} className="block min-h-32 w-full resize-y rounded-xl border border-[#D8DCE5] bg-white px-3 pb-8 pt-3 text-sm text-[#111827] outline-none placeholder:text-[#A6ADBA] focus:border-[#475AA2] focus:ring-4 focus:ring-[#475AA2]/15 disabled:cursor-not-allowed" />
        <span id="clarification-notes-count" aria-live="polite" className="pointer-events-none absolute bottom-2 right-3 text-xs text-[#7A8190]">{notes.length}/200</span>
      </div>
      {errors.notes && <p id="clarification-notes-error" role="alert" className="mt-1 text-xs text-[#E5484D]">{errors.notes}</p>}
      {submission.error && <p role="alert" className="mt-3 text-xs leading-5 text-[#E5484D]">{submission.error}</p>}
      <div className="mt-4 flex items-center justify-between gap-3">
        <button type="button" disabled={submission.isSubmitting} onClick={close} className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[#DEE2F4] px-4 py-2 text-[13px] font-semibold text-[#475AA2] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15 disabled:cursor-not-allowed disabled:opacity-50">Back</button>
        <button type="button" disabled={locked} onClick={() => {
          const next = validateClarification({ concern, notes })
          setErrors(next)
          if (!Object.keys(next).length) submission.submit({ concern, notes })
        }} className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[#475AA2] px-4 py-2 text-[13px] font-semibold text-white focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25 disabled:cursor-not-allowed disabled:opacity-50">{submission.isSubmitting ? 'Submitting...' : 'Submit request'}</button>
      </div>
    </form>
  </PrescriptionDialog>
}
