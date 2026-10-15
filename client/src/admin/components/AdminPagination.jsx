function PageArrow({ direction }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d={direction === 'previous' ? 'M12.5 5L7.5 10L12.5 15' : 'M7.5 5L12.5 10L7.5 15'}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function AdminPagination({ totalItems, currentPage, rowsPerPage, onPageChange }) {
  const isEmpty = totalItems === 0
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage))
  const page = Math.max(1, Math.min(currentPage, totalPages))
  const arrowClassName = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D8DCE5] bg-white transition hover:bg-[#F7F8FB] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15 disabled:cursor-not-allowed disabled:opacity-45'

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t border-[#E2E5ED] px-4 py-3 text-sm text-[#52556C] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <span className="whitespace-nowrap" aria-live="polite">Page {page} of {totalPages}</span>

      <nav aria-label="Table pagination" className="flex flex-wrap items-center justify-end gap-2 self-end sm:ml-auto">
        <button type="button" disabled={isEmpty || page <= 1} onClick={() => onPageChange(page - 1)} className={arrowClassName} aria-label="Previous page" title="Previous page">
          <PageArrow direction="previous" />
        </button>

        {
          Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              disabled={isEmpty}
              onClick={() => onPageChange(pageNumber)}
              aria-label={`Page ${pageNumber}`}
              aria-current={page === pageNumber ? 'page' : undefined}
              className={`h-9 min-w-9 rounded-lg px-3 text-sm font-medium transition focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15 disabled:cursor-not-allowed disabled:opacity-45 ${page === pageNumber ? 'bg-[#475AA2] text-white' : 'border border-[#D8DCE5] bg-white text-[#52556C] hover:bg-[#F7F8FB]'}`}
            >
              {pageNumber}
            </button>
          ))
        }

        <button type="button" disabled={isEmpty || page >= totalPages} onClick={() => onPageChange(page + 1)} className={arrowClassName} aria-label="Next page" title="Next page">
          <PageArrow direction="next" />
        </button>
      </nav>
    </div>
  )
}

export default AdminPagination
