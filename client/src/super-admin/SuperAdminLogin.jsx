import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import MedTrailLogo from '../admin/components/MedTrailLogo'
import { authenticateSuperAdmin, getSuperAdminAccessToken } from './authentication'
import './superAdminLogin.css'

export default function SuperAdminLogin() {
  const navigate = useNavigate()
  const existingToken = getSuperAdminAccessToken()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const abortControllerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  if (existingToken && !isSuccess) {
    return <Navigate to="/super-admin/overview" replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (isLoading) return

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      setErrorMessage('Please enter your Super Admin email address.')
      return
    }
    if (!password) {
      setErrorMessage('Please enter your password.')
      return
    }

    setErrorMessage('')
    setIsLoading(true)

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      await authenticateSuperAdmin({
        email: trimmedEmail,
        password,
        signal: controller.signal,
      })

      setIsSuccess(true)
      navigate('/super-admin/overview', { replace: true })
    } catch (err) {
      if (err.name === 'AbortError') return
      setErrorMessage(err.message || 'Authentication failed. Please verify your credentials.')
      setIsLoading(false)
    }
  }

  function handleDemoCredentials() {
    setEmail('superadmin@medtrail.ng')
    setPassword('Password123!')
    setErrorMessage('')
  }

  return (
    <div className="super-admin-login-wrapper">
      <div className="super-admin-grid-pattern" aria-hidden="true" />
      <div className="super-admin-orb-1" aria-hidden="true" />
      <div className="super-admin-orb-2" aria-hidden="true" />

      <main className="super-admin-card" role="main">
        {/* Header Branding */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center justify-center scale-110">
            <MedTrailLogo />
          </div>

          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#475AA2]/40 bg-[#475AA2]/15 px-3 py-1 text-xs font-semibold tracking-wide text-[#94A4EA]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            SUPER ADMIN GATEWAY
          </div>

          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Platform Administration
          </h1>
          <p className="mt-1.5 text-xs text-[#9CA3AF] sm:text-sm">
            Authenticate to manage platform infrastructure, facilities, and subscriptions.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="super-admin-error-shake mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs leading-5 text-red-200"
          >
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
            <span className="flex-1 font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Email field */}
          <div>
            <label
              htmlFor="super-admin-email"
              className="mb-1.5 block text-xs font-medium text-[#D1D5DB]"
            >
              Email Address
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#9CA3AF]">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </span>
              <input
                id="super-admin-email"
                type="email"
                name="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={e => {
                  setEmail(e.target.value)
                  if (errorMessage) setErrorMessage('')
                }}
                placeholder="superadmin@medtrail.ng"
                className="super-admin-input"
                disabled={isLoading || isSuccess}
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label
              htmlFor="super-admin-password"
              className="mb-1.5 block text-xs font-medium text-[#D1D5DB]"
            >
              Master Password
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#9CA3AF]">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="super-admin-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => {
                  setPassword(e.target.value)
                  if (errorMessage) setErrorMessage('')
                }}
                placeholder="••••••••••••"
                className="super-admin-input pr-10"
                disabled={isLoading || isSuccess}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#9CA3AF] hover:text-white focus:outline-none"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" x2="22" y1="2" y2="22" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Quick Credential Pre-fill Badge */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-[#9CA3AF]">Default credentials:</span>
            <button
              type="button"
              onClick={handleDemoCredentials}
              className="text-[#94A4EA] hover:text-[#C5CEF8] hover:underline transition-colors focus:outline-none"
            >
              Fill Credentials
            </button>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className="super-admin-button"
            >
              {isLoading ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Verifying Session...</span>
                </>
              ) : isSuccess ? (
                <>
                  <svg
                    className="h-4 w-4 text-emerald-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Access Authorized</span>
                </>
              ) : (
                <>
                  <span>Sign In to Super Admin</span>
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security Footer */}
        <div className="mt-8 border-t border-white/5 pt-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#6B7280]">
            <svg
              className="h-3.5 w-3.5 text-[#475AA2]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Secured Hardware-Isolated Session • 256-Bit SSL Protection</span>
          </div>
        </div>
      </main>
    </div>
  )
}
