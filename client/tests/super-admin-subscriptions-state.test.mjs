import assert from 'node:assert/strict'
import test from 'node:test'
import { subscriptionPlans } from '../src/super-admin/subscriptionPlans.js'
import { createSubscriptionsState } from '../src/super-admin/subscriptionsState.js'
import { previewPlans } from '../src/super-admin/previews/subscriptionPreviewData.js'
import { subscriberPage } from '../src/super-admin/subscriberTableModel.js'

test('approved pricing/features are configuration, unchanged and independent of example counts', () => {
  for (const [index, plan] of subscriptionPlans.entries()) {
    for (const field of ['name', 'monthlyPrice', 'annualPrice', 'originalAnnualPrice', 'features']) assert.deepEqual(plan[field], previewPlans[index][field])
    assert.equal(Object.hasOwn(plan, 'subscribers'), false)
  }
})

test('default subscription state has no records or fabricated counts', () => {
  assert.deepEqual(createSubscriptionsState(), { status: 'unavailable', records: [], subscriberCounts: { Starter: null, Growth: null } })
  for (const status of ['loading', 'ready', 'empty', 'error']) assert.equal(createSubscriptionsState(status).status, status)
  assert.equal(createSubscriptionsState('unknown').status, 'unavailable')
  assert.deepEqual(createSubscriptionsState('ready', [], null).subscriberCounts, { Starter: null, Growth: null })
})

test('explicit confirmed plan counts retain zero and do not derive from a filtered table', () => {
  const state = createSubscriptionsState('ready', [], { Starter: 0, Growth: 9 })
  assert.deepEqual(state.subscriberCounts, { Starter: 0, Growth: 9 })
  subscriberPage(state.records, { search: 'absent', plan: 'Growth' })
  assert.deepEqual(state.subscriberCounts, { Starter: 0, Growth: 9 })
  assert.deepEqual(createSubscriptionsState('empty').subscriberCounts, { Starter: null, Growth: null })
})

test('subscriber pagination tolerates missing/empty records with all current controls', () => {
  for (const sort of ['charge_asc', 'charge_desc', 'amount_desc', 'amount_asc', 'name_asc', 'name_desc']) {
    const result = subscriberPage(undefined, { search: '', status: '', plan: '', sort })
    assert.equal(result.page, 1); assert.equal(result.totalPages, 1); assert.equal(result.total, 0)
  }
  assert.equal(subscriberPage([null, {}, { facilityName: 'Available name' }], {}).total, 1)
})
