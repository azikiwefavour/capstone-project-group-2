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

function RequirementIcon({ isMet }) {
  if (isMet) {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#2F9E44] text-white">
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2 5.1L4.1 7.2L8 3"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    )
  }

  return <span className="h-4 w-4 shrink-0 rounded-full bg-[#D9DEE8]" />
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

function CreateAccount() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [hospitalName, setHospitalName] = useState('')
  const [yourName, setYourName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [touchedFields, setTouchedFields] = useState({})
  const [continueClicked, setContinueClicked] = useState(false)
  const navigate = useNavigate()

  const shouldShowError = (fieldName) =>
    continueClicked || Boolean(touchedFields[fieldName])

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const emailError =
    shouldShowError('email') &&
    (email.trim() === ''
      ? 'This field is required'
      : !isEmailValid
        ? 'Invalid email address'
        : '')
  const hospitalNameError =
    shouldShowError('hospitalName') && hospitalName.trim() === ''
      ? 'This field is required'
      : ''
  const yourNameError =
    shouldShowError('yourName') && yourName.trim() === ''
      ? 'This field is required'
      : ''
  const phoneDigits = phone.replace(/\D/g, '')
  const isPhoneValid =
    /^[789]\d{9}$/.test(phoneDigits) || /^0[789]\d{9}$/.test(phoneDigits)
  const phoneError =
    shouldShowError('phone') &&
    (phone.trim() === ''
      ? 'This field is required'
      : !isPhoneValid
        ? 'Invalid phone number'
        : '')
  const passwordRequirements = [
    {
      label: 'At least 1 uppercase letter',
      isMet: /[A-Z]/.test(password),
    },
    {
      label: 'At least 1 number',
      isMet: /\d/.test(password),
    },
    {
      label: 'At least 1 special character',
      isMet: /[^A-Za-z0-9]/.test(password),
    },
    {
      label: 'At least 8 characters',
      isMet: password.length >= 8,
    },
  ]
  const passwordStrength = passwordRequirements.filter(
    (requirement) => requirement.isMet,
  ).length
  const isPasswordValid = passwordStrength === passwordRequirements.length
  const passwordError =
    shouldShowError('password') &&
    (password.trim() === ''
      ? 'This field is required'
      : !isPasswordValid
        ? 'Password does not meet requirements'
        : '')

  const inputClassName = (hasError) =>
    `h-11 w-full rounded-xl border bg-white px-4 text-base text-[#111827] outline-none transition placeholder:text-[#A6ADBA] focus:ring-4 [@media(max-height:820px)]:lg:h-10 [@media(min-height:900px)]:lg:h-12 ${
      hasError
        ? 'border-[#E5484D] focus:border-[#E5484D] focus:ring-[#E5484D]/15'
        : 'border-[#D8DCE5] focus:border-[#475AA2] focus:ring-[#475AA2]/15'
    }`

  const fieldWrapperClassName = (hasError) => (hasError ? 'pb-1' : '')

  function markFieldAsTouched(fieldName) {
    setTouchedFields((currentFields) => ({
      ...currentFields,
      [fieldName]: true,
    }))
  }

  function handleContinue() {
    setContinueClicked(true)

    const allFieldsValid =
      email.trim() !== '' &&
      isEmailValid &&
      hospitalName.trim() !== '' &&
      yourName.trim() !== '' &&
      phone.trim() !== '' &&
      isPhoneValid &&
      password.trim() !== '' &&
      isPasswordValid

    if (allFieldsValid) {
      navigate('/verify-email')
    }
  }

  return (
    <main className="flex min-h-screen w-full flex-col overflow-x-hidden bg-white lg:h-screen lg:min-h-0 lg:flex-row">
      <section className="relative flex min-h-[520px] w-full flex-col overflow-hidden bg-[#475AA2] px-8 pt-16 text-white sm:px-12 md:min-h-[660px] lg:h-full lg:min-h-0 lg:w-[48.35%] lg:px-16 lg:pt-10 [@media(min-height:850px)]:lg:pt-16">
       <h4 className="mt 10 max-w-[520px] text-2xl font-semibold leading-[1.13] tracking-normal text-[#111827] sm:text-2xl lg:text-3xl">
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

      <section className="flex w-full items-start justify-center overflow-y-visible bg-white px-6 py-12 sm:px-10 lg:h-full lg:min-h-0 lg:w-[51.65%] lg:overflow-y-auto lg:rounded-l-[24px] lg:px-14 lg:py-4 [@media(min-height:860px)]:lg:py-6 [@media(min-height:950px)]:lg:items-center [@media(min-height:950px)]:lg:py-8">
        <form className="w-full max-w-[440px]" aria-label="Create account form">
          <div className="mb-4 [@media(min-height:900px)]:lg:mb-7">
            <h2 className="text-3xl font-semibold tracking-normal text-[#111827] sm:text-[2.5rem] lg:text-3xl [@media(min-height:900px)]:lg:text-4xl [@media(min-height:1000px)]:lg:text-[2.5rem]">
              Let&rsquo;s get started
            </h2>
            <p className="mt-1 text-base text-[#7A8190] [@media(min-height:900px)]:lg:mt-3">
              Fill the following information
            </p>
          </div>

          <div className="space-y-2 [@media(min-height:900px)]:lg:space-y-4">
            <div className={fieldWrapperClassName(Boolean(emailError))}>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-[#111827] [@media(min-height:900px)]:lg:mb-2"
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
                onBlur={() => markFieldAsTouched('email')}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'email-error' : undefined}
                className={inputClassName(Boolean(emailError))}
              />
              {emailError && <FieldError id="email-error" message={emailError} />}
            </div>

            <div className={fieldWrapperClassName(Boolean(hospitalNameError))}>
              <label
                htmlFor="hospitalName"
                className="mb-1 block text-sm font-medium text-[#111827] [@media(min-height:900px)]:lg:mb-2"
              >
                Hospital name
              </label>
              <input
                id="hospitalName"
                name="hospitalName"
                type="text"
                placeholder="Enter name..."
                value={hospitalName}
                onChange={(event) => setHospitalName(event.target.value)}
                onBlur={() => markFieldAsTouched('hospitalName')}
                aria-invalid={Boolean(hospitalNameError)}
                aria-describedby={
                  hospitalNameError ? 'hospital-name-error' : undefined
                }
                className={inputClassName(Boolean(hospitalNameError))}
              />
              {hospitalNameError && (
                <FieldError
                  id="hospital-name-error"
                  message={hospitalNameError}
                />
              )}
            </div>

            <div className={fieldWrapperClassName(Boolean(yourNameError))}>
              <label
                htmlFor="yourName"
                className="mb-1 block text-sm font-medium text-[#111827] [@media(min-height:900px)]:lg:mb-2"
              >
                Your name
              </label>
              <input
                id="yourName"
                name="yourName"
                type="text"
                placeholder="Enter name..."
                value={yourName}
                onChange={(event) => setYourName(event.target.value)}
                onBlur={() => markFieldAsTouched('yourName')}
                aria-invalid={Boolean(yourNameError)}
                aria-describedby={yourNameError ? 'your-name-error' : undefined}
                className={inputClassName(Boolean(yourNameError))}
              />
              {yourNameError && (
                <FieldError id="your-name-error" message={yourNameError} />
              )}
            </div>

            <div className={fieldWrapperClassName(Boolean(phoneError))}>
              <label
                htmlFor="phone"
                className="mb-1 block text-sm font-medium text-[#111827] [@media(min-height:900px)]:lg:mb-2"
              >
                Phone
              </label>
              <div
                className={`flex h-11 w-full overflow-hidden rounded-xl border bg-white transition focus-within:ring-4 [@media(max-height:820px)]:lg:h-10 [@media(min-height:900px)]:lg:h-12 ${
                  phoneError
                    ? 'border-[#E5484D] focus-within:border-[#E5484D] focus-within:ring-[#E5484D]/15'
                    : 'border-[#D8DCE5] focus-within:border-[#475AA2] focus-within:ring-[#475AA2]/15'
                }`}
              >
                <div className="flex items-center gap-2 border-r border-[#D8DCE5] px-3 text-sm font-medium text-[#111827] sm:px-4">
                  <span
                    className="flex h-5 w-5 shrink-0 overflow-hidden rounded-full"
                    aria-label="Nigeria"
                  >
                    <span className="h-full flex-1 bg-[#008753]" />
                    <span className="h-full flex-1 bg-white" />
                    <span className="h-full flex-1 bg-[#008753]" />
                  </span>
                  <span>+234</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                    className="text-[#6B7280]"
                  >
                    <path
                      d="M3 4.5L6 7.5L9 4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="812-3456-789"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  onBlur={() => markFieldAsTouched('phone')}
                  aria-invalid={Boolean(phoneError)}
                  aria-describedby={phoneError ? 'phone-error' : undefined}
                  className="min-w-0 flex-1 bg-white px-4 text-base text-[#111827] outline-none placeholder:text-[#A6ADBA]"
                />
              </div>
              {phoneError && <FieldError id="phone-error" message={phoneError} />}
            </div>

            <div className={fieldWrapperClassName(Boolean(passwordError))}>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-[#111827] [@media(min-height:900px)]:lg:mb-2"
              >
                Password
              </label>
              <div
                className={`flex h-11 w-full items-center rounded-xl border bg-white transition focus-within:ring-4 [@media(max-height:820px)]:lg:h-10 [@media(min-height:900px)]:lg:h-12 ${
                  passwordError
                    ? 'border-[#E5484D] focus-within:border-[#E5484D] focus-within:ring-[#E5484D]/15'
                    : 'border-[#D8DCE5] focus-within:border-[#475AA2] focus-within:ring-[#475AA2]/15'
                }`}
              >
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onBlur={() => markFieldAsTouched('password')}
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={
                    passwordError ? 'password-error' : undefined
                  }
                  className="min-w-0 flex-1 bg-transparent px-4 text-base text-[#111827] outline-none"
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
                <FieldError id="password-error" message={passwordError} />
              )}
              <div className="mt-2 [@media(min-height:900px)]:lg:mt-3">
                <div
                  className="grid grid-cols-3 gap-2"
                  aria-label="Password strength"
                >
                  {[1, 2, 3].map((segment) => (
                    <span
                      key={segment}
                      className={`h-1 rounded-full transition [@media(min-height:900px)]:lg:h-1.5 ${
                        passwordStrength >= segment + 1
                          ? 'bg-[#2F9E44]'
                          : passwordStrength >= segment
                            ? 'bg-[#F2C94C]'
                            : 'bg-[#E5E8EF]'
                      }`}
                    />
                  ))}
                </div>

                <p className="mt-2 text-xs font-medium text-[#7A8190] [@media(min-height:900px)]:lg:mt-3">
                  Must contain at least:
                </p>

                <div className="mt-1.5 grid gap-1 [@media(min-height:900px)]:lg:mt-2 [@media(min-height:900px)]:lg:gap-1.5">
                  {passwordRequirements.map((requirement) => (
                    <div
                      key={requirement.label}
                      className={`flex items-center gap-2 text-xs ${
                        requirement.isMet
                          ? 'text-[#2F9E44]'
                          : 'text-[#7A8190]'
                      }`}
                    >
                      <RequirementIcon isMet={requirement.isMet} />
                      <span>{requirement.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            className="mt-3 h-11 w-full rounded-xl bg-[#475AA2] text-base font-semibold text-white transition hover:bg-[#3D4F91] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25 [@media(max-height:820px)]:lg:h-10 [@media(min-height:900px)]:lg:mt-6 [@media(min-height:900px)]:lg:h-12"
          >
            Continue
          </button>

          <p className="mt-2 text-center text-sm text-[#7A8190] [@media(min-height:900px)]:lg:mt-4">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/select-role')}
              className="font-semibold text-[#475AA2] transition hover:text-[#364782] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/20"
            >
              Log in
            </button>
          </p>
        </form>
      </section>
    </main>
  )
}

export default CreateAccount
