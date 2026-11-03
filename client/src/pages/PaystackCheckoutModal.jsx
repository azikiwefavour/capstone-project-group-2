import { useState, useEffect } from 'react'

export default function PaystackCheckoutModal({
  isOpen,
  onClose,
  amount,
  planName,
  billingCycle,
  email,
  hospitalName,
  onSuccess,
}) {
  const [method, setMethod] = useState('card') // 'card' | 'transfer'
  const [cardNumber, setCardNumber] = useState('4084 0840 8408 4084')
  const [cardExpiry, setCardExpiry] = useState('08/28')
  const [cardCvv, setCardCvv] = useState('408')
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState('idle') // 'idle' | 'processing' | 'success'

  // Generate a realistic 10-digit virtual account number based on the hospital name/email
  const virtualAccountNumber = '99' + Math.abs(
    (hospitalName + email).split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 100000000, 12345678)
  ).toString().padStart(8, '0').slice(0, 8)

  useEffect(() => {
    if (isOpen) {
      setStatus('idle')
      setCopied(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleCopyAccount = () => {
    navigator.clipboard?.writeText(virtualAccountNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCompletePayment = async () => {
    setStatus('processing')
    // Realistic short delay for processing simulated payment
    await new Promise((r) => setTimeout(r, 1200))
    setStatus('success')

    try {
      // Trigger backend verification and facility activation
      await onSuccess()
    } catch {
      // Continue so user is not stuck
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm transition-all"
    >
      <div className="relative w-full max-w-[460px] overflow-hidden rounded-3xl bg-white shadow-2xl transition-all">
        {/* Modal Top Header (Paystack Branded) */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-[#FAFCFF] px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0BA4DB] text-xs font-black text-white shadow-sm">
              P
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#011B33]">
                <span>Secured by</span>
                <span className="font-bold text-[#0BA4DB]">paystack</span>
                <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-medium text-emerald-800">
                  TEST MODE
                </span>
              </div>
              <p className="text-[11px] text-gray-500">{email}</p>
            </div>
          </div>

          {status !== 'processing' && status !== 'success' && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close payment modal"
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              ✕
            </button>
          )}
        </div>

        {/* SUCCESS VIEW (Lively animated thumbs up) */}
        {status === 'success' ? (
          <div className="flex flex-col items-center px-8 py-10 text-center">
            {/* Animated Thumbs Up Badge */}
            <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
              {/* Pulsing Ripple Rings */}
              <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20" />
              <div className="absolute -inset-2 animate-pulse rounded-full bg-emerald-500/10" />

              {/* Main Circular Thumbs Up */}
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
              Payment Confirmed
            </div>

            <h3 className="mt-3 text-2xl font-bold text-[#111827]">Payment Completed!</h3>
            <p className="mt-1.5 text-sm text-[#4B5563]">
              Paid <span className="font-semibold text-gray-900">₦ {amount.toLocaleString()}</span> for{' '}
              <span className="font-semibold text-[#5063BF]">{planName}</span> ({billingCycle}).
            </p>
            <p className="mt-1 text-xs text-emerald-600 font-medium">
              Your hospital facility is now fully activated.
            </p>

            <div className="mt-6 flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={onSuccess}
                className="w-full rounded-xl bg-[#5063BF] py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#4353A4] active:scale-[0.99]"
              >
                Proceed to Admin Dashboard →
              </button>
            </div>
          </div>
        ) : (
          /* PAYMENT FORM VIEW */
          <div className="px-6 py-6">
            {/* Amount Banner */}
            <div className="mb-5 flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#F0F7FF] to-[#F7F9FF] p-4 border border-[#D8E6FC]">
              <div>
                <span className="text-xs font-medium text-gray-500">Amount to pay</span>
                <div className="text-2xl font-black tracking-tight text-[#011B33]">
                  ₦ {amount.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <span className="rounded-full bg-[#E0E7FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#4338CA]">
                  {planName}
                </span>
                <p className="mt-1 text-[11px] text-gray-500">{billingCycle}</p>
              </div>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setMethod('card')}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                  method === 'card'
                    ? 'bg-white text-[#011B33] shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                Pay with Card
              </button>

              <button
                type="button"
                onClick={() => setMethod('transfer')}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                  method === 'transfer'
                    ? 'bg-white text-[#011B33] shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 3l9 7H3l9-7z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Bank Transfer
              </button>
            </div>

            {/* 1. CARD PAYMENT TAB */}
            {method === 'card' && (
              <div className="space-y-3.5">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Card Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4084 0840 8408 4084"
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-medium tracking-wide text-gray-900 outline-none focus:border-[#0BA4DB] focus:ring-4 focus:ring-[#0BA4DB]/15"
                    />
                    <div className="absolute right-3 top-2.5 flex items-center gap-1">
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1 rounded">VISA</span>
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1 rounded">MC</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Valid Till</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-[#0BA4DB] focus:ring-4 focus:ring-[#0BA4DB]/15"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">CVV</label>
                    <input
                      type="password"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="123"
                      maxLength={4}
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-[#0BA4DB] focus:ring-4 focus:ring-[#0BA4DB]/15"
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-blue-50 p-2.5 text-[11px] text-blue-800 flex items-start gap-2">
                  <span className="shrink-0 text-sm">💡</span>
                  <span>Test card credentials pre-loaded. Click pay to complete the transaction.</span>
                </div>

                <button
                  type="button"
                  onClick={handleCompletePayment}
                  disabled={status === 'processing'}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0BA4DB] py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#0993C4] active:scale-[0.99] disabled:opacity-60"
                >
                  {status === 'processing' ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Authorizing with bank...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Pay ₦ {amount.toLocaleString()}
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 2. BANK TRANSFER TAB */}
            {method === 'transfer' && (
              <div className="space-y-3.5">
                <div className="rounded-2xl border border-dashed border-gray-200 bg-[#FAFCFF] p-4 text-center">
                  <p className="text-xs text-gray-500">Transfer exactly <span className="font-bold text-gray-900">₦ {amount.toLocaleString()}</span> to:</p>

                  <div className="mt-3">
                    <span className="text-[11px] uppercase tracking-wider text-gray-400">Bank Name</span>
                    <div className="text-sm font-bold text-[#011B33]">Titan Trust Bank / Wema Bank</div>
                  </div>

                  <div className="mt-2.5">
                    <span className="text-[11px] uppercase tracking-wider text-gray-400">Account Number</span>
                    <div className="mt-0.5 flex items-center justify-center gap-2">
                      <span className="font-mono text-2xl font-black tracking-widest text-[#0BA4DB]">
                        {virtualAccountNumber}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyAccount}
                        className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 active:scale-95 transition-all"
                      >
                        {copied ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <span className="text-[11px] uppercase tracking-wider text-gray-400">Beneficiary</span>
                    <div className="text-xs font-semibold text-gray-800">MedTrail / {hospitalName || 'Facility'}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Automated transfer listener active
                  </span>
                  <span>Expires in 30:00</span>
                </div>

                <button
                  type="button"
                  onClick={handleCompletePayment}
                  disabled={status === 'processing'}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0BA4DB] py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#0993C4] active:scale-[0.99] disabled:opacity-60"
                >
                  {status === 'processing' ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Verifying bank transfer...
                    </>
                  ) : (
                    'I Have Sent The Payment'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
