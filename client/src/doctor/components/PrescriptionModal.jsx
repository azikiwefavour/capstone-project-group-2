import { useEffect, useMemo, useRef, useState } from 'react'
import DoctorIcon from './DoctorIcon'
import PrescriptionDialog from './PrescriptionDialog'
import {
  durationOptions,
  frequencyOptions,
  validateMedicationDetails,
  validateSingleMedicationItem,
  getModificationValues,
  validateModificationDetails,
} from './medicationForm'
import { checkMedicationDuplicate } from './medicationDuplicates'
import MedicationReview, { ReviewCard } from './MedicationReview'

const fields = [
  { key: 'medication', label: 'Medication', placeholder: 'Start typing...', fullWidth: true },
  { key: 'dose', label: 'Dose', placeholder: 'e.g. 500mg' },
  { key: 'frequency', label: 'Frequency', placeholder: 'Select frequency', options: frequencyOptions },
  { key: 'duration', label: 'Duration', placeholder: 'Select duration', options: durationOptions, fullWidth: true },
  { key: 'reason', label: 'Reason', placeholder: 'e.g. Bacterial infection', fullWidth: true },
]
const primaryButtonClassName = 'inline-flex h-9 items-center justify-center rounded-xl bg-[#475AA2] px-4 text-[13px] font-semibold text-white transition hover:bg-[#3D4F91] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25 disabled:cursor-not-allowed disabled:opacity-45'

function PrescriptionModal({
  patient,
  onClose,
  duplicateRecords = null,
  developmentPreviewValues = null,
  mode = 'add',
  prescription = null,
  onSubmitPrescription = null,
}) {
  const modifying = mode === 'modify'
  const title = modifying ? 'Modify prescription' : 'Add medication'
  const idPrefix = modifying ? 'modify-prescription' : 'add-medication'
  // Visual fixtures are accepted only in Vite development mode, never as backend records.
  const previewValues = import.meta.env.DEV && !modifying ? developmentPreviewValues : null
  const dialogRef = useRef(null)
  const [step, setStep] = useState(previewValues ? 'review' : 'details')

  // Modification / single-mode state
  const [originalValues] = useState(() => getModificationValues(prescription))
  const [values, setValues] = useState(() =>
    modifying
      ? { ...originalValues }
      : previewValues
        ? { ...previewValues }
        : { medication: '', dose: '', frequency: '', duration: '', reason: '' }
  )
  const [touched, setTouched] = useState({})

  // Multi-item mode state
  const [items, setItems] = useState(() => {
    if (previewValues) {
      return [{
        id: 'preview-1',
        medication: previewValues.medication || '',
        dose: previewValues.dose || '',
        frequency: previewValues.frequency || '',
        duration: previewValues.duration || '',
      }]
    }
    return []
  })
  const [currentItem, setCurrentItem] = useState({
    medication: '',
    dose: '',
    frequency: '',
    duration: '',
  })
  const [currentTouched, setCurrentTouched] = useState({})
  const [itemErrors, setItemErrors] = useState({})
  const [reason, setReason] = useState(() => previewValues?.reason || '')
  const [reasonTouched, setReasonTouched] = useState(false)
  const [generalError, setGeneralError] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [saveUncertain, setSaveUncertain] = useState(false)
  const submissionInFlight = useRef(false)
  const submitController = useRef(null)

  // Modify validation
  const modifyErrors = modifying ? validateModificationDetails(values, originalValues) : {}
  const modifyValid = modifying && Object.keys(modifyErrors).length === 0

  // Multi-item validation
  const multiValues = useMemo(() => ({
    items,
    reason,
    medication: items[0]?.medication || '',
    dose: items[0]?.dose || '',
    frequency: items[0]?.frequency || '',
    duration: items[0]?.duration || '',
  }), [items, reason])

  const multiValid = !modifying && items.length > 0 && Boolean(reason.trim())
  const isValid = modifying ? modifyValid : multiValid

  const activeValues = modifying ? values : multiValues
  const duplicateResult = useMemo(
    () => (modifying ? { status: 'unavailable' } : checkMedicationDuplicate(activeValues, patient?.id, duplicateRecords)),
    [modifying, activeValues, patient?.id, duplicateRecords]
  )
  const previewResult = useMemo(() => (previewValues ? { status: 'found', existing: previewValues } : null), [previewValues])
  const showingPreview = Boolean(previewValues && fields.every(({ key }) => values[key] === previewValues[key]))
  const reviewResult = showingPreview ? previewResult : duplicateResult
  const canSubmit = !previewValues && isValid && (modifying || reviewResult.status === 'none')
    && typeof onSubmitPrescription === 'function' && !isSubmitting && !saveUncertain

  useEffect(() => () => submitController.current?.abort(), [])

  useEffect(() => {
    if (step === 'review') {
      dialogRef.current?.querySelector('[data-review-heading]')?.focus({ preventScroll: true })
    } else {
      dialogRef.current?.querySelector('input')?.focus({ preventScroll: true })
    }
  }, [step])

  function handleAddItem() {
    setGeneralError('')
    const errors = validateSingleMedicationItem(currentItem)
    if (Object.keys(errors).length > 0) {
      setItemErrors(errors)
      setCurrentTouched({ medication: true, dose: true, frequency: true, duration: true })
      return false
    }

    // Check duplicate within the current list
    const isLocalDuplicate = items.some(
      (item) => item.medication.trim().toLowerCase() === currentItem.medication.trim().toLowerCase()
    )
    if (isLocalDuplicate) {
      setGeneralError(`"${currentItem.medication.trim()}" has already been added to this prescription.`)
      return false
    }

    setItems((prev) => [
      ...prev,
      {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
        medication: currentItem.medication.trim(),
        dose: currentItem.dose.trim(),
        frequency: currentItem.frequency.trim(),
        duration: currentItem.duration.trim(),
      },
    ])
    setCurrentItem({ medication: '', dose: '', frequency: '', duration: '' })
    setCurrentTouched({})
    setItemErrors({})
    return true
  }

  function handleRemoveItem(id) {
    setItems((prev) => prev.filter((item) => item.id !== id))
    setGeneralError('')
  }

  function reviewMedication(event) {
    event.preventDefault()
    setSubmitError('')
    setGeneralError('')

    if (modifying) {
      if (modifyValid) setStep('review')
      else setTouched(Object.fromEntries(fields.map(({ key }) => [key, true])))
      return
    }

    // If doctor filled fields but didn't click "Add", auto-add it if valid
    let finalItems = [...items]
    if (currentItem.medication.trim()) {
      const errors = validateSingleMedicationItem(currentItem)
      if (Object.keys(errors).length === 0) {
        const newItem = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
          medication: currentItem.medication.trim(),
          dose: currentItem.dose.trim(),
          frequency: currentItem.frequency.trim(),
          duration: currentItem.duration.trim(),
        }
        finalItems.push(newItem)
        setItems(finalItems)
        setCurrentItem({ medication: '', dose: '', frequency: '', duration: '' })
        setCurrentTouched({})
        setItemErrors({})
      }
    }

    if (finalItems.length === 0) {
      setGeneralError('Please add at least one medication before reviewing.')
      setCurrentTouched({ medication: true, dose: true, frequency: true, duration: true })
      setItemErrors(validateSingleMedicationItem(currentItem))
      return
    }

    setReasonTouched(true)
    if (!reason.trim()) {
      return
    }

    setStep('review')
  }

  async function submitPrescription() {
    if (submissionInFlight.current || !canSubmit || step !== 'review') return
    submissionInFlight.current = true
    const controller = new AbortController()
    submitController.current = controller
    setIsSubmitting(true)
    setSubmitError('')
    try {
      const payload = modifying ? { ...values } : { ...multiValues }
      await onSubmitPrescription(payload, controller.signal)
    } catch (error) {
      if (!controller.signal.aborted) {
        setSubmitError(error.message || 'Unable to submit prescription. Please try again.')
        setSaveUncertain(Boolean(error.saveUncertain))
      }
    } finally {
      submissionInFlight.current = false
      if (!controller.signal.aborted) setIsSubmitting(false)
    }
  }

  return (
    <PrescriptionDialog
      patient={patient}
      title={title}
      idPrefix={idPrefix}
      onClose={() => {
        if (!submissionInFlight.current) onClose()
      }}
      dialogRef={dialogRef}
    >
      <ol aria-label="Prescription progress" className="my-2.5 flex items-center gap-2 text-[13px] leading-5 font-medium">
        {[['details', 'Details'], ['review', 'Review']].map(([value, label], index) => (
          <li key={value} className="flex flex-1 items-center gap-2 last:flex-none">
            <button
              type="button"
              aria-current={step === value ? 'step' : undefined}
              aria-label={step === 'review' && value === 'details' ? 'Details, completed' : undefined}
              disabled={isSubmitting || (value === 'review' && !isValid)}
              onClick={() => setStep(value)}
              className={`inline-flex items-center gap-2 rounded-sm focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15 disabled:cursor-not-allowed ${
                step === value ? 'text-[#475AA2] font-semibold' : step === 'review' && value === 'details' ? 'text-[#2F7D59]' : 'text-[#7A8190]'
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                  step === value
                    ? 'bg-[#475AA2] text-white'
                    : step === 'review' && value === 'details'
                      ? 'bg-[#D0E7DC] text-[#2F7D59]'
                      : 'border border-[#D8DCE5]'
                }`}
              >
                {step === 'review' && value === 'details' ? (
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
                    <path d="M4 10L8 14L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              {label}
            </button>
            {index === 0 && <span aria-hidden="true" className="h-px flex-1 bg-[#E2E5ED]" />}
          </li>
        ))}
      </ol>

      {step === 'details' ? (
        modifying ? (
          /* Modify Single Prescription Form */
          <form onSubmit={reviewMedication} noValidate aria-label="Medication details">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {fields.map((field) => {
                const error = touched[field.key] ? modifyErrors[field.key] : ''
                const originalOption = originalValues[field.key] || ''
                const options = field.options && originalOption.trim() && !field.options.includes(originalOption)
                  ? [...field.options, originalOption]
                  : field.options
                const inputProps = {
                  id: `medication-${field.key}`,
                  name: field.key,
                  value: values[field.key],
                  required: true,
                  onChange: (event) => setValues((current) => ({ ...current, [field.key]: event.target.value })),
                  onBlur: () => setTouched((current) => ({ ...current, [field.key]: true })),
                  'aria-invalid': Boolean(error),
                  'aria-describedby': error ? `medication-${field.key}-error` : undefined,
                  className: `h-10 w-full rounded-xl border bg-white px-3 text-sm outline-none transition placeholder:text-[#A6ADBA] focus:ring-4 ${
                    error ? 'border-[#E5484D] focus:ring-[#E5484D]/15' : 'border-[#D8DCE5] focus:border-[#475AA2] focus:ring-[#475AA2]/15'
                  }`,
                }
                return (
                  <div key={field.key} className={field.fullWidth ? 'sm:col-span-2' : ''}>
                    <label htmlFor={inputProps.id} className="mb-1 block text-[13px] leading-5 font-medium">
                      {field.label}
                    </label>
                    {options ? (
                      <select {...inputProps}>
                        <option value="">{field.placeholder}</option>
                        {options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input {...inputProps} type="text" placeholder={field.placeholder} />
                    )}
                    {error && <p id={`medication-${field.key}-error`} className="mt-1 text-xs font-medium text-[#E5484D]">{error}</p>}
                  </div>
                )
              })}
            </div>
            <button type="submit" disabled={!modifyValid} className={`mt-3 ${primaryButtonClassName}`}>
              Review medication
            </button>
          </form>
        ) : (
          /* Multi-Drug Add Form matching design */
          <form onSubmit={reviewMedication} noValidate aria-label="Add medications">
            {/* Medication Entry Card */}
            <div className="rounded-2xl border border-[#E2E5ED] bg-[#F7F8FB] p-3.5">
              {/* Medication Name */}
              <div>
                <label htmlFor="medication-name-input" className="mb-1 block text-[13px] leading-5 font-medium text-[#111827]">
                  Medication
                </label>
                <input
                  id="medication-name-input"
                  type="text"
                  placeholder="Start typing...."
                  value={currentItem.medication}
                  onChange={(e) => {
                    setCurrentItem((prev) => ({ ...prev, medication: e.target.value }))
                    if (itemErrors.medication) setItemErrors((prev) => ({ ...prev, medication: '' }))
                  }}
                  onBlur={() => setCurrentTouched((prev) => ({ ...prev, medication: true }))}
                  className={`h-10 w-full rounded-xl border bg-white px-3 text-sm outline-none transition placeholder:text-[#A6ADBA] focus:ring-4 ${
                    currentTouched.medication && itemErrors.medication
                      ? 'border-[#E5484D] focus:ring-[#E5484D]/15'
                      : 'border-[#D8DCE5] focus:border-[#475AA2] focus:ring-[#475AA2]/15'
                  }`}
                />
                {currentTouched.medication && itemErrors.medication && (
                  <p className="mt-1 text-xs text-[#E5484D]">{itemErrors.medication}</p>
                )}
              </div>

              {/* Dose & Frequency Grid */}
              <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                  <label htmlFor="medication-dose-input" className="mb-1 block text-[13px] leading-5 font-medium text-[#111827]">
                    Dose
                  </label>
                  <input
                    id="medication-dose-input"
                    type="text"
                    placeholder="e.g 500mg"
                    value={currentItem.dose}
                    onChange={(e) => {
                      setCurrentItem((prev) => ({ ...prev, dose: e.target.value }))
                      if (itemErrors.dose) setItemErrors((prev) => ({ ...prev, dose: '' }))
                    }}
                    onBlur={() => setCurrentTouched((prev) => ({ ...prev, dose: true }))}
                    className={`h-10 w-full rounded-xl border bg-white px-3 text-sm outline-none transition placeholder:text-[#A6ADBA] focus:ring-4 ${
                      currentTouched.dose && itemErrors.dose
                        ? 'border-[#E5484D] focus:ring-[#E5484D]/15'
                        : 'border-[#D8DCE5] focus:border-[#475AA2] focus:ring-[#475AA2]/15'
                    }`}
                  />
                  {currentTouched.dose && itemErrors.dose && (
                    <p className="mt-1 text-xs text-[#E5484D]">{itemErrors.dose}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="medication-frequency-select" className="mb-1 block text-[13px] leading-5 font-medium text-[#111827]">
                    Frequency
                  </label>
                  <select
                    id="medication-frequency-select"
                    value={currentItem.frequency}
                    onChange={(e) => {
                      setCurrentItem((prev) => ({ ...prev, frequency: e.target.value }))
                      if (itemErrors.frequency) setItemErrors((prev) => ({ ...prev, frequency: '' }))
                    }}
                    onBlur={() => setCurrentTouched((prev) => ({ ...prev, frequency: true }))}
                    className={`h-10 w-full rounded-xl border bg-white px-3 text-sm outline-none transition placeholder:text-[#A6ADBA] focus:ring-4 ${
                      currentTouched.frequency && itemErrors.frequency
                        ? 'border-[#E5484D] focus:ring-[#E5484D]/15'
                        : 'border-[#D8DCE5] focus:border-[#475AA2] focus:ring-[#475AA2]/15'
                    }`}
                  >
                    <option value="">Select frequency..</option>
                    {frequencyOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {currentTouched.frequency && itemErrors.frequency && (
                    <p className="mt-1 text-xs text-[#E5484D]">{itemErrors.frequency}</p>
                  )}
                </div>
              </div>

              {/* Duration */}
              <div className="mt-2.5">
                <label htmlFor="medication-duration-select" className="mb-1 block text-[13px] leading-5 font-medium text-[#111827]">
                  Duration
                </label>
                <select
                  id="medication-duration-select"
                  value={currentItem.duration}
                  onChange={(e) => {
                    setCurrentItem((prev) => ({ ...prev, duration: e.target.value }))
                    if (itemErrors.duration) setItemErrors((prev) => ({ ...prev, duration: '' }))
                  }}
                  onBlur={() => setCurrentTouched((prev) => ({ ...prev, duration: true }))}
                  className={`h-10 w-full rounded-xl border bg-white px-3 text-sm outline-none transition placeholder:text-[#A6ADBA] focus:ring-4 ${
                    currentTouched.duration && itemErrors.duration
                      ? 'border-[#E5484D] focus:ring-[#E5484D]/15'
                      : 'border-[#D8DCE5] focus:border-[#475AA2] focus:ring-[#475AA2]/15'
                  }`}
                >
                  <option value="">Select duration..</option>
                  {durationOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {currentTouched.duration && itemErrors.duration && (
                  <p className="mt-1 text-xs text-[#E5484D]">{itemErrors.duration}</p>
                )}
              </div>

              {/* Add Button */}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-[#475AA2] px-4 text-[13px] font-semibold text-white shadow-xs transition hover:bg-[#3D4F91] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25"
                >
                  Add
                </button>
              </div>

              {/* List of Added Drugs Chips */}
              {items.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-[#E2E5ED]">
                  {items.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#D8DCE5] bg-white px-3 py-1.5 text-xs text-[#111827] shadow-xs transition"
                    >
                      <span>
                        {item.medication}, {item.dose}, {item.frequency} for {item.duration}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        aria-label={`Remove ${item.medication}`}
                        title="Remove drug"
                        className="text-[#7A8190] hover:text-[#E5484D] focus:outline-none"
                      >
                        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
                          <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Reason Field */}
            <div className="mt-3">
              <label htmlFor="prescription-reason-input" className="mb-1 block text-[13px] leading-5 font-medium text-[#111827]">
                Reason
              </label>
              <input
                id="prescription-reason-input"
                type="text"
                placeholder="e.g Bacterial Infection"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  setGeneralError('')
                }}
                onBlur={() => setReasonTouched(true)}
                className={`h-10 w-full rounded-xl border bg-white px-3 text-sm outline-none transition placeholder:text-[#A6ADBA] focus:ring-4 ${
                  reasonTouched && !reason.trim()
                    ? 'border-[#E5484D] focus:ring-[#E5484D]/15'
                    : 'border-[#D8DCE5] focus:border-[#475AA2] focus:ring-[#475AA2]/15'
                }`}
              />
              {reasonTouched && !reason.trim() && (
                <p className="mt-1 text-xs text-[#E5484D]">A reason for the prescription is required.</p>
              )}
            </div>

            {generalError && (
              <p role="alert" className="mt-2 text-xs font-medium text-[#E5484D]">
                {generalError}
              </p>
            )}

            {/* Review Button */}
            <div className="mt-3.5">
              <button
                type="submit"
                disabled={items.length === 0 && !currentItem.medication.trim()}
                className={`w-full sm:w-auto ${primaryButtonClassName}`}
              >
                Review medication
              </button>
            </div>
          </form>
        )
      ) : (
        /* Review Step */
        <section aria-label="Review medication" aria-busy={isSubmitting}>
          {modifying ? (
            <ReviewCard title="Review prescriptions" fields={fields} values={values} />
          ) : (
            <MedicationReview fields={fields} values={activeValues} result={reviewResult} preview={showingPreview} />
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setStep('details')}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#DEE2F4] px-3.5 text-[13px] font-semibold text-[#475AA2] hover:bg-[#CCD2FF] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15"
            >
              <DoctorIcon type="back" className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={submitPrescription}
              aria-describedby={!canSubmit ? 'medication-save-unavailable' : undefined}
              className={`ml-auto ${primaryButtonClassName}`}
            >
              {isSubmitting ? 'Submitting...' : modifying ? 'Save changes' : 'Submit prescription'}
            </button>
          </div>

          {submitError && <p role="alert" className="mt-2 text-xs text-[#E5484D]">{submitError}</p>}
          {!canSubmit && (
            <p id="medication-save-unavailable" className="mt-2 text-xs text-[#7A8190]">
              {isSubmitting
                ? 'Saving prescription...'
                : saveUncertain
                  ? 'Close this popup and review the refreshed records before trying again.'
                  : modifying
                    ? 'Saving prescription changes is not available yet. No changes have been saved.'
                    : previewValues
                      ? 'Development preview only. Prescription submission remains unavailable.'
                      : duplicateResult.status === 'found'
                        ? 'An exact duplicate exists. Submission is disabled until duplicate handling is confirmed.'
                        : 'Submission requires verified patient medication records and a completed duplicate check.'}
            </p>
          )}
        </section>
      )}
    </PrescriptionDialog>
  )
}

export default PrescriptionModal
