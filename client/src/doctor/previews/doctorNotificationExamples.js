// Explicitly enabled development preview and test fixtures only. Never actual
// clinical events. The production dependency graph excludes this module.
export function createDoctorNotificationExamples(now = Date.now()) {
  const ages = [10 * 60000, 30 * 60000, 8 * 3600000, 17 * 3600000]
  return [...ages.map(age => new Date(now - age).toISOString()), new Date(2026, 9, 31, 13, 12).toISOString()]
    .map((createdAt, index) => ({
      id: `doctor-design-example-${index}`, role: 'doctor', type: 'pharmacist-query',
      title: 'Clarification Request', description: 'From Pharm. Elizabeth.',
      createdAt, read: index !== 0,
    }))
}
