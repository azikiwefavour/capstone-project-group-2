import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import medicationImage from '../assets/medication-image.png'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')

function VerifyEmail({ frontendOnly = false, successPath = '/admin/dashboard' }) {
  const [codeValues, setCodeValues] = useState(['', '', '', '', '', ''])
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationError, setVerificationError] = useState('')
  const verificationInFlight = useRef(false)
  const codeInputRefs = useRef([])
  const navigate = useNavigate()
  const { state } = useLocation()
  const email = typeof state?.email === 'string' ? state.email.trim() : ''

  function handleCodeChange(index, value) {
    const digits = value.replace(/\D/g, '')
    if (digits.length > 1) {
      handleCodePaste(index, digits)
      return
    }

    const nextCodeValues = [...codeValues]
    nextCodeValues[index] = digits
    setCodeValues(nextCodeValues)

    if (digits && index < codeValues.length - 1) {
      codeInputRefs.current[index + 1]?.focus()
    }
  }

  function handleCodeKeyDown(index, event) {
    if (event.key === 'Backspace' && codeValues[index] === '' && index > 0) {
      codeInputRefs.current[index - 1]?.focus()
    }
  }

  function handleCodePaste(index, value) {
    const pastedDigits = value.replace(/\D/g, '').slice(0, codeValues.length)
    if (!pastedDigits) {
      return
    }

    const nextCodeValues = [...codeValues]
    pastedDigits.split('').forEach((digit, digitIndex) => {
      const nextIndex = index + digitIndex
      if (nextIndex < nextCodeValues.length) {
        nextCodeValues[nextIndex] = digit
      }
    })

    setCodeValues(nextCodeValues)

    const nextFocusIndex = Math.min(
      index + pastedDigits.length,
      codeValues.length - 1,
    )
    codeInputRefs.current[nextFocusIndex]?.focus()
  }

  async function handleContinue(event) {
    event.preventDefault()
    if (verificationInFlight.current) return

    setVerificationError('')

    const otp = codeValues.join('')
    if (!/^\d{6}$/.test(otp)) {
      setVerificationError('Please enter the complete 6-digit verification code.')
      return
    }

    if (frontendOnly) {
      // Temporary doctor-only bypass: replace with invitation verification when the backend is ready.
      navigate('/doctor/create-password', { state: { email } })
      return
    }

    if (!email) {
      setVerificationError('Your registration email is missing. Please go back and create your account.')
      return
    }

    verificationInFlight.current = true
    setIsVerifying(true)

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      })

      if (response.status !== 200) {
        const data = await response.json().catch(() => null)
        const message = Array.isArray(data?.message)
          ? data.message.filter((value) => typeof value === 'string').join(' ')
          : typeof data?.message === 'string' ? data.message : ''

        if (response.status === 400) {
          setVerificationError(message || 'The verification code is incorrect or expired. Please try again.')
        } else if (response.status === 404) {
          setVerificationError(message || 'No account found with this email. Please go back and create your account.')
        } else {
          setVerificationError('Email verification could not be completed. Please try again.')
        }
        return
      }

      navigate(successPath)
    } catch {
      setVerificationError('Unable to connect. Please check your connection and try again.')
    } finally {
      verificationInFlight.current = false
      setIsVerifying(false)
    }
  }

  return (
    <main className="flex min-h-screen w-full flex-col overflow-x-hidden bg-white lg:h-screen lg:min-h-0 lg:flex-row">
      <section className="relative flex min-h-[520px] w-full flex-col overflow-hidden bg-[#475AA2] px-8 pt-16 text-white sm:px-12 md:min-h-[660px] lg:h-full lg:min-h-0 lg:w-[48.35%] lg:px-16 lg:pt-10 [@media(min-height:850px)]:lg:pt-16">
     <h4 className=" mt-10 max-w-[520px] text-2xl font-semibold leading-[1.13] tracking-normal text-[#111827] sm:text-2xl lg:text-3xl">
          One medication record,
          <br />
          from prescription to
          <br />
          patient
        </h4>

        <div className="mt-auto flex min-h-0 flex-1 items-end justify-center pt-4 [@media(min-height:850px)]:lg:pt-8">
          <img
            src={medicationImage}
            alt="Medication records and pills"
            className="max-h-full w-full max-w-[600px] object-contain lg:max-w-[650px]"
          />
        </div>
      </section>

      <section className="flex w-full items-center justify-center bg-white px-6 py-12 sm:px-10 lg:h-full lg:min-h-0 lg:w-[51.65%] lg:rounded-l-[24px] lg:px-14 lg:py-6 [@media(min-height:850px)]:lg:py-10">
        <form className="w-full max-w-[440px]" aria-label="Verify email form" onSubmit={handleContinue} aria-busy={isVerifying}>
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-normal text-[#111827] sm:text-[2.5rem] lg:text-4xl [@media(min-height:850px)]:lg:text-[2.5rem]">
              Verify email
            </h2>
            <p className="mt-3 text-base text-[#7A8190]">
              Enter the code sent to
            </p>
            <p className="mt-2 text-base font-medium text-[#111827]">
              {email || 'your email address'}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-6 gap-2 sm:gap-3 [@media(min-height:850px)]:lg:mt-10">
            {codeValues.map((codeValue, index) => (
              <input
                key={index}
                ref={(element) => {
                  codeInputRefs.current[index] = element
                }}
                type="text"
                inputMode="numeric"
                maxLength="1"
                disabled={isVerifying}
                aria-label={`Verification code digit ${index + 1}`}
                aria-describedby={verificationError ? 'verification-error' : undefined}
                value={codeValue}
                onChange={(event) =>
                  handleCodeChange(index, event.target.value)
                }
                onKeyDown={(event) => handleCodeKeyDown(index, event)}
                onPaste={(event) => {
                  event.preventDefault()
                  handleCodePaste(index, event.clipboardData.getData('text'))
                }}
                className="aspect-square w-full rounded-xl border border-[#D8DCE5] bg-white text-center text-xl font-semibold text-[#111827] outline-none transition focus:border-[#475AA2] focus:ring-4 focus:ring-[#475AA2]/15"
              />
            ))}
          </div>

          {verificationError && (
            <p id="verification-error" role="alert" className="mt-3 text-sm font-medium text-[#E5484D]">
              {verificationError}
            </p>
          )}

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 [@media(min-height:850px)]:lg:mt-10">
            <button
              type="button"
              disabled={isVerifying}
              onClick={() => navigate(frontendOnly ? '/doctor/login' : '/create-account')}
              className="h-11 rounded-xl border border-[#D8DCE5] bg-[#F7F8FB] text-base font-semibold text-[#475AA2] transition hover:bg-[#EEF1F8] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15 [@media(min-height:850px)]:lg:h-13"
            >
              Go back
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="h-11 rounded-xl bg-[#475AA2] text-base font-semibold text-white transition hover:bg-[#3D4F91] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25 disabled:cursor-not-allowed disabled:opacity-60 [@media(min-height:850px)]:lg:h-13"
            >
              {isVerifying ? 'Verifying...' : 'Continue'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

export default VerifyEmail
