import assert from 'node:assert/strict'
import test from 'node:test'
import { facilityBillingDetails, facilityTotals } from '../src/super-admin/facilityPresentation.js'

test('facility totals include all doctors/pharmacists, registered patients and sent messages regardless of delivery', () => {
  assert.deepEqual(facilityTotals({ doctors: 12, pharmacists: 4, patients: 800, smsSent: 300, whatsappSent: 200, deliveredMessages: 0 }), { clinicians: 16, patients: 800, messages: 500 })
  assert.deepEqual(facilityTotals({ doctors: 0, pharmacists: 0, patients: 0, smsSent: 0, whatsappSent: 0 }), { clinicians: 0, patients: 0, messages: 0 })
})

test('missing or invalid aggregate values remain unknown rather than zero', () => {
  assert.deepEqual(facilityTotals({ doctors: 12, patients: -1, smsSent: 300 }), { clinicians: null, patients: null, messages: null })
  assert.deepEqual(facilityTotals({ doctors: '12', pharmacists: 4, patients: null, smsSent: 0, whatsappSent: NaN }), { clinicians: null, patients: null, messages: null })
})


test('trial billing never displays a paid amount or recorded payment method', () => {
  assert.deepEqual(facilityBillingDetails({ status: 'trial', trialEndDate: '2026-11-02', subscriptionAmount: 840000, paymentMethod: 'Card Payment' }), { dateLabel: 'Trial ends', date: '2026-11-02', amount: 0, freeTrial: true, paymentMethod: 'Not available' })
})

test('active and past-due billing retain the full billing-cycle amount and their own date meanings', () => {
  const active = facilityBillingDetails({ status: 'active', nextRenewalDate: '2026-11-26', subscriptionAmount: 70000, paymentMethod: 'Bank Transfer' })
  assert.equal(active.dateLabel, 'Next renewal')
  assert.equal(active.date, '2026-11-26')
  assert.equal(active.amount, 70000)
  const overdue = facilityBillingDetails({ status: 'past_due', subscriptionExpiryDate: '2026-10-23', subscriptionAmount: 840000, paymentMethod: 'Card Payment' })
  assert.equal(overdue.dateLabel, 'Subscription expired')
  assert.equal(overdue.date, '2026-10-23')
  assert.equal(overdue.amount, 840000)
  assert.equal(overdue.paymentMethod, 'Card Payment')
})

test('missing or invalid paid amounts do not become zero due to non-renewal', () => {
  for (const amount of [0, null, undefined, -1, Infinity, '70000']) assert.equal(facilityBillingDetails({ status: 'past_due', subscriptionAmount: amount }).amount, null)
})
