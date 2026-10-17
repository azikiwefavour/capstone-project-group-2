import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { completeInvitation } from '../auth/invitations'
import useInvitation from '../auth/useInvitation'
import medicationImage from '../assets/medication-image.png'

function EyeIcon({ isVisible }) {
  if (isVisible) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function CheckmarkIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-2.5 w-2.5">
      <path fillRule="evenodd" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" clipRule="evenodd" />
    </svg>
  )
}

function InvitationForm() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const errorParam = searchParams.get('error')

  const { isValidating, validationError, userData } = useInvitation(token, errorParam)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [successRole, setSuccessRole] = useState(null)
  const submissionInFlight = useRef(false)
  const submitController = useRef(null)

  // Validation rules
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)
  const hasMinLength = password.length >= 8

  const passedCriteria = [hasUpper, hasNumber, hasSpecial, hasMinLength].filter(Boolean).length
  const isPasswordValid = passedCriteria === 4
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword
  const canSubmit = Boolean(userData && !isValidating && !validationError && isPasswordValid && passwordsMatch && !isSubmitting && !isSuccess)

  useEffect(() => {
    return () => submitController.current?.abort()
  }, [])

  useEffect(() => {
    if (!isSuccess) return
    const timer = window.setTimeout(() => {
      if (successRole === 'doctor') navigate('/doctor/dashboard', { replace: true })
      else navigate('/login', { replace: true, state: { selectedRole: 'Pharmacist' } })
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [isSuccess, successRole, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    if (submissionInFlight.current || isSuccess) return
    setSubmitError('')

    if (!userData || isValidating || validationError) {
      setSubmitError(validationError || 'Please wait for your invitation to be verified.')
      return
    }

    if (!isPasswordValid) {
      setSubmitError('Please ensure your password meets all requirements.')
      return
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match. Please verify your confirm password.')
      return
    }

    submissionInFlight.current = true
    const controller = new AbortController()
    submitController.current = controller
    setIsSubmitting(true)

    try {
      const result = await completeInvitation({ token, password, confirmPassword, invitation: userData, signal: controller.signal })
      if (!result || controller.signal.aborted) return
      setPassword('')
      setConfirmPassword('')
      setSuccessRole(result.role)
      setIsSuccess(true)
    } catch (error) {
      if (controller.signal.aborted) return
      submissionInFlight.current = false
      setSubmitError(error.message || 'Unable to complete registration. Please try again.')
      setIsSubmitting(false)
    }
  }

  // Format title like Figma design
  const rawName = userData?.name || 'User'
  const cleanName = rawName.replace(/^(dr\.?|pharm\.?)\s+/i, '')
  const roleLower = (userData?.role || 'doctor').toLowerCase()
  const prefix = roleLower === 'doctor' ? 'Dr.' : roleLower === 'pharmacist' ? 'Pharm.' : ''
  const displayName = prefix ? `${prefix} ${cleanName}` : cleanName
  const roleDisplay = roleLower.charAt(0).toUpperCase() + roleLower.slice(1)

  return (
    <main className="flex min-h-screen w-full flex-col overflow-x-hidden bg-white lg:h-screen lg:min-h-0 lg:flex-row">
      {/* Left side brand banner */}
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

      {/* Right side form */}
      <section className="flex w-full items-center justify-center bg-white px-6 py-12 sm:px-10 lg:h-full lg:min-h-0 lg:w-[51.65%] lg:px-14">
        <div className="w-full max-w-[440px]">
          {isValidating ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#475AA2]/20 border-t-[#475AA2]" />
              <p className="mt-4 text-base font-medium text-[#7A8190]">
                Verifying your invitation link...
              </p>
            </div>
          ) : validationError ? (
            <div className="rounded-2xl border border-[#F8B4B4] bg-[#FDF2F2] p-8 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-[#E5484D]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-bold text-[#111827]">Invitation Link Issue</h2>
              <p className="mt-2 text-sm text-[#52556C]">{validationError}</p>
              <div className="mt-6 flex flex-col gap-3">
                <Link
                  to={userData?.role === 'pharmacist' ? '/login' : '/doctor/login'}
                  state={userData?.role === 'pharmacist' ? { selectedRole: 'Pharmacist' } : undefined}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[#475AA2] px-6 text-sm font-semibold text-white transition hover:bg-[#3D4F91]"
                >
                  Return to Login
                </Link>
              </div>
            </div>
          ) : isSuccess ? (
            <div className="py-8 text-center animate-fade-in">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F5E9] text-[#2F9E44]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-8 w-8">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="mt-4 text-2xl font-bold text-[#111827]">Account Activated!</h2>
              <p className="mt-2 text-base text-[#7A8190]">
                Welcome aboard, <strong>{displayName}</strong>.<br />
                {successRole === 'doctor' ? 'Taking you to your dashboard...' : 'Taking you to login. Your pharmacist workspace is not available yet.'}
              </p>
              <div className="mt-6 flex justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#475AA2]/20 border-t-[#475AA2]" />
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-6 text-center">
                <h2 className="text-3xl font-semibold tracking-tight text-[#111827]">
                  Welcome {displayName}
                </h2>
                <p className="mt-2 text-base text-[#7A8190]">
                  Create your password to complete registration
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#DEE2FF] px-3 py-1 text-xs font-semibold text-[#475AA2]">
                  {roleDisplay} Account • {userData?.email}
                </div>
              </div>

              {submitError && (
                <div role="alert" className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-[#E5484D]">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 shrink-0">
                    <path fillRule="evenodd" d="M8 15A7 7 0 108 1a7 7 0 000 14zm.75-10.25a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5zm-.75 7.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                  </svg>
                  <span>{submitError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* Password field */}
                <div className="mb-4">
                  <label htmlFor="invite-password" className="mb-1.5 block text-sm font-medium text-[#111827]">
                    Password
                  </label>
                  <div className="relative flex h-11 w-full items-center rounded-xl border border-[#D8DCE5] bg-white transition focus-within:border-[#475AA2] focus-within:ring-4 focus-within:ring-[#475AA2]/15">
                    <input
                      id="invite-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      className="min-w-0 flex-1 bg-transparent px-4 text-base text-[#111827] outline-none placeholder:text-[#A6ADBA]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="flex h-full items-center px-4 text-[#475AA2] outline-none transition hover:text-[#364782]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <EyeIcon isVisible={showPassword} />
                    </button>
                  </div>

                  {/* Strength meter bars */}
                  <div className="mt-2.5 grid grid-cols-3 gap-2">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        passedCriteria >= 1
                          ? passedCriteria >= 3
                            ? 'bg-[#2F9E44]'
                            : 'bg-[#F59E0B]'
                          : 'bg-[#E5E8EF]'
                      }`}
                    />
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        passedCriteria >= 3
                          ? passedCriteria === 4
                            ? 'bg-[#2F9E44]'
                            : 'bg-[#F59E0B]'
                          : 'bg-[#E5E8EF]'
                      }`}
                    />
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        passedCriteria === 4 ? 'bg-[#2F9E44]' : 'bg-[#E5E8EF]'
                      }`}
                    />
                  </div>

                  {/* Requirements checklist */}
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-medium text-[#7A8190]">Must contain at least:</p>
                    <ul className="space-y-1 text-xs">
                      <li className={`flex items-center gap-2 transition-colors ${hasUpper ? 'font-medium text-[#2F9E44]' : 'text-[#7A8190]'}`}>
                        <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-white ${hasUpper ? 'bg-[#2F9E44]' : 'bg-[#D9DEE8]'}`}>
                          <CheckmarkIcon />
                        </span>
                        At least 1 uppercase letter
                      </li>
                      <li className={`flex items-center gap-2 transition-colors ${hasNumber ? 'font-medium text-[#2F9E44]' : 'text-[#7A8190]'}`}>
                        <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-white ${hasNumber ? 'bg-[#2F9E44]' : 'bg-[#D9DEE8]'}`}>
                          <CheckmarkIcon />
                        </span>
                        At least 1 number
                      </li>
                      <li className={`flex items-center gap-2 transition-colors ${hasSpecial ? 'font-medium text-[#2F9E44]' : 'text-[#7A8190]'}`}>
                        <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-white ${hasSpecial ? 'bg-[#2F9E44]' : 'bg-[#D9DEE8]'}`}>
                          <CheckmarkIcon />
                        </span>
                        At least 1 special character
                      </li>
                      <li className={`flex items-center gap-2 transition-colors ${hasMinLength ? 'font-medium text-[#2F9E44]' : 'text-[#7A8190]'}`}>
                        <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-white ${hasMinLength ? 'bg-[#2F9E44]' : 'bg-[#D9DEE8]'}`}>
                          <CheckmarkIcon />
                        </span>
                        At least 8 characters
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Confirm password field */}
                <div className="mb-6">
                  <label htmlFor="invite-confirm" className="mb-1.5 block text-sm font-medium text-[#111827]">
                    Confirm password
                  </label>
                  <div
                    className={`relative flex h-11 w-full items-center rounded-xl border bg-white transition focus-within:ring-4 ${
                      confirmPassword && !passwordsMatch
                        ? 'border-[#E5484D] focus-within:border-[#E5484D] focus-within:ring-[#E5484D]/15'
                        : 'border-[#D8DCE5] focus-within:border-[#475AA2] focus-within:ring-[#475AA2]/15'
                    }`}
                  >
                    <input
                      id="invite-confirm"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      className="min-w-0 flex-1 bg-transparent px-4 text-base text-[#111827] outline-none placeholder:text-[#A6ADBA]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="flex h-full items-center px-4 text-[#475AA2] outline-none transition hover:text-[#364782]"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      <EyeIcon isVisible={showConfirmPassword} />
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="mt-1 text-xs text-[#E5484D]">Passwords do not match.</p>
                  )}
                </div>

                {/* Continue button */}
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="h-11 w-full rounded-xl bg-[#475AA2] text-base font-semibold text-white transition hover:bg-[#3D4F91] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Activating account...' : 'Continue'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-[#7A8190]">
                Already completed registration?{' '}
                <Link to="/login" className="font-semibold text-[#475AA2] transition hover:text-[#364782]">
                  Log in
                </Link>
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default function AcceptInvite() {
  const [searchParams] = useSearchParams()
  // Query changes discard credentials and cancel work for the previous invitation.
  return <InvitationForm key={searchParams.toString()} />
}
