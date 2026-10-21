// Only Admin sessions survive reloads, within this tab. Never use localStorage or navigation state.
// Bearer-only backend: sessionStorage is JS-accessible; HttpOnly sessions need backend support.
const adminSessionKey = 'medtrailAdminSession'
const patientSessionKey = 'medtrailPatientSession'
let accessToken = null
let authenticatedRole = null
const listeners = new Set()

function clearStoredAdminSession() {
  try {
    sessionStorage.removeItem(adminSessionKey)
    sessionStorage.removeItem('medtrailDemoAdminName')
  } catch {
    // Storage can be disabled; memory-only login still works.
  }
}

function clearStoredPatientSession() {
  try {
    sessionStorage.removeItem(patientSessionKey)
  } catch {}
}

export function getTokenExpiry(token = accessToken) {
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(encoded))
    return Number.isFinite(payload.exp) ? payload.exp * 1000 : 0
  } catch {
    return 0
  }
}

try {
  const saved = JSON.parse(sessionStorage.getItem(adminSessionKey))
  const savedPatient = JSON.parse(sessionStorage.getItem(patientSessionKey))
  if (saved?.role === 'admin' && typeof saved.token === 'string' && getTokenExpiry(saved.token) > Date.now()) {
    accessToken = saved.token
    authenticatedRole = 'admin'
  } else if (savedPatient?.role === 'patient' && typeof savedPatient.token === 'string' && getTokenExpiry(savedPatient.token) > Date.now()) {
    accessToken = savedPatient.token
    authenticatedRole = 'patient'
  } else {
    clearStoredAdminSession()
    clearStoredPatientSession()
  }
} catch {
  clearStoredAdminSession()
  clearStoredPatientSession()
}

export function subscribeToSession(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setAccessToken(token, role = null) {
  accessToken = token
  authenticatedRole = token ? role : null
  if (role === 'admin' && getTokenExpiry(token) > Date.now()) {
    try {
      sessionStorage.setItem(adminSessionKey, JSON.stringify({ token, role: 'admin' }))
    } catch {
      clearStoredAdminSession()
    }
  } else if (role === 'patient' && getTokenExpiry(token) > Date.now()) {
    try {
      sessionStorage.setItem(patientSessionKey, JSON.stringify({ token, role: 'patient' }))
    } catch {
      clearStoredPatientSession()
    }
  } else {
    clearStoredAdminSession()
    clearStoredPatientSession()
  }
  listeners.forEach((listener) => listener())
}

export function getAccessToken() {
  return getTokenExpiry() > Date.now() ? accessToken : null
}

export function getAuthenticatedRole() {
  return getAccessToken() ? authenticatedRole : null
}
