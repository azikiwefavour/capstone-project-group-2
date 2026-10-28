import assert from 'node:assert/strict'
import test from 'node:test'
import { transactionPage } from '../src/super-admin/transactionTableModel.js'
import { createPaymentsState } from '../src/super-admin/paymentsState.js'

test('unavailable payment totals stay unknown and non-ready states cannot show stale records', () => {
  assert.deepEqual(createPaymentsState(), { status: 'unavailable', records: [], summary: null })
  for (const status of ['loading', 'error', 'unavailable']) {
    assert.deepEqual(createPaymentsState(status, [1], { failedCharges: 2 }), { status, records: [], summary: null })
  }
  const summary = { collectedLast90Days: 0, upcomingNext30Days: 0, failedCharges: 0 }
  assert.deepEqual(createPaymentsState('ready', [1], summary), { status: 'ready', records: [1], summary })
  assert.deepEqual(createPaymentsState('empty', [], summary), { status: 'empty', records: [], summary })
  assert.deepEqual(createPaymentsState('ready', null, summary), { status: 'error', records: [], summary: null })
  assert.equal(createPaymentsState('invalid').status, 'unavailable')
})

test('pagination supports more rows using isolated integers without extra fake financial records', () => {
  const isolated = Array.from({ length: 15 }, (_, index) => index + 1)
  const original = [...isolated]
  assert.deepEqual(transactionPage(isolated, 1).records, [1, 2, 3, 4, 5, 6, 7])
  assert.deepEqual(transactionPage(isolated, 2).records, [8, 9, 10, 11, 12, 13, 14])
  assert.deepEqual(transactionPage(isolated, 3).records, [15])
  assert.equal(transactionPage(isolated, 99).page, 3)
  assert.equal(transactionPage(isolated, -1).page, 1)
  assert.deepEqual(isolated, original)
})

test('empty data and invalid page requests remain valid and do not invent records', () => {
  assert.deepEqual(transactionPage([], 5), { page: 1, totalPages: 1, total: 0, records: [] })
  assert.equal(transactionPage([1, 2], NaN).page, 1)
  assert.equal(transactionPage([1, 2], 1.5).page, 1)
})
