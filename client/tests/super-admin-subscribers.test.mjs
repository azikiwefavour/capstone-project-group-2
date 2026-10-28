import assert from 'node:assert/strict'
import test from 'node:test'
import { querySubscribers, subscriberPage, subscriberPageNumbers, formatSubscriberDate } from '../src/super-admin/subscriberTableModel.js'
import { previewPlans, previewSubscribers } from '../src/super-admin/previews/subscriptionPreviewData.js'
import { facilityPreviewRows } from '../src/super-admin/previews/facilityPreviewData.js'

const records = [
  { id: 'a', facilityName: 'Alpha Hospital', plan: 'Growth', status: 'paid', amount: 70000, chargeDate: '2026-11-03', email: 'needle@example.test', paymentMethod: 'Needle Transfer' },
  { id: 'z', facilityName: 'Zeta Hospital', plan: 'Starter', status: 'past_due', amount: 300000, chargeDate: '2026-11-02' },
  { id: 'b', facilityName: 'beta Hospital', plan: 'Starter', status: 'trial', amount: 0, chargeDate: '2026-11-01' },
]

test('search is case-insensitive and limited to facility name', () => {
  assert.deepEqual(querySubscribers(records, { search: '  ALPHA  ' }).map(row => row.id), ['a'])
  assert.equal(querySubscribers(records, { search: 'needle' }).length, 0)
  assert.equal(querySubscribers(records, { search: 'Growth' }).length, 0)
})

test('status and plan filters combine with search before sorting and pagination', () => {
  assert.deepEqual(querySubscribers(records, { search: 'hospital', plan: 'Starter', status: 'trial' }).map(row => row.id), ['b'])
  for (const status of ['paid', 'past_due', 'trial']) assert.ok(querySubscribers(previewSubscribers, { status }).every(row => row.status === status))
  const result = subscriberPage(previewSubscribers, { search: 'sample cedar', plan: 'Starter', status: 'paid', sort: 'amount_desc' }, 1)
  assert.equal(result.total, 6)
  assert.equal(result.totalPages, 1)
  assert.ok(result.records.every(row => row.facilityName.includes('Cedar') && row.plan === 'Starter' && row.status === 'paid'))
})

test('all six sort orders work without mutating records', () => {
  const snapshot = JSON.stringify(records)
  for (const [sort, expected] of [['charge_asc', ['b', 'z', 'a']], ['charge_desc', ['a', 'z', 'b']], ['amount_desc', ['z', 'a', 'b']], ['amount_asc', ['b', 'a', 'z']], ['name_asc', ['a', 'b', 'z']], ['name_desc', ['z', 'b', 'a']]]) assert.deepEqual(querySubscribers(records, { sort }).map(row => row.id), expected)
  assert.equal(JSON.stringify(records), snapshot)
})

test('unknown dates/amounts sort last in either direction rather than becoming zero', () => {
  const rows = [...records, { id: 'missing', facilityName: 'Missing', amount: null, chargeDate: 'invalid' }]
  for (const sort of ['charge_asc', 'charge_desc', 'amount_asc', 'amount_desc']) assert.equal(querySubscribers(rows, { sort }).at(-1).id, 'missing')
})

test('seven-row pagination uses filtered totals and clamps invalid pages', () => {
  const result = subscriberPage(previewSubscribers, {}, 2)
  assert.equal(result.page, 2)
  assert.equal(result.total, 70)
  assert.equal(result.totalPages, 10)
  assert.equal(result.records.length, 7)
  assert.deepEqual(result.records, querySubscribers(previewSubscribers).slice(7, 14))
  assert.equal(subscriberPage(previewSubscribers, {}, 999).page, 10)
  assert.equal(subscriberPage(previewSubscribers, {}, -1).page, 1)
  assert.equal(subscriberPage(previewSubscribers, { search: 'Preview Hospital 08' }, 9).page, 1)
  const empty = subscriberPage(previewSubscribers, { search: 'No matching hospital' }, 9)
  assert.deepEqual({ page: empty.page, pages: empty.totalPages, total: empty.total, records: empty.records }, { page: 1, pages: 1, total: 0, records: [] })
})

test('page numbers support first, middle, last and small result sets', () => {
  assert.deepEqual(subscriberPageNumbers(1, 1), [1])
  assert.deepEqual(subscriberPageNumbers(2, 3), [1, 2, 3])
  assert.deepEqual(subscriberPageNumbers(1, 10), [1, 2, 3, 4, 5, 10])
  assert.deepEqual(subscriberPageNumbers(5, 10), [1, 4, 5, 6, 10])
  assert.deepEqual(subscriberPageNumbers(10, 10), [1, 6, 7, 8, 9, 10])
})

test('subscriber fixture amounts match the four specified prices; trials retain zero and unavailable method', () => {
  const prices = { 'Starter Monthly': 30000, 'Starter Annually': 300000, 'Growth Monthly': 70000, 'Growth Annually': 700000 }
  const combinations = new Set()
  for (const row of previewSubscribers) {
    const key = `${row.plan} ${row.cycle}`
    combinations.add(key)
    assert.equal(row.amount, row.status === 'trial' ? 0 : prices[key])
    if (row.status === 'trial') assert.equal(row.paymentMethod, 'Not available')
  }
  assert.equal(combinations.size, 4)
  assert.deepEqual(previewPlans.map(plan => plan.subscribers), [1, 5])
})

test('reused Facilities records agree and differently priced paid examples use distinct names', () => {
  for (const row of previewSubscribers) {
    const facility = facilityPreviewRows.find(facility => facility.name === row.facilityName)
    if (!facility) continue
    assert.equal(row.id, facility.id)
    assert.equal(row.status, 'trial')
    assert.equal(row.amount, facility.subscriptionAmount)
    assert.equal(row.chargeDate, facility.trialEndDate)
    assert.equal(row.plan + ' Plan', facility.plan)
    assert.equal(row.cycle, facility.billingCycle === 'Annual' ? 'Annually' : 'Monthly')
  }
  assert.equal(previewSubscribers.filter(row => row.status === 'trial').length, 6)
})

test('dates show padded day and invalid dates remain unavailable', () => {
  assert.equal(formatSubscriberDate('2026-11-02'), '02 Nov 2026')
  assert.equal(formatSubscriberDate('2026-02-30'), 'Not available')
  assert.equal(formatSubscriberDate(null), 'Not available')
})
