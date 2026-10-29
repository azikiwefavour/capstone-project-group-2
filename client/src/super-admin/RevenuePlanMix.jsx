import { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
    <section
      data-overview-card="revenue"
      aria-label="Revenue and Plan Mix"
      className="min-w-0 rounded-2xl border border-[#E2E5ED] bg-white p-5 sm:p-6 shadow-xs dark:border-[#253248] dark:bg-[#161F30]"
    >
      <div className="flex items-center justify-between gap-3">
        <div role="tablist" aria-label="Platform revenue views" className="inline-flex items-center rounded-xl bg-[#F0F3F9] p-1 dark:bg-[#1E293B]">
          {['Revenue', 'Plan Mix'].map((label, index) => (
            <button
              key={label}
              ref={node => { tabs.current[index] = node }}
              type="button"
              role="tab"
              id={`${id}-tab-${index}`}
              aria-controls={`${id}-panel`}
              aria-selected={tab === label}
              tabIndex={tab === label ? 0 : -1}
              onKeyDown={event => changeTab(event, index)}
              onClick={() => setTab(label)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-[#475AA2] ${
                tab === label
                  ? 'bg-white text-[#111827] shadow-xs dark:bg-[#28354E] dark:text-[#F8FAFC]'
                  : 'text-[#64748B] hover:text-[#111827] dark:text-[#94A3B8] dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Link
          to="/super-admin/subscriptions"
          className="inline-flex items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-[#475569] shadow-2xs hover:bg-[#F1F5F9] dark:border-[#334155] dark:bg-[#1E293B] dark:text-[#CBD5E1] dark:hover:bg-[#28354E] transition-all"
        >
          Subscriptions
        </Link>
      </div>

      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${tab === 'Revenue' ? 0 : 1}`} tabIndex={0} className="pt-4">
        <h2 className="text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">
          {tab === 'Revenue' ? 'Monthly recurring revenue' : 'Active hospital subscriptions'}
        </h2>
        {tab === 'Revenue' && (
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
              {data.monthlyRevenue !== null ? formatNaira(data.monthlyRevenue) : '—'}
            </p>
            {comparison !== null && (
              <p className={`text-xs font-semibold ${comparison >= 0 ? 'text-[#16A34A] dark:text-[#4ADE80]' : 'text-rose-600 dark:text-rose-400'}`}>
                {comparison > 0 ? '+' : ''}{comparison.toFixed(1)}% vs previous month
              </p>
            )}
          </div>
        )}

        {state.status === 'loading' ? (
          <p role="status" className="py-8 text-sm text-[#7A8190] dark:text-[#94A3B8]">Loading platform statistics...</p>
        ) : state.status === 'error' ? (
          <div role="alert" className="py-8 text-sm dark:text-[#CBD5E1]">
            <p>Unable to load platform statistics.</p>
            {onRetry && <button type="button" onClick={onRetry} className="mt-3 rounded-xl bg-[#475AA2] px-4 py-2 font-semibold text-white">Try again</button>}
          </div>
        ) : tab === 'Revenue' ? (
          data.months.length ? (
            <div role="img" aria-label={`Monthly recurring revenue bar chart in Nigerian naira. ${data.months.map(month => `${month.label}: ${formatNaira(month.amount)}`).join('; ')}`} className="mt-6">
              <div aria-hidden="true" className="flex h-44 sm:h-48 items-end justify-between gap-2 sm:gap-4 px-2">
                {data.months.map((month, index) => {
                  const isCurrent = index === data.months.length - 1
                  const barHeightPct = Math.max(12, Math.round((month.amount / maximum) * 100))
                  return (
                    <div key={month.label} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                      <div
                        title={`${month.label}: ${formatNaira(month.amount)}`}
                        className={`w-full max-w-[42px] rounded-full transition-all duration-300 ${
                          isCurrent
                            ? 'bg-[#4353A4] shadow-sm dark:bg-[#5C6EC9]'
                            : 'bg-[#EAEFFC] hover:bg-[#DFE7F9] dark:bg-[#232F48] dark:hover:bg-[#2C3B5A]'
                        }`}
                        style={{ height: `${barHeightPct}%` }}
                      />
                    </div>
                  )
                })}
              </div>
              <div aria-hidden="true" className="mt-3 flex justify-between gap-2 sm:gap-4 px-2 text-center text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                {data.months.map(month => (
                  <span key={month.label} className="min-w-0 flex-1">{month.label}</span>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-8 text-sm text-[#7A8190] dark:text-[#94A3B8]">No revenue data available.</p>
          )
        ) : (
          data.plans.length ? (
            <div className="mt-6 space-y-6 pb-2">
              {data.plans.map((plan, index) => (
                <div key={plan.name}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <h3 className="font-medium text-[#111827] dark:text-[#F8FAFC]">{plan.name}</h3>
                    <span className="text-[#64748B] dark:text-[#94A3B8] font-semibold">{plan.share.toFixed(1)}%</span>
                  </div>
                  <div role="progressbar" aria-label={`${plan.name} share of active subscribers`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={plan.share} className="h-3 overflow-hidden rounded-full bg-[#EEF0FF] dark:bg-[#1E293B]">
                    <div className={`h-full rounded-full transition-all duration-300 ${index === 0 ? 'bg-[#4353A4] dark:bg-[#5C6EC9]' : 'bg-[#C5D0F5] dark:bg-[#3E4F7C]'}`} style={{ width: `${plan.share}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-[#7A8190] dark:text-[#94A3B8]">{plan.count} active {plan.count === 1 ? 'subscriber' : 'subscribers'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-sm text-[#7A8190] dark:text-[#94A3B8]">No plan distribution data available.</p>
          )
        )}
      </div>
    </section>
  )
}
