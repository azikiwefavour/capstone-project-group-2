// Supported future categories, not events or subscriptions to backend services.
export const notificationTypesByRole = {
  admin: ['staff-invitation', 'account-update', 'hospital-announcement'],
  doctor: ['prescription-update', 'medication-review', 'pharmacist-query'],
  pharmacist: ['new-prescription', 'prescription-modification', 'medication-update'],
}

/**
 * Frontend record: { id, role, type, title, description, createdAt, read }.
 * Keep only complete records for this role. No example records ship with the app.
 */
export function notificationsForRole(records, role) {
  const seen = new Set()
  return records.filter(record => {
    if (!record || record.role !== role || !notificationTypesByRole[role]?.includes(record.type)
      || typeof record.id !== 'string' || !record.id.trim() || seen.has(record.id)
      || typeof record.title !== 'string' || !record.title.trim()
      || typeof record.description !== 'string'
      || typeof record.createdAt !== 'string' || !Number.isFinite(Date.parse(record.createdAt))) return false
    seen.add(record.id)
    return true
  }).map(record => ({
    id: record.id, role, type: record.type, title: record.title,
    description: record.description, createdAt: record.createdAt, read: record.read === true,
  }))
}
