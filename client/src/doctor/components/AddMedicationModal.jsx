import PrescriptionModal from './PrescriptionModal'

export default function AddMedicationModal({ patient, onClose, duplicateRecords = null, developmentPreviewValues = null, onSubmitPrescription = null }) {
  return <PrescriptionModal patient={patient} onClose={onClose} duplicateRecords={duplicateRecords} developmentPreviewValues={developmentPreviewValues} onSubmitPrescription={onSubmitPrescription} />
}
