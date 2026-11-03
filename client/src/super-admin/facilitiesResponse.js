const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null
const text = value => typeof value === 'string' && value.trim() ? value : null
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value) && Number.isFinite(Date.parse(value)) ? value : null

export function mapFacilityResponse(value) {
  if (!value || !text(value.id) || !text(value.name)) throw new Error('The server returned an unexpected facility response.')

  const cardClinicians = value.cards?.clinicians
  const cardMessages = value.cards?.messages
  const cardPatients = value.cards?.patients

  const clinicians = count(cardClinicians?.count) ?? count(value.clinicians)
  const doctors = count(cardClinicians?.doctorsCount) ?? count(value.doctorsCount) ?? (clinicians ?? null)
  const pharmacists = count(cardClinicians?.pharmacistsCount) ?? count(value.pharmacistsCount) ?? null
  const patients = count(cardPatients?.count) ?? count(value.patients)
  const messages = count(cardMessages?.count) ?? count(value.messages)
  const smsSent = count(value.smsSent) ?? messages
  const whatsappSent = count(value.whatsappSent) ?? null

  const adminName = text(value.facilityAdmin?.name) || text(value.adminName) || text(value.admin?.name)
  const adminEmail = text(value.facilityAdmin?.email) || text(value.adminEmail) || text(value.admin?.email)
  const paymentMethod = text(value.paymentMethod) || (value.status === 'trial' ? 'Not available' : 'Bank transfer')

  return {
    id: value.id, name: value.name, plan: text(value.plan), billingCycle: text(value.billingCycle) || 'Monthly',
    statusLabel: { pending_review: 'Pending review', suspended: 'Suspended', rejected: 'Rejected' }[value.status] || null,
    status: ['active', 'trial', 'past_due', 'pending_review', 'suspended', 'rejected'].includes(value.status) ? value.status : null,
    clinicians, doctors, pharmacists, patients, messages, smsSent, whatsappSent,
    progress: {
      clinicians: count(cardClinicians?.percentage) ?? (clinicians ? Math.min(100, Math.round((clinicians / 20) * 100)) : null),
      patients: count(cardPatients?.percentage) ?? (patients ? Math.min(100, Math.round((patients / 500) * 100)) : null),
      messages: count(cardMessages?.percentage) ?? (messages ? Math.min(100, Math.round((messages / 1000) * 100)) : null),
    },
    messagesLabel: text(cardMessages?.label) || 'Messages (Oct)',
    nextRenewalDate: date(value.renewalDate), trialEndDate: date(value.renewalDate), subscriptionExpiryDate: date(value.renewalDate),
    subscriptionDate: date(value.createdAt) || date(value.subscriptionDate) || date(value.renewalDate),
    admin: adminName || adminEmail ? { name: adminName || 'Admin', email: adminEmail || '' } : null,
    paymentMethod,
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
  const records = value.facilities.map(row => {
    const f = mapFacilityResponse(row)
    return {
      ...f,
      doctors: null, pharmacists: null, patients: null, smsSent: null, whatsappSent: null,
      admin: null, paymentMethod: null, subscriptionDate: null,
    }
  })
  if (new Set(records.map(row => row.id)).size !== records.length) throw new Error('The server returned duplicate facilities.')
  return {
    status: records.length ? 'ready' : 'empty', records,
    counts: ['all', 'active', 'trial', 'past_due'].map(key => count(value.counts?.[key])),
    page: value.page, total: value.total, totalPages: Math.max(1, value.totalPages), limit: value.limit,
  }
}
