// Same border, active-page color, sizing and focus treatment as AdminPagination.
// Kept separate so Patient mobile controls do not change other dashboards.
export default function PatientPagination({ totalItems, page, pageSize, desktop, onPageChange }) {
  const totalPages = Math.ceil(totalItems / pageSize)
  if (totalPages <= 1) return null
  const pages = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter(value => value >= 1 && value <= totalPages).sort((a, b) => a - b)
  const buttonStyle = 'h-9 shrink-0 rounded-lg border border-[#D8DCE5] bg-white px-3 text-sm font-medium text-[#52556C] transition hover:bg-[#F7F8FB] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15 disabled:cursor-not-allowed disabled:opacity-45'

  return <div className="flex min-w-0 flex-col gap-3 border-t border-[#E2E5ED] px-4 py-3 text-sm text-[#52556C] lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
    <span aria-live="polite">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} of {totalItems}</span>
    <nav aria-label="Diagnoses pagination" className="flex flex-wrap items-center gap-2">
      <button type="button" aria-controls="patient-diagnoses-table" disabled={page === 1} onClick={() => onPageChange(page - 1)} className={buttonStyle}>Previous</button>
      {desktop && pages.map((value, index) => <span key={value} className="inline-flex items-center gap-2">
        {index > 0 && value - pages[index - 1] > 1 && <span aria-hidden="true">…</span>}
        <button type="button" aria-label={`Page ${value}`} aria-controls="patient-diagnoses-table" aria-current={value === page ? 'page' : undefined} onClick={() => onPageChange(value)}
          className={`h-9 min-w-9 rounded-lg px-3 text-sm font-medium transition focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15 ${value === page ? 'bg-[#475AA2] text-white' : 'border border-[#D8DCE5] bg-white text-[#52556C] hover:bg-[#F7F8FB]'}`}>{value}</button>
      </span>)}
      <button type="button" aria-controls="patient-diagnoses-table" disabled={page === totalPages} onClick={() => onPageChange(page + 1)} className={buttonStyle}>Next</button>
    </nav>
  </div>
}
