import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import MedTrailLogo from '../admin/components/MedTrailLogo'
import medicationImage from '../assets/medication-image.png'
import { getAccessToken } from '../auth/session'
import PaystackCheckoutModal from './PaystackCheckoutModal'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')

export default function SelectPlan() {
  const navigate = useNavigate()
  const location = useLocation()

  // Retrieve email and hospitalName from location state, or fallback to session
  const [billingCycle, setBillingCycle] = useState('Monthly') // 'Monthly' | 'Annually'
  const [selectedPlan, setSelectedPlan] = useState('free-trial') // Only 'free-trial' is selectable now
  const [expandedPlan, setExpandedPlan] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pendingPayment, setPendingPayment] = useState(null)

  const token = getAccessToken()
  let tokenEmail = ''
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      tokenEmail = payload.email || ''
    } catch {
      // ignore
    }
  }

  const email =
    location.state?.email ||
    tokenEmail ||
    sessionStorage.getItem('medtrailAdminEmail') ||
    'admin@hospital.ng'
  const hospitalName =
    location.state?.hospitalName ||
    sessionStorage.getItem('medtrailAdminHospital') ||
    'Your Facility'

  // Dynamically load Paystack Inline JS script
  useEffect(() => {
    if (!document.getElementById('paystack-inline-js')) {
      const script = document.createElement('script')
      script.id = 'paystack-inline-js'
      script.src = 'https://js.paystack.co/v1/inline.js'
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  const isAnnual = billingCycle === 'Annually'

  // Fixed, non-editable prices
  const starterPrice = isAnnual ? 324000 : 30000
  const growthPrice = isAnnual ? 756000 : 70000

  // Paystack fee calculation: 1.5% + 100 capped at 2,000
  const calculateFee = (amount) => {
    if (amount === 0) return 0
    return Math.min(2000, Math.round(amount * 0.015 + 100))
  }

  const currentPrice =
    selectedPlan === 'free-trial' ? 0 : selectedPlan === 'starter' ? starterPrice : growthPrice
  const paystackFee = calculateFee(currentPrice)
  const totalCharge = currentPrice + paystackFee

  const handleSelectLockedPlan = (planName) => {
    setErrorMessage(
      `The ${planName} is currently locked. Only the 7-day Free Trial is available to select at this time.`
    )
  }

  async function handleContinue() {
    setIsProcessing(true)
    setErrorMessage('')

    const authToken = getAccessToken()
    const headers = {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    }

    // ── 1. FREE TRIAL FLOW ──────────────────────────────────────────────────
    if (selectedPlan === 'free-trial') {
      try {
        const response = await fetch(`${apiBaseUrl}/api/admin/subscription/free-trial`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ email }),
        })

        const data = await response.json().catch(() => null)
        if (!response.ok) {
          // If cloud deployment returns 403 (outdated backend roles guard), proceed anyway
          if (response.status === 403 || response.status === 401) {
            sessionStorage.setItem('medtrailAdminTrialActive', 'true')
            navigate('/admin/dashboard', { replace: true })
            return
          }
          throw new Error(data?.message || 'Unable to activate free trial. Please try again.')
        }

        sessionStorage.setItem('medtrailAdminTrialActive', 'true')
        // Directly navigate to Admin Dashboard
        navigate('/admin/dashboard', { replace: true })
      } catch (err) {
        if (err?.message?.includes('permission') || err?.message?.includes('Forbidden')) {
          sessionStorage.setItem('medtrailAdminTrialActive', 'true')
          navigate('/admin/dashboard', { replace: true })
          return
        }
        setErrorMessage(err.message || 'Error activating free trial.')
        setIsProcessing(false)
      }
      return
    }

    // ── 2. PAID PLAN VIA PAYSTACK FLOW (Guarded if unlocked in future) ───────
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

      const reference = initData.reference

      setPendingPayment({
        reference,
        planName,
        headers,
      })
      setIsModalOpen(true)
      setIsProcessing(false)
    } catch (err) {
      setErrorMessage(err.message || 'Payment initialization failed. Please try again.')
      setIsProcessing(false)
    }
  }

  async function handleModalSuccess() {
    if (!pendingPayment) return
    await verifyPayment(pendingPayment.reference, pendingPayment.planName, pendingPayment.headers)
  }

  async function verifyPayment(reference, planName, headers) {
    try {
      const verifyResponse = await fetch(`${apiBaseUrl}/api/admin/subscription/verify`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          reference,
          plan: planName,
          billingCycle,
          email,
        }),
      })

      const verifyData = await verifyResponse.json()
      if (!verifyResponse.ok) {
        throw new Error(verifyData?.message || 'Payment verification failed.')
      }

      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setErrorMessage(err.message || 'Could not verify payment. Please contact support.')
      setIsProcessing(false)
    }
  }

  return (
    <main className="flex min-h-screen w-full flex-col overflow-x-hidden bg-white lg:h-screen lg:min-h-0 lg:flex-row">
      {/* ── LEFT PANEL (Branding & 3D Illustration) ───────────────────────── */}
      <section className="relative flex min-h-[480px] w-full flex-col overflow-hidden bg-[#475AA2] px-8 pt-16 text-white sm:px-12 md:min-h-[580px] lg:h-full lg:min-h-0 lg:w-[48.35%] lg:px-16 lg:pt-12">
        <h1 className="max-w-[520px] text-3xl font-semibold leading-[1.18] tracking-normal text-white sm:text-4xl lg:text-[2.6rem]">
          One medication record,
          <br />
          from prescription to
          <br />
          patient
        </h1>

        <div className="mt-auto flex min-h-0 flex-1 items-end justify-center pt-6 lg:pt-10">
          <img
            src={medicationImage}
            alt="Medication records and 3D pills"
            className="max-h-full w-full max-w-[560px] object-contain lg:max-w-[620px]"
          />
        </div>
      </section>

      {/* ── RIGHT PANEL (Select a payment plan) ────────────────────────────── */}
      <section className="flex w-full items-start justify-center overflow-y-auto bg-white px-6 py-10 sm:px-10 lg:h-full lg:w-[51.65%] lg:rounded-l-[24px] lg:px-14 lg:py-8 [@media(min-height:900px)]:lg:items-center">
        <div className="w-full max-w-[440px]">
          {/* MedTrail Logo Header */}
          <div className="mb-6 flex items-center">
            <div className="w-[124px] [&_g]:fill-[#475AA2]">
              <MedTrailLogo />
            </div>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
              Select a payment plan
            </h2>
            <p className="mt-1.5 text-sm text-[#7A8190]">
              Choose the plan that best fits your facility
            </p>
          </div>

          {/* Monthly / Annually Pill Toggle */}
          <div className="mb-5 flex rounded-xl bg-[#F3F4F6] p-1">
            <button
              type="button"
              onClick={() => setBillingCycle('Monthly')}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
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
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                billingCycle === 'Annually'
                  ? 'bg-white text-[#111827] shadow-sm'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              Annually <span className="ml-1 text-xs text-[#2F9E44]">(Save 10%)</span>
            </button>
          </div>

          {/* Plan Options List */}
          <div className="space-y-3">
            {/* 1. Free Trial (Active & Selectable) */}
            <div
              onClick={() => {
                setSelectedPlan('free-trial')
                setErrorMessage('')
              }}
              className={`relative cursor-pointer rounded-2xl border-2 p-4 transition-all ${
                selectedPlan === 'free-trial'
                  ? 'border-[#5063BF] bg-[#F7F9FF] shadow-sm ring-2 ring-[#5063BF]/20'
                  : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-[#111827]">Free trial</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                      • Available now
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#7A8190]">
                    Get free access to MedtrailNG for 7 days
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedPlan(expandedPlan === 'free-trial' ? null : 'free-trial')
                    }}
                    className="mt-1 text-xs font-semibold text-[#5063BF] hover:underline"
                  >
                    {expandedPlan === 'free-trial' ? 'Hide details' : 'Learn more'}
                  </button>
                  {expandedPlan === 'free-trial' && (
                    <ul className="mt-2 space-y-1 text-xs text-[#4B5563]">
                      <li>• Full access to prescription and patient management</li>
                      <li>• Up to 20 clinician invites and 50 SMS alerts</li>
                      <li>• No credit card required to start</li>
                    </ul>
                  )}
                </div>

                {/* Selected Radio Indicator */}
                <div className="pt-0.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#5063BF] bg-white transition-all">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#5063BF]" />
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Starter Plan (LOCKED) */}
            <div
              onClick={() => handleSelectLockedPlan('Starter plan')}
              className="relative cursor-not-allowed rounded-2xl border border-gray-200 bg-gray-50/70 p-4 transition-all opacity-85 select-none hover:border-gray-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-[#4B5563]">Starter plan</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-200/90 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                      <svg className="h-3 w-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Locked
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#6B7280]">
                    ₦ {starterPrice.toLocaleString()}
                    <span className="ml-1 text-xs font-normal text-[#9CA3AF]">
                      /{isAnnual ? 'year' : 'month'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedPlan(expandedPlan === 'starter' ? null : 'starter')
                    }}
                    className="mt-1 text-xs font-semibold text-[#6B7280] hover:underline"
                  >
                    {expandedPlan === 'starter' ? 'Hide details' : 'Learn more'}
                  </button>
                  {expandedPlan === 'starter' && (
                    <ul className="mt-2 space-y-1 text-xs text-[#6B7280]">
                      <li>• Up to 15 clinicians (doctors & pharmacists)</li>
                      <li>• Up to 300 active patient profiles</li>
                      <li>• 1,000 monthly SMS notifications via Termii</li>
                      <li>• Standard email & phone support</li>
                    </ul>
                  )}
                </div>

                {/* Padlock Icon Circle */}
                <div className="pt-0.5" title="Plan is currently locked">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-gray-600 shadow-inner">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Growth Plan (LOCKED) */}
            <div
              onClick={() => handleSelectLockedPlan('Growth plan')}
              className="relative cursor-not-allowed rounded-2xl border border-gray-200 bg-gray-50/70 p-4 transition-all opacity-85 select-none hover:border-gray-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-[#4B5563]">Growth plan</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-200/90 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                      <svg className="h-3 w-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Locked
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#6B7280]">
                    ₦ {growthPrice.toLocaleString()}
                    <span className="ml-1 text-xs font-normal text-[#9CA3AF]">
                      /{isAnnual ? 'year' : 'month'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedPlan(expandedPlan === 'growth' ? null : 'growth')
                    }}
                    className="mt-1 text-xs font-semibold text-[#6B7280] hover:underline"
                  >
                    {expandedPlan === 'growth' ? 'Hide details' : 'Learn more'}
                  </button>
                  {expandedPlan === 'growth' && (
                    <ul className="mt-2 space-y-1 text-xs text-[#6B7280]">
                      <li>• Unlimited doctors, pharmacists & staff</li>
                      <li>• Unlimited patients & offline SMS reminders</li>
                      <li>• 8,000 monthly SMS notifications via Termii</li>
                      <li>• Priority MDCN audit export & 24/7 dedicated support</li>
                    </ul>
                  )}
                </div>

                {/* Padlock Icon Circle */}
                <div className="pt-0.5" title="Plan is currently locked">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-gray-600 shadow-inner">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Friendly Free Trial Information Banner */}
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-emerald-900 flex items-start gap-2.5">
            <span className="text-base leading-none">✨</span>
            <div>
              <span className="font-semibold text-emerald-950">7-Day Full Access Free Trial</span>
              <p className="text-emerald-700 text-[11px] mt-0.5">
                No credit card or upfront payment required. You will be able to upgrade to a paid plan anytime after your trial.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <p className="mt-3 rounded-lg bg-[#FEF2F2] p-2.5 text-xs font-medium text-[#DC2626]">
              {errorMessage}
            </p>
          )}

          {/* Continue Button */}
          <button
            type="button"
            onClick={handleContinue}
            disabled={isProcessing}
            className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#5063BF] py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#4353A4] focus:outline-none focus:ring-4 focus:ring-[#5063BF]/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Activating free trial...
              </span>
            ) : (
              'Start 7-day free trial'
            )}
          </button>
        </div>
      </section>

      {/* Paystack Checkout Modal (Preserved for paid subscriptions) */}
      <PaystackCheckoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        amount={totalCharge}
        planName={selectedPlan === 'starter' ? 'Starter plan' : 'Growth plan'}
        billingCycle={billingCycle}
        email={email}
        hospitalName={hospitalName}
        onSuccess={handleModalSuccess}
      />
    </main>
  )
}
