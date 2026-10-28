export const TRANSACTION_PAGE_SIZE = 7

// Frontend pagination only; no financial calculations, filtering or sorting.
export function transactionPage(records, requestedPage = 1) {
  const totalPages = Math.max(1, Math.ceil(records.length / TRANSACTION_PAGE_SIZE))
  const page = Math.max(1, Math.min(Number.isInteger(requestedPage) ? requestedPage : 1, totalPages))
  return { page, totalPages, total: records.length, records: records.slice((page - 1) * TRANSACTION_PAGE_SIZE, page * TRANSACTION_PAGE_SIZE) }
}
