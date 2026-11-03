import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MedTrailLogo from '../admin/components/MedTrailLogo'
import PaystackCheckoutModal from '../pages/PaystackCheckoutModal'
import { getAccessToken, setAccessToken } from '../auth/session'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')

export default function PaymentGatingModal({
  isOpen,
  email,
  hospitalName,
  adminName,
  trialUsed = false,
  isTrialExpired = false,
  isSubscriptionExpired = false,
  onSuccess,
  onLogout,
}) {
  const navigate = useNavigate()
  const [selectedPlan, setSelectedPlan] = useState('growth') // Default to most popular
  const [billingCycle, setBillingCycle] = useState('Monthly') // 'Monthly' | 'Annually'
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isPaystackOpen, setIsPaystackOpen] = useState(false)
  const [pendingPayment, setPendingPayment] = useState(null)
  const [status, setStatus] = useState('selecting') // 'selecting' | 'success'
  const [successDetails, setSuccessDetails] = useState(null)

  if (!isOpen) return null

  const isAnnual = billingCycle === 'Annually'
  const starterPrice = isAnnual ? 324000 : 30000
  const growthPrice = isAnnual ? 756000 : 70000

  const calculateFee = (amount) => {
    if (amount === 0) return 0
    return Math.min(2000, Math.round(amount * 0.015 + 100))
  }

  const currentPrice =
    selectedPlan === 'free-trial' ? 0 : selectedPlan === 'starter' ? starterPrice : growthPrice
  const paystackFee = calculateFee(currentPrice)
  const totalCharge = currentPrice + paystackFee

  async function handleProceed() {
    setIsProcessing(true)
    setErrorMessage('')

    const authToken = getAccessToken()
    const headers = {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    }

    // ── 1. Free Trial Option ──────────────────────────────────────────────
    if (selectedPlan === 'free-trial') {
      if (trialUsed || isTrialExpired) {
        setErrorMessage('Your 7-day free trial has already been used. Please select a paid plan (Starter or Growth) to continue.')
        setIsProcessing(false)
        return
      }

      try {
        const response = await fetch(`${apiBaseUrl}/api/admin/subscription/free-trial`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ email }),
        })

        const data = await response.json().catch(() => null)
        if (!response.ok && response.status !== 403 && response.status !== 401) {
          throw new Error(data?.message || 'Unable to activate free trial.')
        }

        setSuccessDetails({
          title: '7-Day Free Trial Activated!',
          plan: 'Growth Plan (Free Trial)',
          cycle: '7 Days Access',
          subtitle: 'Welcome to MedTrail! Your admin dashboard is now unlocked.',
        })
        setStatus('success')

        setTimeout(() => {
          if (onSuccess) {
            onSuccess()
          } else {
            navigate('/admin/dashboard', { replace: true })
          }
        }, 2200)
      } catch (err) {
        setErrorMessage(err.message || 'Error activating free trial.')
        setIsProcessing(false)
      }
      return
    }

    // ── 2. Paid Plan Option (Card or Bank Transfer) ────────────────────────
    const planName = selectedPlan === 'starter' ? 'Starter plan' : 'Growth plan'

    try {
      const initResponse = await fetch(`${apiBaseUrl}/api/admin/subscription/initialize`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          plan: planName,
          billingCycle,
          email,
          callbackUrl: `${window.location.origin}/admin/dashboard`,
        }),
      })

      const initData = await initResponse.json()
      if (!initResponse.ok) {
        throw new Error(initData?.message || 'Unable to initialize payment.')
      }

      setPendingPayment({
        reference: initData.reference,
        planName,
        headers,
      })
      setIsPaystackOpen(true)
      setIsProcessing(false)
    } catch (err) {
      setErrorMessage(err.message || 'Payment initialization failed. Please try again.')
      setIsProcessing(false)
    }
  }

  async function handlePaystackVerify(channel = 'Card') {
    if (!pendingPayment) return

    const verifyResponse = await fetch(`${apiBaseUrl}/api/admin/subscription/verify`, {
      method: 'POST',
      headers: pendingPayment.headers,
      body: JSON.stringify({
        reference: pendingPayment.reference,
        plan: pendingPayment.planName,
        billingCycle,
        email,
        channel,
      }),
    })

    const verifyData = await verifyResponse.json()
    if (!verifyResponse.ok) {
      throw new Error(verifyData?.message || 'Payment verification failed.')
    }
  }

  function handlePaystackFinish() {
    setIsPaystackOpen(false)
    if (onSuccess) {
      onSuccess()
    } else {
      navigate('/admin/dashboard', { replace: true })
    }
  }

  const handleSignOut = () => {
    if (onLogout) {
      onLogout()
    } else {
      setAccessToken(null)
      navigate('/login', { replace: true, state: { selectedRole: 'Admin' } })
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md transition-all"
    >
      <div className="relative my-8 w-full max-w-[520px] overflow-hidden rounded-3xl bg-white shadow-2xl transition-all">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-[#F6F8FF] to-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-[100px] [&_g]:fill-[#475AA2]">
              <MedTrailLogo />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              <svg className="h-3.5 w-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {isTrialExpired ? 'Trial Expired' : isSubscriptionExpired ? 'Subscription Expired' : 'Payment Required'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* THUMBS UP SUCCESS VIEW */}
        {status === 'success' && successDetails ? (
          <div className="flex flex-col items-center px-8 py-12 text-center">
            {/* Animated Thumbs Up Icon with Ripple */}
            <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20" />
              <div className="absolute -inset-2 animate-pulse rounded-full bg-emerald-500/10" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-xl shadow-emerald-500/30">
                <svg
                  className="h-10 w-10 animate-[bounce_1s_infinite]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 10v12" />
                  <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
                </svg>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Activation Confirmed
            </div>

            <h3 className="mt-3 text-2xl font-bold text-[#111827]">{successDetails.title}</h3>
            <p className="mt-1.5 text-sm text-[#4B5563]">
              <span className="font-semibold text-gray-900">{hospitalName || 'Your Facility'}</span> is now active on{' '}
              <span className="font-semibold text-[#5063BF]">{successDetails.plan}</span>.
            </p>
            <p className="mt-1 text-xs text-emerald-600 font-medium">
              {successDetails.subtitle}
            </p>

            <div className="mt-6 flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onSuccess) onSuccess()
                  else navigate('/admin/dashboard', { replace: true })
                }}
                className="w-full rounded-xl bg-[#5063BF] py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#4353A4] active:scale-[0.99]"
              >
                Go to Admin Dashboard Now →
              </button>
              <p className="text-[11px] text-gray-500">Redirecting automatically in a moment...</p>
            </div>
          </div>
        ) : (
          /* MODAL BODY (Plan selection & payment) */
          <div className="px-6 py-5">
            {/* Headline */}
            <div>
              <h3 className="text-xl font-bold tracking-tight text-[#111827]">
                {isTrialExpired
                  ? 'Your 7-Day Free Trial Has Ended'
                  : isSubscriptionExpired
                  ? 'Your Subscription Has Expired'
                  : 'Complete Your Subscription'}
              </h3>
              <p className="mt-1 text-xs text-[#6B7280]">
                Facility: <span className="font-semibold text-gray-900">{hospitalName || 'Your Facility'}</span> ({email})
              </p>
            </div>

            {/* Notice Alert */}
            <div className="mt-3.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 flex items-start gap-2.5">
              <span className="text-base leading-none">⚠️</span>
              <div>
                <span className="font-semibold">Dashboard Access Is Locked</span>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  {isTrialExpired
                    ? 'You have completed your 7-day free trial. Please select Starter or Growth plan and pay with Card or Bank Transfer to restore access.'
                    : isSubscriptionExpired
                    ? 'Your subscription period has ended. Please renew with Card or Bank Transfer to continue accessing your dashboard.'
                    : 'Your facility has registered, but your subscription is unpaid. Please select a plan and pay with Card or Bank Transfer to access your dashboard.'}
                </p>
              </div>
            </div>

            {/* Monthly / Annually Pill Toggle */}
            <div className="mt-4 flex rounded-xl bg-[#F3F4F6] p-1">
              <button
                type="button"
                onClick={() => setBillingCycle('Monthly')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                  billingCycle === 'Monthly'
                    ? 'bg-white text-[#111827] shadow-sm'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('Annually')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                  billingCycle === 'Annually'
                    ? 'bg-white text-[#111827] shadow-sm'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                Annually <span className="ml-1 text-[11px] text-[#2F9E44]">(Save 10%)</span>
              </button>
            </div>

            {/* Plan Options */}
            <div className="mt-3 space-y-2.5">
              {/* 1. Growth Plan */}
              <div
                onClick={() => {
                  setSelectedPlan('growth')
                  setErrorMessage('')
                }}
                className={`cursor-pointer rounded-2xl border-2 p-3.5 transition-all ${
                  selectedPlan === 'growth'
                    ? 'border-[#5063BF] bg-[#F7F9FF] shadow-sm ring-2 ring-[#5063BF]/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">Growth Plan</span>
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                        Most Popular
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-[#5063BF]">
                      ₦ {growthPrice.toLocaleString()} <span className="text-[11px] font-normal text-gray-500">/{isAnnual ? 'year' : 'month'}</span>
                    </p>
                    <p className="text-[11px] text-gray-500">Unlimited clinicians, patients, and 8,000 SMS</p>
                  </div>

                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    selectedPlan === 'growth' ? 'border-[#5063BF]' : 'border-gray-300'
                  }`}>
                    {selectedPlan === 'growth' && <span className="h-2.5 w-2.5 rounded-full bg-[#5063BF]" />}
                  </span>
                </div>
              </div>

              {/* 2. Starter Plan */}
              <div
                onClick={() => {
                  setSelectedPlan('starter')
                  setErrorMessage('')
                }}
                className={`cursor-pointer rounded-2xl border-2 p-3.5 transition-all ${
                  selectedPlan === 'starter'
                    ? 'border-[#5063BF] bg-[#F7F9FF] shadow-sm ring-2 ring-[#5063BF]/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">Starter Plan</span>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        Standard
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-gray-900">
                      ₦ {starterPrice.toLocaleString()} <span className="text-[11px] font-normal text-gray-500">/{isAnnual ? 'year' : 'month'}</span>
                    </p>
                    <p className="text-[11px] text-gray-500">15 clinicians, 300 active patients, and 1,000 SMS</p>
                  </div>

                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    selectedPlan === 'starter' ? 'border-[#5063BF]' : 'border-gray-300'
                  }`}>
                    {selectedPlan === 'starter' && <span className="h-2.5 w-2.5 rounded-full bg-[#5063BF]" />}
                  </span>
                </div>
              </div>

              {/* 3. 7-Day Free Trial (Single Use) */}
              <div
                onClick={() => {
                  if (trialUsed || isTrialExpired) {
                    setErrorMessage('Your 7-day free trial has already been used. Please select Starter or Growth plan.')
                    return
                  }
                  setSelectedPlan('free-trial')
                  setErrorMessage('')
                }}
                className={`cursor-pointer rounded-2xl border-2 p-3.5 transition-all ${
                  trialUsed || isTrialExpired
                    ? 'opacity-55 cursor-not-allowed border-gray-200 bg-gray-50'
                    : selectedPlan === 'free-trial'
                    ? 'border-[#5063BF] bg-[#F7F9FF] shadow-sm ring-2 ring-[#5063BF]/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">7-Day Free Trial</span>
                      {trialUsed || isTrialExpired ? (
                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                          Trial Completed
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          7 Days Free
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-emerald-700">
                      ₦ 0 <span className="text-[11px] font-normal text-gray-500">(No card required)</span>
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {trialUsed || isTrialExpired
                        ? 'Already completed for this facility. Upgrade to a paid plan.'
                        : 'Full platform access for 7 days before paying'}
                    </p>
                  </div>

                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    trialUsed || isTrialExpired ? 'border-gray-200 bg-gray-100' : selectedPlan === 'free-trial' ? 'border-[#5063BF]' : 'border-gray-300'
                  }`}>
                    {selectedPlan === 'free-trial' && !(trialUsed || isTrialExpired) && <span className="h-2.5 w-2.5 rounded-full bg-[#5063BF]" />}
                  </span>
                </div>
              </div>
            </div>

            {/* Fee & Payment Channel Note */}
            {selectedPlan !== 'free-trial' && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-gray-50 p-2.5 text-xs text-gray-600 border border-gray-100">
                <span>Pay with <strong className="text-gray-900">Card</strong> or <strong className="text-gray-900">Bank Transfer</strong></span>
                <span>Total: <strong className="text-[#5063BF]">₦ {totalCharge.toLocaleString()}</strong></span>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-600">
                {errorMessage}
              </p>
            )}

            {/* Action Buttons */}
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={handleProceed}
                disabled={isProcessing}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#5063BF] py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-[#4353A4] active:scale-[0.99] disabled:opacity-60"
              >
                {isProcessing ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Processing...
                  </>
                ) : selectedPlan === 'free-trial' ? (
                  'Activate 7-Day Free Trial →'
                ) : (
                  `Pay with Card or Bank Transfer (₦ ${totalCharge.toLocaleString()}) →`
                )}
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
              >
                I will complete payment later (Sign out)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Paystack Card & Bank Transfer Modal */}
      <PaystackCheckoutModal
        isOpen={isPaystackOpen}
        onClose={() => setIsPaystackOpen(false)}
        amount={totalCharge}
        planName={selectedPlan === 'starter' ? 'Starter plan' : 'Growth plan'}
        billingCycle={billingCycle}
        email={email}
        hospitalName={hospitalName}
        onVerify={handlePaystackVerify}
        onSuccess={handlePaystackFinish}
      />
    </div>
  )
}
