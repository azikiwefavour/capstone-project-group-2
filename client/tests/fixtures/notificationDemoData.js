// Test-only examples. These are not hospital or patient events and are never
// imported by application code or included in production behavior.
export const notificationDemoData = [
  ['admin', 'staff-invitation', 'DEMO: staff invitation interface', false],
  ['admin', 'hospital-announcement', 'DEMO: announcement interface', false],
  ['admin', 'account-update', 'DEMO: account update interface', true],
  ['doctor', 'medication-review', 'DEMO: review request interface', false],
  ['doctor', 'pharmacist-query', 'DEMO: query interface', false],
  ['doctor', 'prescription-update', 'DEMO: prescription update interface', true],
  ['pharmacist', 'new-prescription', 'DEMO: new prescription interface', false],
  ['pharmacist', 'medication-update', 'DEMO: medication update interface', false],
  ['pharmacist', 'prescription-modification', 'DEMO: modification interface', true],
].map(([role, type, title, read], index) => ({
  id: `demo-${index}`, role, type, title, read,
  description: 'Interface test data only. No clinical event occurred.',
  createdAt: '2026-01-01T09:00:00.000Z',
}))
