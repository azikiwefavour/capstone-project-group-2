// Frontend presentation state only; not an assumed backend response contract.
// Records retain id/timestamp/actorName/actorRole/action/facilityName.
export function createAuditLogState(status = 'unavailable', records = []) {
  const valid = ['unavailable', 'loading', 'ready', 'empty', 'error'].includes(status) ? status : 'unavailable'
  const resolved = valid === 'ready' && !Array.isArray(records) ? 'error' : valid
  return { status: resolved, records: resolved === 'ready' ? records : [] }
}
