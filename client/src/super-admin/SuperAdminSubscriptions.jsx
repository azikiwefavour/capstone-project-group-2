import { useEffect, useId, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import SuperAdminLayout from './SuperAdminLayout.jsx'
import { subscriptionPlans } from './subscriptionPlans.js'
import { createSubscriptionsState } from './subscriptionsState.js'
import SubscriptionPlanCard from './SubscriptionPlanCard.jsx'
import SubscribersTable from './SubscribersTable.jsx'
import { getSuperAdminSubscriptions } from './subscriptionsApi.js'

export function SuperAdminSubscriptionsPage({ profile, onLogout, preview = false, state = createSubscriptionsState(), subscribers, live = false }) {
  const [cycle, setCycle] = useState('monthly')
  const groupId = useId()
  const [controls, setControls] = useState({ search: '', status: '', plan: '', sort: 'charge_asc', page: 1 })
  const [remote, setRemote] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const requestKey = JSON.stringify([cycle, controls, attempt])
  useEffect(() => {
    if (!live) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      getSuperAdminSubscriptions({ cycle, ...controls }, controller.signal).then(result => {
        if (!controller.signal.aborted) setRemote({ key: requestKey, result })
      }).catch(error => {
        if (error.name !== 'AbortError' && !controller.signal.aborted) setRemote({ key: requestKey, result: { ...createSubscriptionsState('error'), error: error.message } })
      })
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [live, cycle, controls, requestKey])
  const source = live ? remote?.key === requestKey ? remote.result : createSubscriptionsState('loading')
    : subscribers === undefined ? state : { ...state, status: 'ready', records: subscribers }
  function changeControls(update) { setControls(current => ({ ...current, ...update })) }
  const countsAvailable = ['ready', 'empty'].includes(source.status)
  return (
    <SuperAdminLayout profile={profile} onLogout={onLogout} preview={preview} page="subscriptions">
      <h1 className="mt-2 text-2xl font-semibold tracking-normal xl:text-xl xl:leading-6">Subscriptions</h1>
      <section data-subscription-plan-panel aria-label="Subscription plans" className="mt-2 min-h-0 min-w-0 rounded-2xl bg-[#F3EDF8] p-2">
      <div role="radiogroup" aria-label="Billing cycle" className="relative inline-flex rounded-xl border border-[#E2E5ED] bg-[#EEF0FF] p-1">
        {[['monthly', 'Monthly'], ['annually', 'Annually']].map(([value, label]) => <label key={value} className="relative cursor-pointer">
          <input type="radio" name={groupId} value={value} checked={cycle === value} onChange={() => setCycle(value)} className="peer sr-only" />
          <span className="block rounded-lg px-3 py-1 text-xs font-medium leading-4 text-[#7A8190] peer-checked:bg-white peer-checked:text-[#475AA2] peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-[#475AA2]">{label}</span>
        </label>)}
      </div>
      <div data-subscription-plan-grid className="mt-1.5 grid min-h-0 min-w-0 grid-cols-1 items-stretch gap-3 md:grid-cols-2">
        {subscriptionPlans.map(plan => <SubscriptionPlanCard key={plan.name} plan={{ ...plan, ...(live ? { [cycle === 'annually' ? 'annualPrice' : 'monthlyPrice']: countsAvailable ? source.planPrices?.[plan.id] : null } : {}), subscribers: countsAvailable ? source.subscriberCounts?.[plan.id] : null }} annual={cycle === 'annually'} />)}
      </div>
      </section>
      <SubscribersTable state={source} controls={live ? controls : undefined} onControlsChange={changeControls} onRetry={live ? () => setAttempt(value => value + 1) : undefined} />
    </SuperAdminLayout>
  )
}

export default function SuperAdminSubscriptions() {
  const context = useOutletContext()
  return <SuperAdminSubscriptionsPage live profile={context?.profile} onLogout={context?.onLogout} />
}
