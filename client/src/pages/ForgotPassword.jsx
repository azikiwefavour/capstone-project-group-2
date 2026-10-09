import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import medicationImage from '../assets/medication-image.png'

function FieldError({ id, message }) {
  return (
    <p
      id={id}
      className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[#E5484D]"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <circle cx="7" cy="7" r="6" fill="currentColor" />
        <path
          d="M7 3.7V7.35"
          stroke="white"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="7" cy="10" r="0.7" fill="white" />
      </svg>
      {message}
    </p>
  )
}

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [continueClicked, setContinueClicked] = useState(false)
  const navigate = useNavigate()
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const emailError =
    continueClicked &&
    (email.trim() === ''
      ? 'This field is required.'
      : !isEmailValid
        ? 'Invalid email address.'
        : '')

  function handleContinue() {
    setContinueClicked(true)

    if (email.trim() !== '' && isEmailValid) {
      navigate('/verify-reset-code')
    }
  }

  return (
    <main className="flex min-h-screen w-full flex-col overflow-x-hidden bg-white lg:h-screen lg:min-h-0 lg:flex-row">
      <section className="relative flex min-h-[520px] w-full flex-col overflow-hidden bg-[#475AA2] px-8 pt-16 text-white sm:px-12 md:min-h-[660px] lg:h-full lg:min-h-0 lg:w-[48.35%] lg:px-16 lg:pt-10 [@media(min-height:850px)]:lg:pt-16">
        <h4 className="mt-10 max-w-[520px] text-2xl font-semibold leading-[1.13] tracking-normal text-[#111827] sm:text-2xl lg:text-3xl">
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
        <form className="w-full max-w-[440px]" aria-label="Reset password form">
          <div className="mb-5 text-center [@media(min-height:850px)]:lg:mb-9">
            <h2 className="text-xl font-semibold tracking-normal text-[#111827] sm:text-xl lg:text-2xl">
              Reset password
            </h2>
            <p className="mt-2 text-base text-[#7A8190] [@media(min-height:850px)]:lg:mt-3">
              Enter the email attached to your account
            </p>
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-[#111827] [@media(min-height:850px)]:lg:mb-2"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="e.g johndoe@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? 'reset-email-error' : undefined}
              className={`h-11 w-full rounded-xl border bg-white px-4 text-base text-[#111827] outline-none transition placeholder:text-[#A6ADBA] focus:ring-4 [@media(min-height:850px)]:lg:h-13 ${
                emailError
                  ? 'border-[#E5484D] focus:border-[#E5484D] focus:ring-[#E5484D]/15'
                  : 'border-[#D8DCE5] focus:border-[#475AA2] focus:ring-[#475AA2]/15'
              }`}
            />
            {emailError && (
              <FieldError id="reset-email-error" message={emailError} />
            )}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 [@media(min-height:850px)]:lg:mt-10">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="h-11 rounded-xl border border-[#D8DCE5] bg-[#F7F8FB] text-base font-semibold text-[#475AA2] transition hover:bg-[#EEF1F8] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15 [@media(min-height:850px)]:lg:h-13"
            >
              Go back
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="h-11 rounded-xl bg-[#475AA2] text-base font-semibold text-white transition hover:bg-[#3D4F91] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25 [@media(min-height:850px)]:lg:h-13"
            >
              Continue
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

export default ForgotPassword
