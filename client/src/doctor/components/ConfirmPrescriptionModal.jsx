import { useState } from 'react'
import PrescriptionDialog from './PrescriptionDialog'
import { ReviewCard } from './MedicationReview'
import { getModificationValues } from './medicationForm'
import usePrescriptionSubmission from './usePrescriptionSubmission'

const fields = [
  { key: 'medication', label: 'Medication' },
  { key: 'dose', label: 'Dose' },
  { key: 'frequency', label: 'Frequency' },
  { key: 'duration', label: 'Duration' },
  { key: 'reason', label: 'Reason' },
]

export default function ConfirmPrescriptionModal({ patient, prescription, onClose, onSubmitPrescription = null }) {
  const [note, setNote] = useState('')
  const submission = usePrescriptionSubmission(onSubmitPrescription)
  const originalValues = getModificationValues(prescription)
  const displayValues = Object.fromEntries(Object.entries(originalValues).map(([key, value]) => [key, value.trim() || '\u2014']))

  return <PrescriptionDialog patient={patient} title="Confirm prescription" subtitle="The pharmacist will be told the prescription stands as written." idPrefix="confirm-prescription" onClose={() => { if (!submission.busy.current) onClose() }}>
    <form aria-label="Confirm prescription" aria-busy={submission.isSubmitting} className="mt-3" onSubmit={(event) => {
      event.preventDefault()
      submission.submit(note)
    }}>
      <ReviewCard title="Prescription details" fields={fields} values={displayValues} />
      <label htmlFor="confirmation-note" className="mb-1 mt-3 block text-[13px] leading-5 font-medium">Note to pharmacist (Optional)</label>
      <input id="confirmation-note" name="noteToPharmacist" type="text" placeholder="Patient is..." disabled={submission.isSubmitting} value={note} onChange={(event) => setNote(event.target.value)}
        className="h-10 w-full rounded-xl border border-[#D8DCE5] bg-white px-3 text-base outline-none transition placeholder:text-[#A6ADBA] focus:border-[#475AA2] focus:ring-4 focus:ring-[#475AA2]/15" />
      <button type="submit" disabled={!submission.available || submission.isSubmitting || submission.uncertain} aria-describedby={!submission.available || submission.uncertain ? 'confirmation-submit-unavailable' : undefined}
        className="mt-3 inline-flex h-9 items-center justify-center rounded-xl bg-[#475AA2] px-3 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">{submission.isSubmitting ? 'Submitting...' : 'Submit'}</button>
      {submission.error && <p role="alert" className="mt-2 text-xs text-[#E5484D]">{submission.error}</p>}
      {(!submission.available || submission.uncertain) && <p id="confirmation-submit-unavailable" className="mt-2 text-xs text-[#7A8190]">{submission.uncertain ? 'Close this popup and refresh the clarification before trying again.' : 'Prescription confirmation is not available yet. No confirmation or message has been sent.'}</p>}
    </form>
  </PrescriptionDialog>
}
