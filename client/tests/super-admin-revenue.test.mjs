import assert from 'node:assert/strict'
import test from 'node:test'
import { formatNaira, monthComparison, planShares } from '../src/super-admin/revenue.js'

test('revenue comparison handles increase, decrease, zero and missing baseline honestly', () => {
  assert.equal(monthComparison(240, 200), 20)
  assert.equal(monthComparison(150, 200), -25)
  assert.equal(monthComparison(0, 200), -100)
  assert.equal(monthComparison(200, 0), null)
  assert.equal(monthComparison(200, undefined), null)
  assert.equal(monthComparison(NaN, 100), null)
  assert.match(formatNaira(2400000), /₦2,400,000/)
})

test('plan mix counts unique active hospitals only and uses all active hospitals as denominator', () => {
  const subscription = (hospitalId, plan, status = 'active', facilityType = 'hospital') => ({ hospitalId, plan, status, facilityType })
  const plans = planShares([
    subscription('one', 'Starter Plan'), subscription('one', 'Starter Plan'),
    subscription('two', 'Growth Plan'), subscription('three', 'Other Plan'),
    subscription('four', 'Starter Plan', 'expired'), subscription('five', 'Growth Plan', 'pending'),
    subscription('six', 'Starter Plan', 'cancelled'), subscription('seven', 'Growth Plan', 'active', 'pharmacy'),
    subscription('', 'Starter Plan'),
  ])
  assert.deepEqual(plans.map(plan => plan.count), [1, 1])
  assert.ok(Math.abs(plans[0].share - 100 / 3) < 0.000001)
  assert.deepEqual(planShares([]).map(plan => ({ count: plan.count, share: plan.share })), [{ count: 0, share: 0 }, { count: 0, share: 0 }])
})
