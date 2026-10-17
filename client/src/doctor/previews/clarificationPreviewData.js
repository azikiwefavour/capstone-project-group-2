// Fictional visual fixtures. This module is lazy-loaded only in Vite development
// and never supplies data to real lists, route selection state, storage, or APIs.
export const previewClarification = {
  id: 'preview',
  patient: { id: 'sample-patient-preview', name: 'Sample Patient (preview)', age: 34, gender: 'Female' },
  sentBy: { name: 'Sample Pharmacist (preview)' },
  concern: 'Dose clarification (sample)',
  note: 'Sample note: Please confirm the prescribed dose.',
  date: '2026-10-17T08:30:00Z',
  prescription: {
    id: 'sample-prescription-preview',
    name: 'Sample medication (preview)',
    dose: '500 mg',
    frequency: 'Twice daily',
    duration: '7 days',
    reason: 'Sample prescription reason',
  },
}
