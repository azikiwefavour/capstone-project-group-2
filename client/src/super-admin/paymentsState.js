// Frontend presentation state, not an assumed backend response contract.
// Summary totals are supplied independently: upcomingNext30Days represents
// subscription renewals due in the next 30 days, not unsettled transactions.
export function createPaymentsState(status = 'unavailable', records = [], summary = null) {
  const validStatus = ['unavailable', 'loading', 'ready', 'empty', 'error'].includes(status) ? status : 'unavailable'
  const resolvedStatus = validStatus === 'ready' && !Array.isArray(records) ? 'error' : validStatus
  const available = resolvedStatus === 'ready' || resolvedStatus === 'empty'
  return {
    status: resolvedStatus,
    records: resolvedStatus === 'ready' ? records : [],
    summary: available ? summary : null,
  }
}
