const sampleDate = Date.now()
const dateAt = days => new Date(sampleDate + days * 86400000).toISOString().slice(0, 10)
const adminNames = ['Amos Ibekwe', 'Ada Okafor', 'Tunde Bello', 'Ngozi Eze', 'Ifeoma Obi', 'David Adeyemi', 'Amina Yusuf']

// Aggregate design fixtures only. No actual hospitals, patient records or credentials.
export const facilityPreviewRows = Array.from({ length: 112 }, (_, index) => ({
  id: `facility-visual-fixture-${index}`, name: `Preview Hospital ${String(index + 1).padStart(2, '0')}`,
  plan: index % 2 ? 'Starter Plan' : 'Growth Plan', billingCycle: index % 2 ? 'Monthly' : 'Annual',
  doctors: 12 + index, pharmacists: 4 + index, patients: 800 + index * 120,
  smsSent: 300 + index * 30, whatsappSent: 200 + index * 20,
  status: ['active', 'trial', 'past_due'][index % 3],
  admin: { name: adminNames[index % adminNames.length], email: `admin${index + 1}@hospital-preview.example.test` },
  subscriptionDate: dateAt(index % 3 === 1 ? -7 : index % 2 ? -30 : -365),
  nextRenewalDate: index % 3 === 0 ? dateAt(index % 2 ? 30 : 365) : null,
  trialEndDate: index % 3 === 1 ? dateAt(7) : null,
  subscriptionExpiryDate: index % 3 === 2 ? dateAt(-3) : null,
  paymentMethod: index % 3 === 1 ? null : index % 2 ? 'Bank Transfer' : 'Card Payment',
  subscriptionAmount: index % 3 === 1 ? 0 : index % 2 ? 70000 : 840000,
}))
