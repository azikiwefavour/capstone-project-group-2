const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null
const text = value => typeof value === 'string' && value.trim() ? value : null
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value) && Number.isFinite(Date.parse(value)) ? value : null

export function mapFacilityResponse(value) {
  if (!value || !text(value.id) || !text(value.name)) throw new Error('The server returned an unexpected facility response.')
  return {
    id: value.id, name: value.name, plan: text(value.plan), billingCycle: text(value.billingCycle),
    statusLabel: { pending_review: 'Pending review', suspended: 'Suspended', rejected: 'Rejected' }[value.status] || null,
    status: ['active', 'trial', 'past_due', 'pending_review', 'suspended', 'rejected'].includes(value.status) ? value.status : null,
    // The audited service substitutes baseline users/patients and estimates SMS from
    // prescriptions. Neither counts nor percentages identify real observations.
    doctors: null, pharmacists: null, patients: null, smsSent: null, whatsappSent: null,
    progress: { clinicians: null, patients: null, messages: null },
    messagesLabel: text(value.cards?.messages?.label) || 'Messages',
    // List renewalDate is raw storage; detail renewal.date substitutes a fixed date.
    nextRenewalDate: date(value.renewalDate), trialEndDate: date(value.renewalDate), subscriptionExpiryDate: date(value.renewalDate),
    subscriptionDate: null, admin: null, paymentMethod: null,
    // A monthly fee cannot stand in for a yearly subscription amount.
    subscriptionAmount: value.billingCycle === 'Monthly' && Number.isFinite(value.monthlyValue ?? value.monthlyFee)
      ? (value.monthlyValue ?? value.monthlyFee) : null,
  }
}

export function mapFacilitiesResponse(value) {
  if (!value || !Array.isArray(value.facilities) || count(value.total) === null || !Number.isSafeInteger(value.page) || value.page < 1
    || !Number.isSafeInteger(value.limit) || value.limit < 1 || value.limit > 100 || count(value.totalPages) === null
    || value.totalPages !== Math.ceil(value.total / value.limit) || value.facilities.length > value.limit) {
    throw new Error('The server returned an unexpected facilities response.')
  }
  const records = value.facilities.map(mapFacilityResponse)
  if (new Set(records.map(row => row.id)).size !== records.length) throw new Error('The server returned duplicate facilities.')
  return {
    status: records.length ? 'ready' : 'empty', records,
    counts: ['all', 'active', 'trial', 'past_due'].map(key => count(value.counts?.[key])),
    page: value.page, total: value.total, totalPages: Math.max(1, value.totalPages), limit: value.limit,
  }
}
