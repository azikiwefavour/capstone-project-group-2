import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { startDoctorPreviewSession } from '../previewAuth'
import MedTrailLogo from '../../admin/components/MedTrailLogo'
import medicationImage from '../../assets/medication-image.png'

function PasswordEyeIcon({ isVisible }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {isVisible ? (
        <>
          <path d="M2 12C3.6 8.15 7 4.86 12 4.86C17 4.86 20.4 8.15 22 12C20.4 15.85 17 19.14 12 19.14C7 19.14 3.6 15.85 2 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
        </>
      ) : (
        <>
          <path d="M4 4L20 20M10.6 10.6C10.22 10.98 10 11.47 10 12C10 13.1 10.9 14 12 14C12.53 14 13.02 13.78 13.4 13.4M8.4 5.4C9.5 5.05 10.7 4.86 12 4.86C17 4.86 20.4 8.15 22 12C21.4 13.42 20.54 14.65 19.48 15.65M16.1 18.05C14.87 18.74 13.5 19.14 12 19.14C7 19.14 3.6 15.85 2 12C2.76 10.18 3.94 8.66 5.43 7.52" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  )
}

function PasswordField({ id, label, value, onChange, onBlur, isVisible, onToggleVisibility, error }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-[#111827] [@media(min-height:850px)]:lg:mb-2">
        {label}
      </label>
      <div className={`flex h-11 w-full items-center rounded-xl border bg-white transition focus-within:ring-4 [@media(min-height:850px)]:lg:h-13 ${error ? 'border-[#E5484D] focus-within:border-[#E5484D] focus-within:ring-[#E5484D]/15' : 'border-[#D8DCE5] focus-within:border-[#475AA2] focus-within:ring-[#475AA2]/15'}`}>
        <input
          id={id}
          name={id}
          type={isVisible ? 'text' : 'password'}
          autoComplete="new-password"
          required
          placeholder="Enter password..."
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="min-w-0 flex-1 bg-transparent px-4 text-base text-[#111827] outline-none placeholder:text-[#A6ADBA]"
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          aria-label={`${isVisible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          aria-pressed={isVisible}
          className="flex h-full items-center rounded-r-xl px-4 text-[#475AA2] outline-none transition hover:text-[#364782] focus-visible:ring-4 focus-visible:ring-[#475AA2]/20"
        >
          <PasswordEyeIcon isVisible={isVisible} />
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[#E5484D]">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="shrink-0">
            <circle cx="7" cy="7" r="6" fill="currentColor" />
            <path d="M7 3.7V7.35" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="7" cy="10" r="0.7" fill="white" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

function DoctorCreatePassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [touchedFields, setTouchedFields] = useState({})
  const [submitClicked, setSubmitClicked] = useState(false)
  const navigate = useNavigate()

  const passwordRequirements = [
    { label: 'At least 1 uppercase letter', isMet: /[A-Z]/.test(password) },
    { label: 'At least 1 number', isMet: /\d/.test(password) },
    { label: 'At least 1 special character', isMet: /[^A-Za-z0-9]/.test(password) },
    { label: 'At least 8 characters', isMet: password.length >= 8 },
  ]
  const passwordStrength = passwordRequirements.filter((requirement) => requirement.isMet).length
  const isPasswordValid = passwordStrength === passwordRequirements.length
  const passwordError = (submitClicked || touchedFields.password)
    ? password.trim() === ''
      ? 'This field is required.'
      : !isPasswordValid ? 'Password does not meet requirements.' : ''
    : ''
  const confirmPasswordError = (submitClicked || touchedFields.confirmPassword)
    ? confirmPassword.trim() === ''
      ? 'This field is required.'
      : confirmPassword !== password ? 'Passwords do not match.' : ''
    : ''

  function markTouched(field) {
    setTouchedFields((current) => ({ ...current, [field]: true }))
  }

  function handleContinue(event) {
    event.preventDefault()
    setSubmitClicked(true)
    if (password.trim() === '' || !isPasswordValid || confirmPassword.trim() === '' || password !== confirmPassword) return
    startDoctorPreviewSession()
    setPassword('')
    setConfirmPassword('')
    navigate('/doctor/dashboard', { replace: true })
  }

  return (
    <main className="flex min-h-screen w-full flex-col bg-[#475AA2] lg:h-screen lg:min-h-0 lg:flex-row">
      <section className="relative flex min-h-[460px] w-full flex-col bg-[#475AA2] px-8 pt-8 text-white sm:px-12 md:min-h-[580px] lg:h-full lg:min-h-0 lg:w-[48.35%] lg:px-16 lg:pt-10 [@media(min-height:850px)]:lg:pt-12">
        <div className="w-[134px] shrink-0">
          <MedTrailLogo />
        </div>
        <h2 className="mt-10 max-w-[520px] shrink-0 text-2xl font-semibold leading-[1.13] tracking-normal text-[#111827] lg:text-3xl [@media(min-height:850px)]:lg:mt-14">
          One medication record,
          <br />
          from prescription to
          <br />
          patient
        </h2>
        <div className="mt-auto flex min-h-0 flex-1 items-end justify-center pt-4 [@media(min-height:850px)]:lg:pt-8">
          <img src={medicationImage} alt="Medication records and pills" className="max-h-full w-full max-w-[600px] object-contain lg:max-w-[650px]" />
        </div>
      </section>

      <section className="flex w-full items-center justify-center rounded-t-[24px] bg-white px-6 py-12 sm:px-10 lg:h-full lg:min-h-0 lg:w-[51.65%] lg:overflow-y-auto lg:rounded-l-[24px] lg:rounded-tr-none lg:px-14 lg:py-6 [@media(min-height:850px)]:lg:py-10">
        <form onSubmit={handleContinue} noValidate aria-label="Doctor create password form" className="w-full max-w-[440px]">
          <div className="mb-6 [@media(min-height:900px)]:lg:mb-8">
            <h1 className="text-3xl font-semibold tracking-normal text-[#111827]">
              Welcome to MedTrail
            </h1>
            <p className="mt-2 text-base text-[#7A8190]">Create your password</p>
          </div>

          <PasswordField
            id="doctor-password"
            label="Password"
            value={password}
            onChange={setPassword}
            onBlur={() => markTouched('password')}
            isVisible={showPassword}
            onToggleVisibility={() => setShowPassword((current) => !current)}
            error={passwordError}
          />

          <div className="mt-3">
            <div className="grid grid-cols-3 gap-2" aria-label="Password strength">
              {[1, 2, 3].map((segment) => (
                <span key={segment} className={`h-1.5 rounded-full transition ${passwordStrength >= segment + 1 ? 'bg-[#2F9E44]' : passwordStrength >= segment ? 'bg-[#F2C94C]' : 'bg-[#E5E8EF]'}`} />
              ))}
            </div>
            <p className="mt-3 text-xs font-medium text-[#7A8190]">Must contain at least:</p>
            <ul className="mt-2 grid gap-1.5">
              {passwordRequirements.map((requirement) => (
                <li key={requirement.label} className={`flex items-center gap-2 text-xs ${requirement.isMet ? 'text-[#2F9E44]' : 'text-[#7A8190]'}`}>
                  <span aria-hidden="true" className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${requirement.isMet ? 'bg-[#2F9E44] text-white' : 'bg-[#D9DEE8]'}`}>
                    {requirement.isMet && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5.1L4.1 7.2L8 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  {requirement.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5">
            <PasswordField
              id="doctor-confirm-password"
              label="Confirm Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              onBlur={() => markTouched('confirmPassword')}
              isVisible={showConfirmPassword}
              onToggleVisibility={() => setShowConfirmPassword((current) => !current)}
              error={confirmPasswordError}
            />
          </div>

          <button type="submit" className="mt-6 h-11 w-full rounded-xl bg-[#475AA2] text-base font-semibold text-white transition hover:bg-[#3D4F91] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25 [@media(min-height:850px)]:lg:h-13">
            Continue
          </button>
          <p className="mt-4 text-center text-sm text-[#7A8190]">
            Already have an account?{' '}
            <Link to="/doctor/login" className="font-semibold text-[#475AA2] transition hover:text-[#364782] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/20">Log in</Link>
          </p>
        </form>
      </section>
    </main>
  )
}

export default DoctorCreatePassword
