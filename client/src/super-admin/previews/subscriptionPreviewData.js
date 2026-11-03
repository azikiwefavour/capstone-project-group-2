import { facilityPreviewRows } from './facilityPreviewData.js'

// Approved visual samples only; never real prices or subscriber statistics.
export const previewPlans = [
  { name: 'Starter Plan', monthlyPrice: 30000, annualPrice: 300000, originalAnnualPrice: 360000, subscribers: 1,
    features: ['3 clinicians', 'Up to 300 patients', '300 messages/month', 'Audit log and role-based access'] },
  { name: 'Growth Plan', monthlyPrice: 70000, annualPrice: 700000, originalAnnualPrice: 840000, subscribers: 5,
    features: ['Unlimited clinicians', 'Unlimited patients', 'Unlimited messages', 'Audit log and role-based access'] },
]

// New paid examples intentionally have different names from Facilities samples,
// whose existing paid amounts remain unchanged. Shared trial records agree exactly.
const now = Date.now()
const day = offset => new Date(now + offset * 86400000).toISOString().slice(0, 10)
const names = ['Sunrise Clinic', 'Harbor Hospital', 'Cedar Medical Center', 'Lakeside Hospital', 'Orchard Clinic', 'Meadow Hospital', 'Summit Clinic', 'Willow Medical Center']
const paid = Array.from({ length: 64 }, (_, index) => {
  const plan = index % 2 ? previewPlans[1] : previewPlans[0]
  const annual = Math.floor(index / 2) % 2 === 1
  const overdue = index % 3 === 0
  return {
    id: `subscriber-design-fixture-${index}`, facilityName: `Sample ${names[index % names.length]} ${String(index + 1).padStart(2, '0')}`,
    plan: index % 2 ? 'Growth' : 'Starter', cycle: annual ? 'Annually' : 'Monthly',
    amount: annual ? plan.annualPrice : plan.monthlyPrice,
    chargeDate: day(overdue ? -(index % 14 + 1) : index % 30 + 1),
    paymentMethod: index % 2 ? 'Card Payment' : 'Bank Transfer', status: overdue ? 'past_due' : 'paid',
  }
})
const trials = facilityPreviewRows.filter(row => row.status === 'trial').slice(0, 6).map(row => ({
  id: row.id, facilityName: row.name, plan: row.plan === 'Starter Plan' ? 'Starter' : 'Growth',
  cycle: row.billingCycle === 'Annual' ? 'Annually' : 'Monthly', amount: row.subscriptionAmount,
  chargeDate: row.trialEndDate, paymentMethod: 'Not available', status: 'trial',
}))
export const previewSubscribers = [...paid, ...trials]
