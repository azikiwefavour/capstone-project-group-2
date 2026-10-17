// Separate visual fixtures. These are never passed to the real duplicate detector.
export const duplicatePreviewValues = {
  medication: 'Sample medication (preview)',
  dose: '500 mg',
  frequency: 'Twice daily',
  duration: '7 days',
  reason: 'Sample preview indication',
}

// Fictional UI fixtures: never import these into a real patient data source or API request.
export const previewPatient = {
  id: 'preview',
  name: 'Miss. Jennifer',
  age: 34,
  gender: 'Female',
  currentMedications: [
    { id: 'preview-current-1', name: 'Amoxicillin', indication: 'Example prescription record', dose: '500mg', frequency: '3 times daily', duration: '7 days', prescribedBy: 'Dr. Preview Clinician', status: 'Active', date: '2026-10-17T09:30:00Z' },
    { id: 'preview-current-2', name: 'Paracetamol', indication: 'Example prescription record', dose: '500mg', frequency: 'As prescribed', duration: '3 days', prescribedBy: 'Dr. Preview Clinician', status: 'Unverified', date: '2026-10-17T10:15:00Z' },
    { id: 'preview-current-3', name: 'Cetirizine', indication: 'Example prescription record', dose: '10mg', frequency: 'Once daily', duration: '5 days', prescribedBy: 'Dr. Preview Clinician', status: 'Active', date: '2026-10-16T14:00:00Z' },
  ],
  medicationHistory: [
    { id: 'preview-history-1', name: 'Amoxicillin', indication: 'Example historical record', dose: '500mg', frequency: '3 times daily', duration: '7 days', prescribedBy: 'Dr. Preview Clinician', status: 'Active', date: '2026-09-01T09:00:00Z' },
    { id: 'preview-history-2', name: 'Paracetamol', indication: 'Example historical record', dose: '500mg', frequency: 'As prescribed', duration: '3 days', prescribedBy: 'Dr. Preview Clinician', status: 'Unverified', date: '2026-08-15T11:30:00Z' },
    { id: 'preview-history-3', name: 'Cetirizine', indication: 'Example discontinued prescription', dose: '10mg', frequency: 'Once daily', duration: '5 days', prescribedBy: 'Dr. Preview Clinician', status: 'Discontinued', date: '2026-08-01T08:45:00Z' },
  ],
}

// Preview-only event timestamps; no backend discontinuation field is assumed.
export const previewDiscontinuationTimestamps = {
  'preview-history-3': '2026-08-04T13:15:00Z',
}
