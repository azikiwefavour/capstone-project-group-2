import { useState } from 'react'
import PrescriptionDialog from './PrescriptionDialog'
import { ReviewCard } from './MedicationReview'
import { getModificationValues, validateDiscontinuationReason } from './medicationForm'

const fields = [
  { key: 'medication', label: 'Medication' },
  { key: 'dose', label: 'Dose' },
  { key: 'frequency', label: 'Frequency' },
  { key: 'duration', label: 'Duration' },
  { key: 'reason', label: 'Reason' },
]

export default function DiscontinuePrescriptionModal({ patient, prescription, onClose }) {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const error = touched ? validateDiscontinuationReason(reason) : ''
  const originalValues = getModificationValues(prescription)
  const displayValues = Object.fromEntries(Object.entries(originalValues).map(([key, value]) => [key, value.trim() || '\u2014']))

  return <PrescriptionDialog patient={patient} title="Discontinue prescription" subtitle="Provide reasons" idPrefix="discontinue-prescription" onClose={onClose}>
    <form noValidate aria-label="Discontinue prescription" className="mt-3" onSubmit={(event) => {
      event.preventDefault()
      setTouched(true)
      // No discontinuation API is integrated. Never change or submit the record here.
    }}>
      <label htmlFor="discontinuation-reason" className="mb-1 block text-[13px] leading-5 font-medium">Reason</label>
      <input id="discontinuation-reason" name="discontinuationReason" type="text" required placeholder="Patient is..." value={reason}
        onChange={(event) => setReason(event.target.value)} onBlur={() => setTouched(true)}
        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); setTouched(true) } }}
        aria-invalid={Boolean(error)} aria-describedby={error ? 'discontinuation-reason-error' : undefined}
        className={`h-10 w-full rounded-xl border bg-white px-3 text-base outline-none transition placeholder:text-[#A6ADBA] focus:ring-4 ${error ? 'border-[#E5484D] focus:ring-[#E5484D]/15' : 'border-[#D8DCE5] focus:border-[#475AA2] focus:ring-[#475AA2]/15'}`} />
      {error && <p id="discontinuation-reason-error" role="alert" className="mt-1 text-xs font-medium text-[#E5484D]">{error}</p>}
      <div className="mt-3"><ReviewCard title="Prescription details" fields={fields} values={displayValues} /></div>
      {/* Reason validation does not enable submission before backend support is confirmed. */}
      <button type="submit" disabled aria-describedby="discontinuation-unavailable" title="Prescription discontinuation is not available yet"
        className="mt-3 inline-flex h-9 items-center justify-center rounded-xl bg-[#475AA2] px-3 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">Discontinue prescription</button>
      <p id="discontinuation-unavailable" className="mt-2 text-xs text-[#7A8190]">Prescription discontinuation is not available yet. No changes have been made.</p>
    </form>
  </PrescriptionDialog>
}
