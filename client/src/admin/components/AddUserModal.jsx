import { useState } from 'react'

const roleOptions = ['Doctor', 'Pharmacist', 'Patient']

function FieldError({ id, message }) {
  if (!message) {
    return null
  }

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

function AddUserModal({ isOpen, onClose, onSuccess, initialUser = null }) {
  const [name, setName] = useState(initialUser?.name || '')
  const [email, setEmail] = useState(initialUser?.email || '')
  const [phone, setPhone] = useState(initialUser?.phone || '')
  const [role, setRole] = useState(initialUser?.role || '')
  const [touchedFields, setTouchedFields] = useState({})
  const [submitClicked, setSubmitClicked] = useState(false)
  const isEditing = Boolean(initialUser)

  if (!isOpen) {
    return null
  }

  const shouldShowError = (fieldName) =>
    submitClicked || Boolean(touchedFields[fieldName])

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const phoneDigits = phone.replace(/\D/g, '')
  const isPhoneValid =
    /^[789]\d{9}$/.test(phoneDigits) || /^0[789]\d{9}$/.test(phoneDigits)

  const nameError =
    shouldShowError('name') && name.trim() === '' ? 'This field is required.' : ''
  const emailError =
    shouldShowError('email') &&
    (email.trim() === ''
      ? 'This field is required.'
      : !isEmailValid
        ? 'Invalid email address.'
        : '')
  const phoneError =
    shouldShowError('phone') &&
    (phone.trim() === ''
      ? 'This field is required.'
      : !isPhoneValid
        ? 'Invalid phone number.'
        : '')
  const roleError =
    shouldShowError('role') && role === '' ? 'This field is required.' : ''

  const isFormValid =
    name.trim() !== '' &&
    email.trim() !== '' &&
    isEmailValid &&
    phone.trim() !== '' &&
    isPhoneValid &&
    role !== ''

  const inputClassName = (hasError) =>
    `h-11 w-full rounded-xl border bg-white px-4 text-base text-[#111827] outline-none transition placeholder:text-[#A6ADBA] focus:ring-4 ${
      hasError
        ? 'border-[#E5484D] focus:border-[#E5484D] focus:ring-[#E5484D]/15'
        : 'border-[#D8DCE5] focus:border-[#475AA2] focus:ring-[#475AA2]/15'
    }`

  function markFieldAsTouched(fieldName) {
    setTouchedFields((currentFields) => ({
      ...currentFields,
      [fieldName]: true,
    }))
  }

  function resetForm() {
    setName('')
    setEmail('')
    setPhone('')
    setRole('')
    setTouchedFields({})
    setSubmitClicked(false)
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  function handleSubmit(event) {
    event.preventDefault()
    setSubmitClicked(true)

    if (isFormValid) {
      const newDemoUser = {
        id: initialUser?.id || window.crypto?.randomUUID?.() || `${Date.now()}`,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
      }

      resetForm()
      onSuccess(newDemoUser)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/30 px-4 py-6"
      role="presentation"
      onClick={handleClose}
    >
      <form
        className="w-full max-w-[520px] rounded-3xl bg-white p-6 shadow-xl shadow-[#111827]/10 sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-user-title"
        aria-describedby="add-user-description"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="add-user-title"
              className="text-2xl font-semibold tracking-normal text-[#111827]"
            >
              {isEditing ? 'Edit user' : 'Add new user'}
            </h2>
            <p id="add-user-description" className="mt-2 text-base text-[#7A8190]">
              Fill in the users details
            </p>
          </div>

          <button
            type="button"
            aria-label="Close add user modal"
            onClick={handleClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#52556C] transition hover:bg-[#F7F8FB] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
              <path
                d="M6 6L18 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="mt-7 space-y-4">
          <div>
            <label htmlFor="new-user-name" className="mb-2 block text-sm font-medium text-[#111827]">
              Name
            </label>
            <input
              id="new-user-name"
              type="text"
              placeholder="Enter name..."
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => markFieldAsTouched('name')}
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? 'new-user-name-error' : undefined}
              className={inputClassName(Boolean(nameError))}
            />
            <FieldError id="new-user-name-error" message={nameError} />
          </div>

          <div>
            <label htmlFor="new-user-email" className="mb-2 block text-sm font-medium text-[#111827]">
              Email address
            </label>
            <input
              id="new-user-email"
              type="email"
              placeholder="e.g johndoe@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => markFieldAsTouched('email')}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? 'new-user-email-error' : undefined}
              className={inputClassName(Boolean(emailError))}
            />
            <FieldError id="new-user-email-error" message={emailError} />
          </div>

          <div>
            <label htmlFor="new-user-phone" className="mb-2 block text-sm font-medium text-[#111827]">
              Phone
            </label>
            <div
              className={`flex h-11 w-full overflow-hidden rounded-xl border bg-white transition focus-within:ring-4 ${
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
              </div>
              <input
                id="new-user-phone"
                type="tel"
                placeholder="812-3456-789"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                onBlur={() => markFieldAsTouched('phone')}
                aria-invalid={Boolean(phoneError)}
                aria-describedby={phoneError ? 'new-user-phone-error' : undefined}
                className="min-w-0 flex-1 bg-white px-4 text-base text-[#111827] outline-none placeholder:text-[#A6ADBA]"
              />
            </div>
            <FieldError id="new-user-phone-error" message={phoneError} />
          </div>

          <div>
            <label htmlFor="new-user-role" className="mb-2 block text-sm font-medium text-[#111827]">
              Role
            </label>
            <select
              id="new-user-role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              onBlur={() => markFieldAsTouched('role')}
              aria-invalid={Boolean(roleError)}
              aria-describedby={roleError ? 'new-user-role-error' : undefined}
              className={inputClassName(Boolean(roleError))}
            >
              <option value="">Select role</option>
              {roleOptions.map((roleOption) => (
                <option key={roleOption} value={roleOption}>
                  {roleOption}
                </option>
              ))}
            </select>
            <FieldError id="new-user-role-error" message={roleError} />
          </div>
        </div>

        <div className="mt-8 flex justify-start">
          <button
            type="submit"
            disabled={!isFormValid}
            className={`h-11 rounded-xl px-6 text-base font-semibold text-white transition focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25 ${
              isFormValid
                ? 'bg-[#475AA2] hover:bg-[#3D4F91]'
                : 'cursor-not-allowed bg-[#475AA2]/45'
            }`}
          >
            {isEditing ? 'Save changes' : 'Create user'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddUserModal
