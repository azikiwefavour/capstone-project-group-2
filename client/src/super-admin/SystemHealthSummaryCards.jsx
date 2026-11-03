import { formatStatistic } from './statisticsMetrics.js'

export default function SystemHealthSummaryCards({ summary, details }) {
  const percentage = (value, decimals) => Number.isFinite(value) && value >= 0 && value <= 100 ? `${value.toFixed(decimals)}%` : '—'
  const cards = [
    ['API uptime - 30 days', percentage(summary?.apiUptime, 2), percentage(details?.uptimeTargetPercent, 1) !== '—' ? `Target ${details.uptimeTargetPercent}%` : '—'],
    ['API response time', Number.isFinite(summary?.apiResponseTime) && summary.apiResponseTime >= 0 ? `${Math.round(summary.apiResponseTime)} ms` : '—', percentage(details?.requestsFasterPercent, 1) !== '—' ? `${details.requestsFasterPercent}% of requests faster` : '—'],
    ['Payment webhooks', percentage(summary?.paymentWebhooks, 1), percentage(summary?.paymentWebhooks, 1) !== '—' ? 'Delivered first time' : '—'],
    ['Open incidents', formatStatistic(summary?.openIncidents), Number.isSafeInteger(details?.resolvedThisMonth) && details.resolvedThisMonth >= 0 ? `${formatStatistic(details.resolvedThisMonth)} resolved this month` : '—'],
  ]
  return <section aria-label="System Health summary" className="mt-3 grid min-w-0 auto-rows-fr grid-cols-1 gap-3 rounded-2xl bg-[#F3EDF8] p-2 sm:grid-cols-2 lg:grid-cols-4">
    {cards.map(([label, value, description]) => <article key={label} aria-label={label} className="flex min-w-0 flex-col rounded-xl bg-white px-3 py-3">
      <h2 className="text-xs font-medium leading-5 text-[#7A8190]">{label}</h2>
      <p className="mt-1 text-2xl font-semibold leading-8">{value}</p>
      <div className="mt-auto pt-1"><p className="border-t border-[#E2E5ED] pt-1 text-xs leading-4 text-[#7A8190]">{description}</p></div>
    </article>)}
  </section>
}
