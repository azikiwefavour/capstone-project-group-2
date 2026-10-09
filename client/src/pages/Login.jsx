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

function PasswordEyeIcon({ isVisible }) {
  if (isVisible) {
    return (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M2 12C3.6 8.15 7 4.86 12 4.86C17 4.86 20.4 8.15 22 12C20.4 15.85 17 19.14 12 19.14C7 19.14 3.6 15.85 2 12Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )
  }

  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 4L20 20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10.6 10.6C10.22 10.98 10 11.47 10 12C10 13.1 10.9 14 12 14C12.53 14 13.02 13.78 13.4 13.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.4 5.4C9.5 5.05 10.7 4.86 12 4.86C17 4.86 20.4 8.15 22 12C21.4 13.42 20.54 14.65 19.48 15.65"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.1 18.05C14.87 18.74 13.5 19.14 12 19.14C7 19.14 3.6 15.85 2 12C2.76 10.18 3.94 8.66 5.43 7.52"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
  const passwordError =
    continueClicked && password.trim() === '' ? 'This field is required.' : ''

  const inputClassName = (hasError) =>
    `h-11 w-full rounded-xl border bg-white px-4 text-base text-[#111827] outline-none transition placeholder:text-[#A6ADBA] focus:ring-4 [@media(min-height:850px)]:lg:h-13 ${
      hasError
        ? 'border-[#E5484D] focus:border-[#E5484D] focus:ring-[#E5484D]/15'
        : 'border-[#D8DCE5] focus:border-[#475AA2] focus:ring-[#475AA2]/15'
    }`

  function handleContinue() {
    setContinueClicked(true)
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
        <form className="w-full max-w-[440px]" aria-label="Login form">
          <div className="mb-5 [@media(min-height:850px)]:lg:mb-9">
            <h2 className="text-3xl font-semibold tracking-normal text-[#111827] sm:text-[2.5rem] lg:text-4xl [@media(min-height:850px)]:lg:text-[2.5rem]">
              Welcome back
            </h2>
            <p className="mt-2 text-base text-[#7A8190] [@media(min-height:850px)]:lg:mt-3">
              Enter your email and password
            </p>
          </div>

          <div className="space-y-3 [@media(min-height:850px)]:lg:space-y-5">
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
                aria-describedby={emailError ? 'login-email-error' : undefined}
                className={inputClassName(Boolean(emailError))}
              />
              {emailError && (
                <FieldError id="login-email-error" message={emailError} />
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-[#111827] [@media(min-height:850px)]:lg:mb-2"
              >
                Password
              </label>
              <div
                className={`flex h-11 w-full items-center rounded-xl border bg-white transition focus-within:ring-4 [@media(min-height:850px)]:lg:h-13 ${
                  passwordError
                    ? 'border-[#E5484D] focus-within:border-[#E5484D] focus-within:ring-[#E5484D]/15'
                    : 'border-[#D8DCE5] focus-within:border-[#475AA2] focus-within:ring-[#475AA2]/15'
                }`}
              >
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={
                    passwordError ? 'login-password-error' : undefined
                  }
                  className="min-w-0 flex-1 bg-transparent px-4 text-base text-[#111827] outline-none placeholder:text-[#111827]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((currentValue) => !currentValue)}
                  className="flex h-full items-center px-4 text-[#475AA2] outline-none transition hover:text-[#364782] focus-visible:ring-4 focus-visible:ring-[#475AA2]/20"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <PasswordEyeIcon isVisible={showPassword} />
                </button>
              </div>
              {passwordError && (
                <FieldError id="login-password-error" message={passwordError} />
              )}
            </div>
          </div>

          <div className="mt-3 text-left [@media(min-height:850px)]:lg:mt-4">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-sm font-semibold text-[#475AA2] transition hover:text-[#364782] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/20"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            className="mt-5 h-11 w-full rounded-xl bg-[#475AA2] text-base font-semibold text-white transition hover:bg-[#3D4F91] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25 [@media(min-height:850px)]:lg:mt-8 [@media(min-height:850px)]:lg:h-13"
          >
            Continue
          </button>

          <p className="mt-4 text-center text-sm text-[#7A8190] [@media(min-height:850px)]:lg:mt-6">
            Don&rsquo;t have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/create-account')}
              className="font-semibold text-[#475AA2] transition hover:text-[#364782] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/20"
            >
              Create one
            </button>
          </p>
        </form>
      </section>
    </main>
  )
}

export default Login
