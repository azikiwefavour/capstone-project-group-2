import assert from 'node:assert/strict'
import test from 'node:test'
import { createOverviewState, OVERVIEW_STATUSES, overviewRevenueData, overviewSectionState } from '../src/super-admin/overviewState.js'

test('default Overview has unavailable sections with unknown numbers and empty collections, never invented zeroes', () => {
  const state = createOverviewState()
  for (const section of Object.values(state)) assert.equal(section.status, 'unavailable')
  for (const value of Object.values(state.platformState.data)) assert.equal(value, null)
  assert.deepEqual(state.statisticsState.data, { monthlyRevenue: null, previousMonthlyRevenue: null, months: [], plans: [] })
  for (const field of ['renewalsState', 'integrationsState', 'activitiesState']) assert.deepEqual(state[field].data, [])
})

test('state factories preserve loading/success/empty/error and allocate independent data', () => {
  for (const status of Object.values(OVERVIEW_STATUSES)) assert.equal(createOverviewState(status).statisticsState.status, status)
  assert.equal(OVERVIEW_STATUSES.SUCCESS, 'ready')
  assert.equal(overviewSectionState('not-a-state').status, 'unavailable')
  const first = createOverviewState(), second = createOverviewState()
  first.renewalsState.data.push({ id: 'isolated-test' })
  first.platformState.data.activeSubscribers = 0
  assert.deepEqual(second.renewalsState.data, [])
  assert.equal(second.platformState.data.activeSubscribers, null)
})

test('missing, partial and malformed revenue data is safe, with no fake chart points or percentages', () => {
  assert.deepEqual(overviewRevenueData(undefined), { monthlyRevenue: null, previousMonthlyRevenue: null, months: [], plans: [] })
  assert.deepEqual(overviewRevenueData({ months: {}, plans: null }), overviewRevenueData(undefined))
  assert.deepEqual(overviewRevenueData({ months: [null, { label: 'Unknown', amount: null }], plans: [null, { name: 'Starter Plan', count: 3 }] }), overviewRevenueData(undefined))
})

test('confirmed zero totals and valid chart/plan records remain supported without new calculations', () => {
  const input = { monthlyRevenue: 0, previousMonthlyRevenue: 10, months: [{ label: 'Jan', amount: 0 }], plans: [{ name: 'Starter Plan', count: 0, share: 0 }] }
  assert.deepEqual(overviewRevenueData(input), input)
  assert.equal(overviewRevenueData({ monthlyRevenue: -1 }).monthlyRevenue, null)
})
