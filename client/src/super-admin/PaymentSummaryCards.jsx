import { formatPaymentAmount } from './paymentsResponse.js'
import { formatStatistic } from './statisticsMetrics'

const cards = [
  { key: 'collectedLast90Days', label: 'Collected (last 90 days)', description: 'Successful subscription payments received.', currency: true },
  { key: 'upcomingNext30Days', label: 'Upcoming payments', description: 'Expected subscription payments in the next 30 days.', currency: true },
  { key: 'failedCharges', label: 'Failed charges', description: 'Unsuccessful payment attempts.', currency: false },
]

// Presentation only. No date-window arithmetic, gateway calls or transaction records.
export default function PaymentSummaryCards({ summary, settlement = false }) {
  const displayedCards = cards.map(card => settlement && card.key === 'upcomingNext30Days' ? { key: 'pendingSettlement', label: 'Pending Settlement', description: 'Subscription payments awaiting settlement.', currency: true } : card)
  return <section aria-label="Payment summary" className="mt-5 grid min-w-0 auto-rows-fr grid-cols-1 gap-4 md:grid-cols-3">
    {displayedCards.map(card => {
      const value = summary?.[card.key]
      const display = card.currency ? Number.isFinite(value) && value >= 0 ? formatPaymentAmount(value) : '—' : formatStatistic(value)
      return <article key={card.key} aria-label={card.label} className="flex min-w-0 flex-col rounded-2xl border border-[#E2E5ED] bg-white p-4">
        <h2 className="text-xs font-medium leading-5 text-[#7A8190]">{card.label}</h2>
        <p className="mt-2 text-2xl font-semibold leading-8 text-[#111827]">{display}</p>
        <p className="mt-2 text-xs leading-5 text-[#7A8190]">{card.description}</p>
      </article>
    })}
  </section>
}
