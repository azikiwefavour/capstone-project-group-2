// Presentation helpers for a future confirmed API adapter; not a backend contract.
export const formatNaira = value => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value)

export function monthComparison(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null
  return (current - previous) / previous * 100
}

// Input is an internal preview model, never an assumed API response.
export function planShares(subscriptions) {
  const activeHospitals = new Map()
  for (const item of subscriptions) {
    if (item.facilityType === 'hospital' && item.status === 'active' && item.hospitalId) activeHospitals.set(item.hospitalId, item.plan)
  }
  const total = activeHospitals.size
  return ['Starter Plan', 'Growth Plan'].map(name => {
    const count = [...activeHospitals.values()].filter(plan => plan === name).length
    return { name, count, share: total ? count / total * 100 : 0 }
  })
}
