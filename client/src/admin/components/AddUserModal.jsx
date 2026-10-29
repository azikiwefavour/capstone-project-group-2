import { useRef, useState } from 'react'
import { adminRequest } from '../api'
import { patientRegistrationTestUrl } from '../invitationLinks'

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
  const [gender, setGender] = useState(initialUser?.role === 'Patient' ? initialUser.gender || '' : '')
  const [age, setAge] = useState(initialUser?.role === 'Patient' ? String(initialUser.age ?? '') : '')
  const [isOfflinePatient, setIsOfflinePatient] = useState(false)
  const [caregiverName, setCaregiverName] = useState('')
  const [caregiverPhone, setCaregiverPhone] = useState('')
  const [touchedFields, setTouchedFields] = useState({})
  const [submitClicked, setSubmitClicked] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [patientTestLink, setPatientTestLink] = useState(null)
  const submissionInFlight = useRef(false)
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

  const isPatient = role === 'Patient'
  const emailRequired = role !== 'Patient' && !isOfflinePatient

  const nameError =
    shouldShowError('name') && name.trim() === '' ? 'This field is required.' : ''
  const emailError =
    shouldShowError('email') &&
    (email.trim() !== ''
      ? !isEmailValid
        ? 'Invalid email address.'
        : ''
      : emailRequired
        ? 'This field is required.'
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
  const isGenderValid = gender === 'Male' || gender === 'Female'
  const numericAge = Number(age)
  const isAgeValid = /^\d+$/.test(age) && Number.isSafeInteger(numericAge) && numericAge >= 0
  const genderError =
    isPatient && shouldShowError('gender') && !isGenderValid
      ? 'This field is required.'
      : ''
  const ageError =
    isPatient && shouldShowError('age')
      ? age.trim() === ''
        ? 'This field is required.'
        : !isAgeValid
          ? 'Enter a valid age in whole years.'
          : ''
      : ''

  const isFormValid =
    name.trim() !== '' &&
    (!emailRequired ? (email.trim() === '' || isEmailValid) : (email.trim() !== '' && isEmailValid)) &&
    phone.trim() !== '' &&
    isPhoneValid &&
    role !== '' &&
    (!isPatient || (isGenderValid && isAgeValid))

  const missingFields = []
  if (!name.trim()) missingFields.push('Full Name')
  if (!isPhoneValid) missingFields.push('Valid Phone (+234)')
  if (emailRequired && (!email.trim() || !isEmailValid)) missingFields.push('Email')
  else if (!emailRequired && email.trim() !== '' && !isEmailValid) missingFields.push('Valid Email')
  if (!role) missingFields.push('Role')
  if (isPatient) {
    if (!isGenderValid) missingFields.push('Gender')
    if (!isAgeValid) missingFields.push('Age')
  }

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
    setGender('')
    setAge('')
    setIsOfflinePatient(false)
    setCaregiverName('')
    setCaregiverPhone('')
    setTouchedFields({})
    setSubmitClicked(false)
    setPatientTestLink(null)
  }

  function handleRoleChange(nextRole) {
    setRole(nextRole)
    if (nextRole !== 'Patient') {
      setGender('')
      setAge('')
      setIsOfflinePatient(false)
      setCaregiverName('')
      setCaregiverPhone('')
      setTouchedFields((currentFields) => ({
        ...currentFields,
        gender: false,
        age: false,
      }))
    }
  }

  function handleClose() {
    if (submissionInFlight.current) return
    resetForm()
    onClose()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submissionInFlight.current) return
    setSubmitClicked(true)
    setSubmitError('')

    if (!isFormValid) return
    if (isEditing) {
      setSubmitError('Editing users is not supported by the current admin API.')
      return
    }
    submissionInFlight.current = true
    setIsSubmitting(true)
      const cleanCaregiverPhone = caregiverPhone.replace(/\D/g, '').replace(/^0/, '')
      const isOffline = isOfflinePatient || (isPatient && !email.trim())
      const result = await adminRequest('invite-user', {
        method: 'POST',
        body: {
          name: name.trim(),
          ...(isPatient && !email.trim() ? {} : { email: email.trim().toLowerCase() }),
          phone: `+234${phoneDigits.replace(/^0/, '')}`,
          role: role.toLowerCase(),
          ...(isPatient ? {
            gender,
            age: numericAge,
            isOfflinePatient: isOffline,
            ...(caregiverName.trim() ? { caregiverName: caregiverName.trim() } : {}),
            ...(cleanCaregiverPhone ? { caregiverPhone: `+234${cleanCaregiverPhone}` } : {}),
          } : {}),
        },
      })
      const testLink = import.meta.env.DEV && isPatient && !isOffline ? patientRegistrationTestUrl(result, window.location.origin) : null
      resetForm()
      // The current API does not report mail delivery failures.
      onSuccess(isPatient && isOffline ? 'Patient registered as SMS-only patient! Welcome SMS sent via Termii.' : 'Invitation created successfully.')
      if (testLink) setPatientTestLink(testLink)
      else onClose()
    } catch (error) {
      setSubmitError(error.message)
    } finally {
      submissionInFlight.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/30 px-4 py-6"
      role="presentation"
      onClick={handleClose}
    >
      <form aria-busy={isSubmitting}
        className="max-h-[calc(100dvh-3rem)] w-full max-w-[520px] overflow-y-auto rounded-3xl bg-white p-6 shadow-xl shadow-[#111827]/10 sm:p-8"
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
              {patientTestLink ? 'Patient invitation created' : isEditing ? 'Edit user' : 'Add new user'}
            </h2>
            <p id="add-user-description" className="mt-2 text-base text-[#7A8190]">
              {patientTestLink ? 'Email delivery has not been confirmed.' : 'Fill in the users details'}
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

        {patientTestLink ? <div className="mt-7 space-y-4 text-sm text-[#7A8190]">
          <p>For local testing, open Patient registration on this frontend. The invitation token remains in this browser link only.</p>
          <a href={patientTestLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-xl bg-[#475AA2] px-4 font-semibold text-white focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25">Open Patient registration</a>
          <p>Email links use the backend’s FRONTEND_URL setting. This testing link does not change email configuration.</p>
          <button type="button" onClick={handleClose} className="block rounded-lg px-3 py-2 font-semibold text-[#475AA2] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15">Done</button>
        </div> : <>
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

          {isPatient && (
            <div className="rounded-xl border border-[#DEE2F4] bg-[#EEF0FF]/60 p-3.5">
              <label className="flex items-start gap-2.5 cursor-pointer text-sm font-medium text-[#111827]">
                <input
                  type="checkbox"
                  checked={isOfflinePatient}
                  onChange={(e) => {
                    setIsOfflinePatient(e.target.checked)
                    if (e.target.checked) markFieldAsTouched('email')
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-[#D8DCE5] text-[#475AA2] focus:ring-[#475AA2]"
                />
                <div>
                  <span>SMS-only / Offline Patient (no email needed)</span>
                  <p className="text-xs font-normal text-[#52556C] mt-0.5">
                    Offline patients receive prescriptions and alerts via Termii SMS without needing portal email access.
                  </p>
                </div>
              </label>
            </div>
          )}

          {(!isPatient || !isOfflinePatient) && (
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
          )}

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
            {isPatient && (
              <p className="mt-1 text-xs text-[#52556C]">
                Prescription updates and reminders are sent to this number via Termii SMS.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="new-user-role" className="mb-2 block text-sm font-medium text-[#111827]">
              Role
            </label>
            <select
              id="new-user-role"
              value={role}
              onChange={(event) => handleRoleChange(event.target.value)}
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

          {isPatient && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="new-user-gender" className="mb-2 block text-sm font-medium text-[#111827]">
                    Gender <span className="text-[#E5484D]">*</span>
                  </label>
                  <select
                    id="new-user-gender"
                    value={gender}
                    required
                    onChange={(event) => setGender(event.target.value)}
                    onBlur={() => markFieldAsTouched('gender')}
                    aria-invalid={Boolean(genderError)}
                    aria-describedby={genderError ? 'new-user-gender-error' : undefined}
                    className={inputClassName(Boolean(genderError))}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  <FieldError id="new-user-gender-error" message={genderError} />
                </div>

                <div>
                  <label htmlFor="new-user-age" className="mb-2 block text-sm font-medium text-[#111827]">
                    Age <span className="text-[#E5484D]">*</span>
                  </label>
                  <input
                    id="new-user-age"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]+"
                    required
                    placeholder="Enter age..."
                    value={age}
                    onChange={(event) => {
                      const nextAge = event.target.value
                      if (/^\d*$/.test(nextAge)) setAge(nextAge)
                    }}
                    onBlur={() => markFieldAsTouched('age')}
                    aria-invalid={Boolean(ageError)}
                    aria-describedby={ageError ? 'new-user-age-error' : undefined}
                    className={inputClassName(Boolean(ageError))}
                  />
                  <FieldError id="new-user-age-error" message={ageError} />
                </div>
              </div>

              <div className="rounded-xl border border-[#D8DCE5] bg-gray-50/70 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#111827]">
                    Guardian / Caregiver <span className="font-normal text-[#7A8190] lowercase">(optional)</span>
                  </p>
                  <span className="rounded-md bg-[#EEF0FF] px-2 py-0.5 text-[11px] font-medium text-[#475AA2]">
                    Optional
                  </span>
                </div>
                <div>
                  <label htmlFor="new-user-caregiver-name" className="mb-1 block text-xs font-medium text-[#52556C]">
                    Guardian Name & Relationship (Optional)
                  </label>
                  <input
                    id="new-user-caregiver-name"
                    type="text"
                    placeholder="e.g. Emeka Adeyemi (Son)"
                    value={caregiverName}
                    onChange={(e) => setCaregiverName(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#D8DCE5] bg-white px-3 text-sm text-[#111827] outline-none placeholder:text-[#A6ADBA] focus:border-[#475AA2] focus:ring-4 focus:ring-[#475AA2]/15"
                  />
                </div>
                <div>
                  <label htmlFor="new-user-caregiver-phone" className="mb-1 block text-xs font-medium text-[#52556C]">
                    Guardian Phone Number (Optional)
                  </label>
                  <input
                    id="new-user-caregiver-phone"
                    type="tel"
                    placeholder="e.g. 08098765432"
                    value={caregiverPhone}
                    onChange={(e) => setCaregiverPhone(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#D8DCE5] bg-white px-3 text-sm text-[#111827] outline-none placeholder:text-[#A6ADBA] focus:border-[#475AA2] focus:ring-4 focus:ring-[#475AA2]/15"
                  />
                  <p className="mt-1 text-[11px] text-[#7A8190]">
                    Caregivers automatically receive SMS copies of all prescriptions & dosage alerts via Termii. Leave blank if patient has no guardian.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {submitError && <div role="alert" className="mt-3"><FieldError id="new-user-submit-error" message={submitError} /></div>}

        {!isFormValid && missingFields.length > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800">
            <svg className="h-4 w-4 shrink-0 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>
              Please complete required info to enable creation: <strong className="font-semibold text-amber-900">{missingFields.join(', ')}</strong>
            </span>
          </div>
        )}

        <div
          className="mt-6 flex justify-start"
          onClick={() => {
            if (!isFormValid) {
              setSubmitClicked(true)
              setTouchedFields({
                name: true,
                email: true,
                phone: true,
                role: true,
                gender: true,
                age: true,
              })
            }
          }}
        >
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`h-11 rounded-xl px-6 text-base font-semibold text-white transition focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25 ${
              isFormValid
                ? 'bg-[#475AA2] hover:bg-[#3D4F91] cursor-pointer active:scale-[0.98]'
                : 'cursor-not-allowed bg-[#475AA2]/45'
            }`}
          >
            {isSubmitting ? 'Sending invitation...' : isEditing ? 'Save changes' : 'Create user'}
          </button>
        </div>
        </>}
      </form>
    </div>
  )
}

export default AddUserModal
