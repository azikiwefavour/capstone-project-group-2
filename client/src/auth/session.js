// Only Admin/Auth sessions survive reloads, within this tab. Never use localStorage or navigation state.
const adminSessionKey = 'medtrailAdminSession'
const tokenKey = 'medtrailAuthToken'
let accessToken = null
let authenticatedRole = null
const listeners = new Set()

export function getTokenExpiry(token = accessToken) {
  try {
    if (!token) return 0
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(encoded))
    return Number.isFinite(payload.exp) ? payload.exp * 1000 : 0
  } catch {
    return 0
  }
}

function clearStoredAdminSession() {
  try {
    sessionStorage.removeItem(adminSessionKey)
    sessionStorage.removeItem(tokenKey)
    sessionStorage.removeItem('medtrailDemoAdminName')
  } catch {
    // Storage can be disabled; memory-only login still works.
  }
}

try {
  const saved = JSON.parse(sessionStorage.getItem(adminSessionKey) || '{}')
  const generalToken = sessionStorage.getItem(tokenKey)
  const candidateToken = saved?.token || generalToken

  if (candidateToken && getTokenExpiry(candidateToken) > Date.now()) {
    accessToken = candidateToken
    authenticatedRole = saved?.role || 'admin'
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
  let inferredRole = role
  if (!inferredRole && token) {
    try {
      const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
      const payload = JSON.parse(atob(encoded))
      inferredRole = payload.role
    } catch (_) {}
  }

  authenticatedRole = token ? (inferredRole || 'admin') : null

  if (token && getTokenExpiry(token) > Date.now()) {
    try {
      sessionStorage.setItem(tokenKey, token)
      sessionStorage.setItem(adminSessionKey, JSON.stringify({ token, role: authenticatedRole }))
    } catch {
      clearStoredAdminSession()
    }
  } else {
    clearStoredAdminSession()
  }

  listeners.forEach((listener) => listener())
}

export function getAccessToken() {
  if (accessToken && getTokenExpiry(accessToken) > Date.now()) {
    return accessToken
  }
  try {
    const stored = sessionStorage.getItem(tokenKey)
    if (stored && getTokenExpiry(stored) > Date.now()) {
      accessToken = stored
      return stored
    }
  } catch (_) {}
  return null
}

export function getAuthenticatedRole() {
  return getAccessToken() ? authenticatedRole : null
}
