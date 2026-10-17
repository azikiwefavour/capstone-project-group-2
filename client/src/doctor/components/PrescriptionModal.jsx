import { useEffect, useMemo, useRef, useState } from 'react'
import DoctorIcon from './DoctorIcon'
import PrescriptionDialog from './PrescriptionDialog'
import { durationOptions, frequencyOptions, validateMedicationDetails, getModificationValues, validateModificationDetails } from './medicationForm'
import { checkMedicationDuplicate } from './medicationDuplicates'
import MedicationReview, { ReviewCard } from './MedicationReview'

const fields = [
  { key: 'medication', label: 'Medication', placeholder: 'Start typing...', fullWidth: true },
  { key: 'dose', label: 'Dose', placeholder: 'e.g. 500 mg' },
  { key: 'frequency', label: 'Frequency', placeholder: 'Select frequency', options: frequencyOptions },
  { key: 'duration', label: 'Duration', placeholder: 'Select duration', options: durationOptions, fullWidth: true },
  { key: 'reason', label: 'Reason', placeholder: 'e.g. Bacterial infection', fullWidth: true },
]
const primaryButtonClassName = 'inline-flex h-9 items-center justify-center rounded-xl bg-[#475AA2] px-3 text-[13px] font-semibold text-white transition hover:bg-[#3D4F91] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25 disabled:cursor-not-allowed disabled:opacity-45'

function PrescriptionModal({ patient, onClose, duplicateRecords = null, developmentPreviewValues = null, mode = 'add', prescription = null }) {
  const modifying = mode === 'modify'
  const title = modifying ? 'Modify prescription' : 'Add medication'
  const idPrefix = modifying ? 'modify-prescription' : 'add-medication'
  // Visual fixtures are accepted only in Vite development mode, never as backend records.
  const previewValues = import.meta.env.DEV && !modifying ? developmentPreviewValues : null
  const dialogRef = useRef(null)
  const [step, setStep] = useState(previewValues ? 'review' : 'details')
  const [originalValues] = useState(() => getModificationValues(prescription))
  const [values, setValues] = useState(() => modifying ? { ...originalValues } : previewValues ? { ...previewValues } : { medication: '', dose: '', frequency: '', duration: '', reason: '' })
  const [touched, setTouched] = useState({})
  const errors = modifying ? validateModificationDetails(values, originalValues) : validateMedicationDetails(values)
  const isValid = Object.keys(errors).length === 0
  const duplicateResult = useMemo(() => modifying ? { status: 'unavailable' } : checkMedicationDuplicate(values, patient?.id, duplicateRecords), [modifying, values, patient?.id, duplicateRecords])
  const previewResult = useMemo(() => previewValues ? { status: 'found', existing: previewValues } : null, [previewValues])
  const showingPreview = Boolean(previewValues && fields.every(({ key }) => values[key] === previewValues[key]))
  const reviewResult = showingPreview ? previewResult : duplicateResult

  useEffect(() => {
    if (step === 'review') dialogRef.current.querySelector('[data-review-heading]')?.focus({ preventScroll: true })
    else dialogRef.current.querySelector('input')?.focus({ preventScroll: true })
  }, [step])

  function reviewMedication(event) {
    event.preventDefault()
    if (isValid) setStep('review')
    else setTouched(Object.fromEntries(fields.map(({ key }) => [key, true])))
  }

  return (
    <PrescriptionDialog patient={patient} title={title} idPrefix={idPrefix} onClose={onClose} dialogRef={dialogRef}>
      <ol aria-label="Prescription progress" className="my-2.5 flex items-center gap-2 text-[13px] leading-5 font-medium">
        {[['details', 'Details'], ['review', 'Review']].map(([value, label], index) => (
          <li key={value} className="flex flex-1 items-center gap-2 last:flex-none">
            <button type="button" aria-current={step === value ? 'step' : undefined} aria-label={step === 'review' && value === 'details' ? 'Details, completed' : undefined} disabled={value === 'review' && !isValid} onClick={() => setStep(value)} className={`inline-flex items-center gap-2 rounded-sm focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15 disabled:cursor-not-allowed ${step === value ? 'text-[#475AA2]' : step === 'review' && value === 'details' ? 'text-[#2F7D59]' : 'text-[#7A8190]'}`}>
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${step === value ? 'bg-[#475AA2] text-white' : step === 'review' && value === 'details' ? 'bg-[#D0E7DC] text-[#2F7D59]' : 'border border-[#D8DCE5]'}`}>
                {step === 'review' && value === 'details' ? <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4"><path d="M4 10L8 14L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> : index + 1}
              </span>{label}
            </button>
            {index === 0 && <span aria-hidden="true" className="h-px flex-1 bg-[#E2E5ED]" />}
          </li>
        ))}
      </ol>

      {step === 'details' ? <form onSubmit={reviewMedication} noValidate aria-label="Medication details">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {fields.map((field) => {
            const error = touched[field.key] ? errors[field.key] : ''
            const originalOption = modifying ? originalValues[field.key] : ''
            const options = field.options && originalOption.trim() && !field.options.includes(originalOption) ? [...field.options, originalOption] : field.options
            const inputProps = {
              id: `medication-${field.key}`, name: field.key, value: values[field.key], required: true,
              onChange: (event) => setValues((current) => ({ ...current, [field.key]: event.target.value })),
              onBlur: () => setTouched((current) => ({ ...current, [field.key]: true })),
              'aria-invalid': Boolean(error), 'aria-describedby': error ? `medication-${field.key}-error` : undefined,
              className: `h-10 w-full rounded-xl border bg-white px-3 text-base outline-none transition placeholder:text-[#A6ADBA] focus:ring-4 ${error ? 'border-[#E5484D] focus:ring-[#E5484D]/15' : 'border-[#D8DCE5] focus:border-[#475AA2] focus:ring-[#475AA2]/15'}`,
            }
            return <div key={field.key} className={field.fullWidth ? 'sm:col-span-2' : ''}>
              <label htmlFor={inputProps.id} className="mb-1 block text-[13px] leading-5 font-medium">{field.label}</label>
              {options ? <select {...inputProps}><option value="">{field.placeholder}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                : <input {...inputProps} type="text" placeholder={field.placeholder} />}
              {error && <p id={`medication-${field.key}-error`} className="mt-1 text-xs font-medium text-[#E5484D]">{error}</p>}
            </div>
          })}
        </div>
        <button type="submit" disabled={!isValid} className={`mt-3 ${primaryButtonClassName}`}>Review medication</button>
      </form> : <section aria-label="Review medication">
        {modifying ? <ReviewCard title="Review prescriptions" fields={fields} values={values} /> : <MedicationReview fields={fields} values={values} result={reviewResult} preview={showingPreview} />}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => setStep('details')} className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#DEE2F4] px-3 text-[13px] font-semibold text-[#475AA2] hover:bg-[#CCD2FF] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15"><DoctorIcon type="back" className="h-4 w-4" />Back</button>
          {/* No creation or modification API is integrated. Review never changes a record. */}
          <button type="button" disabled aria-describedby="medication-save-unavailable" title={modifying ? 'Prescription modification is not available yet' : 'Prescription submission is not available yet'} className={`ml-auto ${primaryButtonClassName}`}>{modifying ? 'Save changes' : 'Submit prescription'}</button>
        </div>
        <p id="medication-save-unavailable" className="mt-2 text-xs text-[#7A8190]">{modifying ? 'Saving prescription changes is not available yet. No changes have been saved.' : showingPreview ? 'Development preview only. Prescription submission remains unavailable.' : duplicateResult.status === 'found' ? 'An exact duplicate exists. Submission is disabled until duplicate handling is confirmed.' : 'Prescription submission is not available yet.'}</p>
      </section>}
    </PrescriptionDialog>
  )
}

export default PrescriptionModal
