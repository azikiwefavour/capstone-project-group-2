import { useState } from 'react'
import PrescriptionDialog from '../../doctor/components/PrescriptionDialog'
import PharmacistPrescriptionInformation from './PharmacistPrescriptionInformation'

export default function VerifyPrescriptionModal({ patient, prescription, onClose, onVerify }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  async function handleVerify(e) {
    e?.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setSubmitError('')
    try {
      await onVerify()
    } catch (err) {
      setSubmitError(err?.message || 'Unable to verify prescription. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <PrescriptionDialog
      patient={patient}
      title="Verify prescription"
      subtitle="Be sure to review the prescription details before verification. Your name and time will be logged."
      idPrefix="pharmacist-verify-prescription"
      onClose={isSubmitting ? () => {} : onClose}
    >
      <PharmacistPrescriptionInformation prescription={prescription} divided />

      {submitError && (
        <p role="alert" className="mt-3 text-xs font-medium text-[#E5484D]">
          {submitError}
        </p>
      )}

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onClose}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#D8DCE5] bg-[#F7F8FB] px-4 py-2 text-sm font-semibold text-[#475AA2] transition hover:bg-[#EEF1F8] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleVerify}
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#475AA2] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#3D4F91] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Verifying & dispensing...' : 'Verify and dispense prescription'}
        </button>
      </div>
    </PrescriptionDialog>
  )
}

