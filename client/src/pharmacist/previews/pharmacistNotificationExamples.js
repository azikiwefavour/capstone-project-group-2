// Explicitly enabled development preview and test fixtures only. These are
// fictional design examples, not prescription or patient events.
export function createPharmacistNotificationExamples(now = Date.now()) {
  const ages = [10 * 60000, 30 * 60000, 8 * 3600000, 17 * 3600000]
  return [...ages.map(age => new Date(now - age).toISOString()), new Date(2026, 9, 31, 13, 12).toISOString()]
    .map((createdAt, index) => ({
      id: `pharmacist-design-example-${index}`, role: 'pharmacist', type: 'new-prescription',
      title: 'Verification', description: 'From Dr. Adewale.',
      createdAt, read: index !== 0,
    }))
}
