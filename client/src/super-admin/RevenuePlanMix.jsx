import { useId, useRef, useState } from 'react'
import { formatNaira, monthComparison } from './revenue'
import { overviewRevenueData } from './overviewState.js'

export default function RevenuePlanMix({ state = { status: 'unavailable' }, onRetry }) {
  const [tab, setTab] = useState('Revenue')
  const id = useId()
  const tabs = useRef([])
  const data = overviewRevenueData(state.status === 'ready' ? state.data : null)
  const comparison = monthComparison(data.monthlyRevenue, data.previousMonthlyRevenue)
  const maximum = Math.max(1, ...data.months.map(month => month.amount))

  function changeTab(event, index) {
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : event.key === 'ArrowRight' || event.key === 'ArrowLeft' ? 1 - index : null
    if (next === null) return
    event.preventDefault()
    setTab(next === 0 ? 'Revenue' : 'Plan Mix')
    tabs.current[next].focus()
  }

  return (
    <section data-overview-card="revenue" aria-label="Revenue and Plan Mix" className="min-w-0 rounded-2xl border border-[#E2E5ED] bg-white p-4 sm:p-5">
      <div role="tablist" aria-label="Platform revenue views" className="flex gap-6 border-b border-[#E2E5ED]">
        {['Revenue', 'Plan Mix'].map((label, index) => <button key={label} ref={node => { tabs.current[index] = node }} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel`} aria-selected={tab === label} tabIndex={tab === label ? 0 : -1} onKeyDown={event => changeTab(event, index)} onClick={() => setTab(label)} className={`border-b-2 pb-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#475AA2] ${tab === label ? 'border-[#475AA2] text-[#475AA2]' : 'border-transparent text-[#7A8190]'}`}>{label}</button>)}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${tab === 'Revenue' ? 0 : 1}`} tabIndex={0} className="pt-4">
        {state.preview && <p className="mb-3 text-xs leading-5 text-[#7A8190]">Sample data for design preview only — not live platform statistics.</p>}
        <h2 className="text-sm font-medium text-[#52556C]">{tab === 'Revenue' ? 'Monthly recurring revenue' : 'Active hospital subscriptions'}</h2>
        {tab === 'Revenue' && <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2"><p className="text-2xl font-semibold text-[#111827]">{data.monthlyRevenue !== null ? formatNaira(data.monthlyRevenue) : '—'}</p>{comparison !== null && <p className="text-xs text-[#52556C]">{comparison > 0 ? '+' : ''}{comparison.toFixed(1)}% vs previous month</p>}</div>}
        {state.status === 'loading' ? <p role="status" className="py-6 text-sm text-[#7A8190]">Loading platform statistics...</p>
          : state.status === 'error' ? <div role="alert" className="py-6 text-sm"><p>Unable to load platform statistics.</p>{onRetry && <button type="button" onClick={onRetry} className="mt-3 rounded-xl bg-[#475AA2] px-4 py-2 font-semibold text-white">Try again</button>}</div>
          : tab === 'Revenue' ? data.months.length ? <div role="img" aria-label={`Monthly recurring revenue bar chart in Nigerian naira. ${data.months.map(month => `${month.label}: ${formatNaira(month.amount)}`).join('; ')}`} className="mt-4">
              <div aria-hidden="true" className="flex h-36 items-end gap-1 border-b border-[#E2E5ED] sm:h-40 sm:gap-2">
                {data.months.map((month, index) => <div key={month.label} className="flex h-full min-w-0 flex-1 items-end"><div title={`${month.label}: ${formatNaira(month.amount)}`} className={`w-full rounded-t-md ${index === data.months.length - 1 ? 'bg-[#475AA2]' : 'bg-[#DEE2F4]'}`} style={{ height: `${month.amount / maximum * 100}%` }} /></div>)}
              </div>
              <div aria-hidden="true" className="mt-3 flex gap-1 text-center text-[10px] text-[#7A8190] sm:gap-2 2xl:text-xs">{data.months.map(month => <span key={month.label} className="min-w-0 flex-1">{month.label}</span>)}</div>
            </div> : <p className="py-6 text-sm text-[#7A8190]">No revenue data available.</p>
          : data.plans.length ? <div className="mt-6 space-y-7 pb-3">{data.plans.map((plan, index) => <div key={plan.name}>
              <div className="mb-3 flex items-center justify-between gap-3 text-sm"><h3 className="font-medium">{plan.name}</h3><span className="text-[#7A8190]">{plan.share.toFixed(1)}%</span></div>
              <div role="progressbar" aria-label={`${plan.name} share of active subscribers`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={plan.share} className="h-3 overflow-hidden rounded-full bg-[#EEF0FF]"><div className={`h-full rounded-full ${index === 0 ? 'bg-[#475AA2]' : 'bg-[#DEE2F4]'}`} style={{ width: `${plan.share}%` }} /></div>
              <p className="mt-2 text-xs text-[#7A8190]">{plan.count} active {plan.count === 1 ? 'subscriber' : 'subscribers'}</p>
            </div>)}</div> : <p className="py-6 text-sm text-[#7A8190]">No plan distribution data available.</p>}
      </div>
    </section>
  )
}
