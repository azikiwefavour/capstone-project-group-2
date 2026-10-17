import PrescriptionModal from './PrescriptionModal'

export default function ModifyPrescriptionModal({ patient, prescription, onClose, onSubmitPrescription = null }) {
  return <PrescriptionModal mode="modify" patient={patient} prescription={prescription} onClose={onClose} onSubmitPrescription={onSubmitPrescription} />
}
