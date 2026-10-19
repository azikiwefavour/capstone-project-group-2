import PrescriptionDialog from '../../doctor/components/PrescriptionDialog'
import PharmacistPrescriptionInformation from './PharmacistPrescriptionInformation'

export default function VerifyPrescriptionModal({ patient, prescription, onClose }) {
  return <PrescriptionDialog patient={patient} title="Verify prescription" subtitle="Be sure to review the prescription details before verification. Your name and time will be logged." idPrefix="pharmacist-verify-prescription" onClose={onClose}>
    <PharmacistPrescriptionInformation prescription={prescription} divided />
    <button type="button" disabled aria-describedby="pharmacist-verification-unavailable" className="mt-4 inline-flex min-h-9 items-center justify-center rounded-xl bg-[#475AA2] px-3 py-2 text-left text-[13px] font-semibold text-white disabled:cursor-not-allowed">Verify and dispense prescription</button>
    <p id="pharmacist-verification-unavailable" className="mt-2 text-xs leading-5 text-[#7A8190]">Verification and dispensing together are not available yet. The verification workflow must be confirmed before this action can be enabled. No changes will be submitted.</p>
  </PrescriptionDialog>
}
