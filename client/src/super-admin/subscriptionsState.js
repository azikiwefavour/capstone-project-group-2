// Frontend presentation state only; not an assumed backend response contract.
// Records retain the existing table model: id/facilityName/plan/cycle/amount/
// chargeDate (YYYY-MM-DD)/paymentMethod/status (paid, past_due or trial).
// Counts are explicit confirmed plan totals, not filtered/page-local record counts.
// Missing counts stay null, including when no records have been loaded.
export function createSubscriptionsState(status = 'unavailable', records = [], subscriberCounts = {}) {
  return {
    status: ['unavailable', 'loading', 'ready', 'empty', 'error'].includes(status) ? status : 'unavailable',
    records,
    subscriberCounts: { Starter: subscriberCounts?.Starter ?? null, Growth: subscriberCounts?.Growth ?? null },
  }
}
