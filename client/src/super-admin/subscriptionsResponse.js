const text = value => typeof value === 'string' && value.trim() ? value : null
const amount = value => Number.isFinite(value) && value >= 0 ? value : null
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null
function rawDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? value : null
}

export function mapSubscriptionsResponse(value, cycle = 'monthly') {
  const pagination = value?.pagination
  if (!value || !Array.isArray(value.subscribers) || !pagination || count(pagination.total) === null
    || !Number.isSafeInteger(pagination.page) || pagination.page < 1 || !Number.isSafeInteger(pagination.limit)
    || pagination.limit < 1 || pagination.limit > 100 || count(pagination.totalPages) === null
    || pagination.totalPages !== Math.ceil(pagination.total / pagination.limit)
    || value.subscribers.length > Math.min(pagination.limit, pagination.total)) {
    throw new Error('The server returned an unexpected subscriptions response.')
  }
  const records = value.subscribers.map(row => {
    if (!text(row?.id) || !text(row?.facility)) throw new Error('The server returned an unexpected subscriber response.')
    const status = ['paid', 'past_due', 'trial'].includes(row.status) ? row.status : null
    const method = text(row.method)
    return {
      id: row.id, facilityName: row.facility,
      plan: ['Starter', 'Growth'].includes(row.plan) ? row.plan : null,
      cycle: ['Monthly', 'Annual'].includes(row.cycle) ? row.cycle : null, status,
      // amount is the persisted monthly fee, not a yearly charge or trial payment.
      amount: row.cycle === 'Monthly' && ['paid', 'past_due'].includes(status) ? amount(row.amount) : null,
      chargeDate: rawDate(row.rawNextChargeDate),
      // Only these two strings are synthesized by the audited service. Other
      // nonempty method strings come directly from the persisted payment method.
      paymentMethod: method && !['Bank transfer', '--'].includes(method) ? method : null,
    }
  })
  if (new Set(records.map(row => row.id)).size !== records.length) throw new Error('The server returned duplicate subscribers.')
  const price = (key, name, tier) => {
    const plan = value.plans?.[key]
    return value.plans?.cycle === (cycle === 'annually' ? 'Annually' : 'Monthly') && plan?.name === name && plan.tier === tier
      ? amount(plan.price) : null
  }
  return {
    status: records.length ? 'ready' : 'empty', records,
    planPrices: { Starter: price('starter', 'Starter Plan', 'Starter'), Growth: price('growth', 'Growth Plan', 'Growth') },
    // Both plans.*.subscribers and summary.*Subscribers use `count || 1/5`.
    // No value-based heuristic can distinguish actual totals from those fallbacks.
    subscriberCounts: { Starter: null, Growth: null },
    pagination: { total: pagination.total, page: pagination.page, limit: pagination.limit, totalPages: Math.max(1, pagination.totalPages) },
  }
}
