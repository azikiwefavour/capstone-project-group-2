export default function OverviewSectionState({ state, onRetry, emptyText, unavailableText }) {
  if (state.status === 'loading') return <p role="status" className="py-6 text-sm text-[#7A8190]">Loading...</p>
  if (state.status === 'error') return <div role="alert" className="py-6 text-sm text-[#52556C]"><p>Unable to load this section.</p>{onRetry && <button type="button" onClick={onRetry} className="mt-2 rounded-lg px-2 py-1 font-semibold text-[#475AA2] underline focus-visible:outline-2 focus-visible:outline-[#475AA2]">Try again</button>}</div>
  if (state.status === 'empty') return <p className="py-6 text-sm text-[#7A8190]">{emptyText}</p>
  if (state.status !== 'ready') return <p className="py-6 text-sm text-[#7A8190]">{unavailableText}</p>
  return null
}
