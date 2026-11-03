import { subscriberPageNumbers } from './subscriberTableModel.js'

export default function SuperAdminPagination({ page, totalPages, empty, onChange, label = 'Subscribers pagination', disabled = false, simple = false }) {
  const numbers = subscriberPageNumbers(page, totalPages)
  function arrow(label, path, target, unavailable) {
    return <button type="button" disabled={disabled || unavailable} aria-label={label} onClick={() => onChange(target)} className="subscriber-page-button border-[#E2E5ED] text-[#52556C] hover:bg-[#EEF0FF] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[#475AA2]"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
  }
  return <div className="subscriber-pagination border-t border-[#E2E5ED] text-xs text-[#7A8190]">
    <p className="subscriber-page-summary" aria-live="polite">Page {page} of {totalPages}</p>
    <nav aria-label={label} className="subscriber-page-controls">
      {!simple && arrow('First page', 'M11 6l-6 6 6 6 M19 6l-6 6 6 6', 1, empty || page === 1)}
      {arrow('Previous page', 'M15 6l-6 6 6 6', page - 1, empty || page === 1)}
      {!simple && numbers.map((number, index) => <span key={number} className="inline-flex shrink-0 items-center gap-1">{index > 0 && number - numbers[index - 1] > 1 && <span aria-label="More pages" className="px-1">…</span>}<button type="button" disabled={empty || disabled} aria-label={`Page ${number}`} aria-current={page === number ? 'page' : undefined} onClick={() => onChange(number)} className={`subscriber-page-button focus-visible:outline-2 focus-visible:outline-[#475AA2] ${page === number ? 'border-[#475AA2] bg-[#EEF0FF] text-[#475AA2]' : 'border-transparent text-[#52556C] hover:bg-[#EEF0FF]'}`}>{number}</button></span>)}
      {arrow('Next page', 'M9 6l6 6-6 6', page + 1, empty || page === totalPages)}
      {!simple && arrow('Last page', 'M5 6l6 6-6 6 M13 6l6 6-6 6', totalPages, empty || page === totalPages)}
    </nav>
    <button type="button" disabled aria-label="Rows per page: 7, fixed" className="subscriber-page-size flex h-7 items-center gap-2 rounded-lg border border-[#E2E5ED] px-2 text-[#52556C]">7 / page<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></button>
  </div>
}
