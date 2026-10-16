// Temporary doctor UI preview state. Never use this to authorize real API requests.
let previewSessionActive = false
let passwordReset = null

export function isValidPreviewPassword(password) {
  return password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)
}

export function startDoctorPreviewSession() {
  previewSessionActive = true
}

export function hasDoctorPreviewSession() {
  return previewSessionActive
}

export function endDoctorPreviewSession() {
  previewSessionActive = false
  passwordReset = null
}

export function beginDoctorPreviewReset(email) {
  passwordReset = {
    email,
    verified: false,
  }
}

export function verifyDoctorPreviewResetCode(email, code) {
  // Temporary navigation bypass: validate format only until doctor verification is integrated.
  if (!/^\d{6}$/.test(code)) return false
  passwordReset = { email, verified: true }
  return true
}

export function hasVerifiedDoctorPreviewReset(email, code) {
  return Boolean(passwordReset?.verified && passwordReset.email === email && /^\d{6}$/.test(code))
}

export function completeDoctorPreviewReset() {
  passwordReset = null
}
