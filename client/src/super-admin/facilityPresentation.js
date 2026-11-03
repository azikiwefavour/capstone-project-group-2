// Internal presentation fields only; no backend schema or requests are assumed.
const sum = (a, b) => Number.isSafeInteger(a) && a >= 0 && Number.isSafeInteger(b) && b >= 0 && Number.isSafeInteger(a + b) ? a + b : null
export function facilityTotals(facility) {
  return {
    clinicians: sum(facility.doctors, facility.pharmacists),
    patients: Number.isSafeInteger(facility.patients) && facility.patients >= 0 ? facility.patients : null,
    messages: sum(facility.smsSent, facility.whatsappSent),
  }
}

export const facilityStatusStyles = {
  active: { label: 'Active', color: 'bg-[#D0E7DC] text-[#2F7D59]' },
  trial: { label: 'In trial', color: 'bg-[#EEF0FF] text-[#475AA2]' },
  past_due: { label: 'Past due', color: 'bg-[#F8D6DD] text-[#B83F5C]' },
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
