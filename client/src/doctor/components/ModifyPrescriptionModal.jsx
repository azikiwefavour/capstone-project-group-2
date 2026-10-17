import PrescriptionModal from './PrescriptionModal'

export default function ModifyPrescriptionModal({ patient, prescription, onClose }) {
  return <PrescriptionModal mode="modify" patient={patient} prescription={prescription} onClose={onClose} />
}
