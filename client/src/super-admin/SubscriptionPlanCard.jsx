import { formatStatistic } from './statisticsMetrics.js'
import { formatNaira } from './revenue'

export default function SubscriptionPlanCard({ plan, annual }) {
  const price = annual ? plan.annualPrice : plan.monthlyPrice
  const available = Number.isFinite(price) && price >= 0
  return (
    <article aria-label={plan.name} className="flex min-w-0 flex-col rounded-xl bg-white p-2.5">
      <h2 className="text-base font-medium leading-5 text-[#111827]">{plan.name}</h2>
      <div aria-live="polite" aria-atomic="true" className="mt-1">
        <p className="flex flex-wrap items-baseline gap-1"><span className="text-2xl font-semibold leading-7 text-[#111827]">{available ? formatNaira(price) : '—'}</span><span className="text-xs text-[#7A8190]">/{annual ? 'year' : 'month'}</span></p>
        <div className="mt-0.5 min-h-4 text-[11px] leading-4 text-[#7A8190]">{annual && available && Number.isFinite(plan.originalAnnualPrice) && plan.originalAnnualPrice >= price && <del aria-label={`Original annual price for ${plan.name}`}>{formatNaira(plan.originalAnnualPrice)}</del>}</div>
      </div>
      <ul aria-label={`${plan.name} features`} className="mt-1 flex-1 space-y-1 text-[13px] leading-4 text-[#52556C]">
        {plan.features.map(feature => <li key={feature} className="flex items-start gap-2"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#475AA2]"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg><span>{feature}</span></li>)}
      </ul>
      <div data-plan-subscribers role="group" aria-label="Subscriber count" className="mt-1.5 flex items-center justify-between gap-3 border-t border-[#E2E5ED] pt-1 text-xs leading-4 text-[#7A8190]"><span>Subscribers</span><span className="font-semibold text-[#111827]">{formatStatistic(plan.subscribers)}</span></div>
    </article>
  )
}
