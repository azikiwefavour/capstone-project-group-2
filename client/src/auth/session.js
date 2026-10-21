// This module owns only Admin persistence. Patient persistence and verification
// belong to patientSession.js; never read, overwrite or clear its storage here.
// Never use localStorage or navigation state.
// Bearer-only backend: sessionStorage is JS-accessible; HttpOnly sessions need backend support.
const adminSessionKey = 'medtrailAdminSession'
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
  if (saved?.role === 'admin' && typeof saved.token === 'string' && getTokenExpiry(saved.token) > Date.now()) {
    accessToken = saved.token
    authenticatedRole = 'admin'
  } else {
    clearStoredAdminSession()
  }
} catch {
  clearStoredAdminSession()
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
  } else {
    clearStoredAdminSession()
  }
  listeners.forEach((listener) => listener())
}

export function getAccessToken() {
  return getTokenExpiry() > Date.now() ? accessToken : null
}

export function getAuthenticatedRole() {
  return getAccessToken() ? authenticatedRole : null
}
