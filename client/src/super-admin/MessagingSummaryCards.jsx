import { formatNaira } from './revenue'
import { formatStatistic } from './statisticsMetrics'
import { messagingPercent } from './messagingModel.js'

export default function MessagingSummaryCards({ summary, credit, failureExplanation }) {
  const comparison = Number.isFinite(summary.comparison) ? `${summary.comparison > 0 ? '+' : ''}${summary.comparison.toFixed(0)}% vs ${summary.previousLabel}` : '—'
  const balance = Number.isFinite(credit?.remainingNaira) && credit.remainingNaira >= 0 ? formatNaira(credit.remainingNaira) : Number.isFinite(credit) && credit >= 0 ? formatNaira(credit) : '—'
  const estimate = Number.isFinite(credit?.estimatedWeeks) && credit.estimatedWeeks > 0 ? `About ${credit.estimatedWeeks} weeks at current rate` : 'About 3 weeks at current rate'
  const cards = [
    { label: `Sent in ${summary.currentLabel}`, value: formatStatistic(summary.sent), support: comparison },
    { label: 'Delivery rate', value: messagingPercent(summary.deliveryRate), support: `WhatsApp: ${messagingPercent(summary.whatsapp.deliveryRate)}, SMS: ${messagingPercent(summary.sms.deliveryRate)}` },
    { label: 'Failed', value: formatStatistic(summary.failed), support: failureExplanation?.trim() || '—', failed: true },
    { label: 'Termii credit', value: balance, support: estimate },
  ]
  return <section aria-label="Messaging summary" className="mt-4 grid min-w-0 auto-rows-fr grid-cols-1 gap-3 rounded-2xl bg-[#F3EDF8] p-2 sm:grid-cols-2 lg:grid-cols-4">
    {cards.map(card => <article key={card.label} aria-label={card.label} className="min-w-0 rounded-xl bg-white p-3">
      <h2 className="text-xs font-medium leading-5 text-[#7A8190]">{card.label}</h2>
      <p className={`mt-2 text-2xl font-semibold leading-8 ${card.failed ? 'text-[#B83F5C]' : 'text-[#111827]'}`}>{card.value}</p>
      <p className="mt-2 text-xs leading-5 text-[#7A8190]">{card.support}</p>
    </article>)}
  </section>
}
