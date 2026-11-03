import { getTokenExpiry } from '../auth/session'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const storageKey = 'medtrailSuperAdminSession'
let accessToken = null
let revision = 0
const listeners = new Set()

function tokenSubject(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.role === 'super_admin' && typeof payload.sub === 'string' && payload.sub.trim() && getTokenExpiry(token) > Date.now() ? payload.sub : null
  } catch {
    return null
  }
}

function clearStorage() {
  try { sessionStorage.removeItem(storageKey) } catch { /* Memory-only operation when storage is disabled. */ }
}

// Restore only a candidate token. The backend must verify it before protected content renders.
try {
  const saved = JSON.parse(sessionStorage.getItem(storageKey))
  if (typeof saved?.token === 'string' && tokenSubject(saved.token)) accessToken = saved.token
  else clearStorage()
} catch { clearStorage() }

export function getSuperAdminAccessToken() {
  return tokenSubject(accessToken) ? accessToken : null
}

export function subscribeToSuperAdminSession(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setSuperAdminAccessToken(token) {
  accessToken = typeof token === 'string' && tokenSubject(token) ? token : null
  revision += 1
  // Bearer-only backend: sessionStorage is JS-accessible, not an HttpOnly cookie.
  // Keep SuperAdmin, Doctor, and Admin sessions separate; never persist credentials or profiles.
  if (accessToken) {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ token: accessToken })) } catch { clearStorage() }
  } else clearStorage()
  listeners.forEach(listener => listener())
}

export async function verifySuperAdminSession(token, signal) {
  const checkedRevision = revision
  const isCurrent = () => !signal?.aborted && revision === checkedRevision && getSuperAdminAccessToken() === token
  if (!token || !isCurrent()) return null
  let response
  try {
    response = await fetch(`${apiBaseUrl}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }, signal, cache: 'no-store',
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Unable to check your session. Please check your connection and try again.', { cause: error })
  }
  if (!isCurrent()) return null
  const profile = await response.json().catch(() => null)
  if (!isCurrent()) return null
  if ([401, 403, 404].includes(response.status)) {
    setSuperAdminAccessToken(null)
    return null
  }
  if (!response.ok) throw new Error('Unable to check your session. Please try again.')
  if (!profile || typeof profile.id !== 'string' || typeof profile.role !== 'string' || typeof profile.isEmailVerified !== 'boolean') {
    throw new Error('The server returned an unexpected session response. Please try again.')
  }
  if (profile.id !== tokenSubject(token) || profile.role !== 'super_admin' || !profile.isEmailVerified || profile.invitationStatus === 'pending') {
    setSuperAdminAccessToken(null)
    return null
  }
  return { name: typeof profile.name === 'string' ? profile.name : '', email: typeof profile.email === 'string' ? profile.email : '' }
}

export async function authenticateSuperAdmin({ email, password, signal }) {
  setSuperAdminAccessToken(null)
  const loginRevision = revision
  const checkCurrent = () => {
    if (signal?.aborted || revision !== loginRevision) throw new Error('Your login attempt is no longer active. Please try again.')
  }
  checkCurrent()
  let response
  try {
    response = await fetch(`${apiBaseUrl}/api/auth/login`, {
      signal, method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password, role: 'super_admin' }),
    })
  } catch (error) {
    checkCurrent()
    throw new Error('Unable to connect. Please check your connection and try again.', { cause: error })
  }
  const data = await response.json().catch(() => null)
  checkCurrent()
  if (response.status !== 200) {
    const message = Array.isArray(data?.message) ? data.message.filter(value => typeof value === 'string').join(' ') : typeof data?.message === 'string' ? data.message : ''
    throw new Error(message || 'Invalid email or password.')
  }
  if (data?.user?.role !== 'super_admin' || typeof data.user.id !== 'string' || tokenSubject(data.accessToken) !== data.user.id) {
    throw new Error('Login returned an unexpected response. Please try again.')
  }
  setSuperAdminAccessToken(data.accessToken)
  const candidateRevision = revision
  try {
    const profile = await verifySuperAdminSession(data.accessToken, signal)
    if (!profile || signal?.aborted || revision !== candidateRevision || getSuperAdminAccessToken() !== data.accessToken) {
      throw new Error('Unable to verify this Super Admin session. Please log in again.')
    }
    return profile
  } catch (error) {
    if (revision === candidateRevision) setSuperAdminAccessToken(null)
    throw error
  }
}
