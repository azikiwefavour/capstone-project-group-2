import { useState } from 'react'
import PrescriptionDialog from '../../doctor/components/PrescriptionDialog'
import PharmacistPrescriptionInformation from './PharmacistPrescriptionInformation'

export default function VerifyPrescriptionModal({ patient, prescription, medications = null, onClose, onVerify }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const isMulti = medications && medications.length > 1

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
      title={isMulti ? `Verify ${medications.length} prescriptions` : 'Verify prescription'}
      subtitle="Be sure to review the prescription details before verification. Your name and time will be logged."
      idPrefix="pharmacist-verify-prescription"
      onClose={isSubmitting ? () => {} : onClose}
    >
      {isMulti ? (
        <div className="mt-4 rounded-lg border border-[#E2E5ED] bg-[#F7F8FB] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#7A8190] mb-2.5">
            Medications to verify & dispense ({medications.length})
          </p>
          <div className="space-y-2.5 divide-y divide-[#E2E5ED]">
            {medications.map((m, idx) => (
              <div key={m.id || idx} className={idx > 0 ? 'pt-2.5' : ''}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-[#111827]">{m.medicationName || 'Medication'}</span>
                  <span className="font-medium text-[#475AA2]">{m.dosage || m.doseAndFrequency || '—'}</span>
                </div>
                {(m.frequency || m.duration) && (
                  <p className="text-xs text-[#7A8190] mt-0.5">
                    {m.frequency}{m.frequency && m.duration ? ' · ' : ''}{m.duration}
                  </p>
                )}
                {m.reason && <p className="text-xs text-[#7A8190] mt-0.5">Reason: {m.reason}</p>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <PharmacistPrescriptionInformation prescription={prescription} divided />
      )}

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
          {isSubmitting
            ? 'Verifying & dispensing...'
            : isMulti
              ? `Verify & dispense all ${medications.length} medications`
              : 'Verify and dispense prescription'}
        </button>
      </div>
    </PrescriptionDialog>
  )
}
