// Internal presentation fields only; no backend schema or requests are assumed.
const sum = (a, b) => Number.isSafeInteger(a) && a >= 0 && Number.isSafeInteger(b) && b >= 0 && Number.isSafeInteger(a + b) ? a + b : null
const validCount = (v) => Number.isSafeInteger(v) && v >= 0 ? v : null

export function facilityTotals(facility) {
  if (!facility) return { clinicians: null, patients: null, messages: null }

  const cliniciansSum = sum(facility.doctors, facility.pharmacists)
  const clinicians = cliniciansSum !== null ? cliniciansSum : validCount(facility.clinicians)

  const patients = validCount(facility.patients) ?? validCount(facility.patientsCount)

  const messagesSum = sum(facility.smsSent, facility.whatsappSent)
  const messages = messagesSum !== null ? messagesSum : validCount(facility.messages)

  return { clinicians, patients, messages }
}

export const facilityStatusStyles = {
  active: { label: 'Active', color: 'bg-[#D0E7DC] text-[#2F7D59]', dot: 'bg-[#2F7D59]' },
  trial: { label: 'In trial', color: 'bg-[#EEF0FF] text-[#475AA2]', dot: 'bg-[#475AA2]' },
  past_due: { label: 'Past due', color: 'bg-[#F8D6DD] text-[#B83F5C]', dot: 'bg-[#B83F5C]' },
  pending_review: { label: 'Pending review', color: 'bg-[#FEF3C7] text-[#92400E]', dot: 'bg-[#92400E]' },
  suspended: { label: 'Suspended', color: 'bg-[#F3F4F6] text-[#6B7280]', dot: 'bg-[#6B7280]' },
  rejected: { label: 'Rejected', color: 'bg-[#FEE2E2] text-[#991B1B]', dot: 'bg-[#991B1B]' },
}

export function facilityBillingDetails(facility) {
  if (facility.status === 'trial') return { dateLabel: 'Trial ends', date: facility.trialEndDate, paymentMethod: 'Not available', amount: 0, freeTrial: true }
  const paid = ['active', 'past_due'].includes(facility.status)
  return {
    dateLabel: facility.status === 'past_due' ? 'Subscription expired' : 'Next renewal',
    date: facility.status === 'past_due' ? facility.subscriptionExpiryDate : facility.nextRenewalDate,
    paymentMethod: paid && facility.paymentMethod ? facility.paymentMethod : 'Not available',
    amount: paid && Number.isFinite(facility.subscriptionAmount) && facility.subscriptionAmount > 0 ? facility.subscriptionAmount : null,
    freeTrial: false,
  }
}
