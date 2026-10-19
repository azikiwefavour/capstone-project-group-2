import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { setAccessToken } from '../auth/session'
import { isValidPreviewPassword, startDoctorPreviewSession } from '../doctor/previewAuth'
import medicationImage from '../assets/medication-image.png'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const backendRoles = { Admin: 'admin', Doctor: 'doctor', Pharmacist: 'pharmacist', Patient: 'patient' }

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

function Login({ authenticationRole, recoveryBasePath = '', frontendOnly = false, onAuthenticate, successPath = '/doctor/dashboard', invitationOnly = false }) {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [continueClicked, setContinueClicked] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loginNotice, setLoginNotice] = useState('')
  const loginInFlight = useRef(false)
  const loginController = useRef(null)
  useEffect(() => () => loginController.current?.abort(), [])
  const location = useLocation()
  const navigate = useNavigate()
  const selectedRole = authenticationRole || location.state?.selectedRole
  const role = Object.hasOwn(backendRoles, selectedRole) ? backendRoles[selectedRole] : null
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const emailError =
    continueClicked &&
    (email.trim() === ''
      ? 'This field is required.'
      : !isEmailValid
        ? 'Invalid email address.'
        : '')
  const passwordError = continueClicked
    ? password.trim() === ''
      ? 'This field is required.'
      : frontendOnly && !isValidPreviewPassword(password)
        ? 'Use at least 8 characters, an uppercase letter, a number, and a special character.'
        : ''
    : ''

  const inputClassName = (hasError) =>
    `h-11 w-full rounded-xl border bg-white px-4 text-base text-[#111827] outline-none transition placeholder:text-[#A6ADBA] focus:ring-4 [@media(min-height:850px)]:lg:h-13 ${
      hasError
        ? 'border-[#E5484D] focus:border-[#E5484D] focus:ring-[#E5484D]/15'
        : 'border-[#D8DCE5] focus:border-[#475AA2] focus:ring-[#475AA2]/15'
    }`

  async function handleContinue(event) {
    event.preventDefault()
    if (loginInFlight.current) return

    setContinueClicked(true)
    setLoginError('')
    setLoginNotice('')

    if (email.trim() === '' || !isEmailValid || password.trim() === '') return
    if (!role) {
      setLoginError('Please select your role before logging in.')
      return
    }

    // Role-specific authentication is isolated from the existing Admin session.
    if (onAuthenticate) {
      loginInFlight.current = true
      const controller = new AbortController()
      loginController.current = controller
      setIsLoggingIn(true)
      try {
        await onAuthenticate({ email: email.trim().toLowerCase(), password, signal: controller.signal })
        if (controller.signal.aborted) return
        setPassword('')
        setContinueClicked(false)
        navigate(successPath, { replace: true })
      } catch (error) {
        if (!controller.signal.aborted) setLoginError(error.message || 'Login could not be completed. Please try again.')
      } finally {
        loginInFlight.current = false
        setIsLoggingIn(false)
      }
      return
    }

    if (frontendOnly) {
      if (role !== 'doctor' || !isValidPreviewPassword(password)) return
      startDoctorPreviewSession()
      setPassword('')
      navigate('/doctor/dashboard', { replace: true })
      return
    }

    loginInFlight.current = true
    setIsLoggingIn(true)
    setAccessToken(null)

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, role }),
      })
      const data = await response.json().catch(() => null)

      if (response.status !== 200) {
        const message = Array.isArray(data?.message)
          ? data.message.filter((value) => typeof value === 'string').join(' ')
          : typeof data?.message === 'string' ? data.message : ''
        if (response.status === 401) {
          setLoginError(message || 'Invalid email or password. Please check your details and verify your email.')
        } else if (response.status === 400) {
          setLoginError(message || 'Please check your email, password, and selected role.')
        } else {
          setLoginError('Login could not be completed. Please try again.')
        }
        return
      }

      if (typeof data?.accessToken !== 'string' || !data.accessToken.trim() ||
        !Object.values(backendRoles).includes(data?.user?.role)) {
        setLoginError('Login returned an unexpected response. Please try again.')
        return
      }

      if (authenticationRole && data.user.role !== role) {
        setLoginError('This account cannot access the doctor workspace.')
        return
      }

      setAccessToken(data.accessToken, data.user.role)
      setPassword('')
      setContinueClicked(false)
      if (data.user.role === 'admin') {
        sessionStorage.setItem('medtrailDemoAdminName', typeof data.user.name === 'string' ? data.user.name : '')
        navigate('/admin/dashboard', { replace: true })
      } else if (data.user.role === 'doctor') {
        navigate('/doctor/dashboard', { replace: true })
      } else {
        setLoginNotice('Login successful. The dashboard for your role is not available yet.')
      }
    } catch {
      setAccessToken(null)
      setLoginError('Unable to connect. Please check your connection and try again.')
    } finally {
      loginInFlight.current = false
      setIsLoggingIn(false)
    }
  }

  if (!frontendOnly && role === 'doctor' && !onAuthenticate) {
    return <Navigate to="/doctor/login" replace />
  }
  if (role === 'pharmacist' && !onAuthenticate) {
    return <Navigate to="/pharmacist/login" replace />
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
        <form className="w-full max-w-[440px]" aria-label="Login form" onSubmit={handleContinue} noValidate aria-busy={isLoggingIn}>
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
              onClick={() => navigate(`${recoveryBasePath}/forgot-password`)}
              className="text-sm font-semibold text-[#475AA2] transition hover:text-[#364782] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/20"
            >
              Forgot password?
            </button>
          </div>

          {loginError && (
            <div role="alert" className="mt-3">
              <FieldError id="login-error" message={loginError} />
              {invitationOnly && isEmailValid && <button type="button" onClick={() => navigate(`${recoveryBasePath}/verify-email`, { state: { email: email.trim().toLowerCase() } })} className="mt-2 text-sm font-semibold text-[#475AA2] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/20">Need to verify your email?</button>}
              {!role && (
                <button type="button" onClick={() => navigate('/select-role')} className="mt-2 text-sm font-semibold text-[#475AA2] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/20">
                  Select role
                </button>
              )}
            </div>
          )}
          {loginNotice && (
            <p role="status" className="mt-3 text-sm font-medium text-[#2F7D59]">{loginNotice}</p>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="mt-5 h-11 w-full rounded-xl bg-[#475AA2] text-base font-semibold text-white transition hover:bg-[#3D4F91] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25 disabled:cursor-not-allowed disabled:opacity-60 [@media(min-height:850px)]:lg:mt-8 [@media(min-height:850px)]:lg:h-13"
          >
            {isLoggingIn ? 'Logging in...' : 'Continue'}
          </button>

          <p className="mt-4 text-center text-sm text-[#7A8190] [@media(min-height:850px)]:lg:mt-6">
            {invitationOnly ? 'Invited to MedTrail? Use the invitation link in your email to create your account.' : (
              <>
                Don&rsquo;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate(authenticationRole === 'Doctor' ? '/doctor/create-password' : '/create-account')}
                  className="font-semibold text-[#475AA2] transition hover:text-[#364782] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/20"
                >
                  Create one
                </button>
              </>
            )}
          </p>
        </form>
      </section>
    </main>
  )
}

export default Login
