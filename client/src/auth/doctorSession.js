import { getTokenExpiry } from './session'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const storageKey = 'medtrailDoctorSession'
let accessToken = null
let revision = 0
const listeners = new Set()

function tokenSubject(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.role === 'doctor' && typeof payload.sub === 'string' && payload.sub.trim() && getTokenExpiry(token) > Date.now() ? payload.sub : null
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

export function getDoctorAccessToken() {
  return tokenSubject(accessToken) ? accessToken : null
}

export function subscribeToDoctorSession(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setDoctorAccessToken(token) {
  accessToken = typeof token === 'string' && tokenSubject(token) ? token : null
  revision += 1
  // Bearer-only backend: sessionStorage is JS-accessible, not an HttpOnly cookie.
  // Keep Doctor and Admin sessions separate; never persist credentials or profiles.
  if (accessToken) {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ token: accessToken })) } catch { clearStorage() }
  } else clearStorage()
  listeners.forEach(listener => listener())
}

export async function verifyDoctorSession(token, signal) {
  const checkedRevision = revision
  const isCurrent = () => !signal?.aborted && revision === checkedRevision && getDoctorAccessToken() === token
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
    setDoctorAccessToken(null)
    return null
  }
  if (!response.ok) throw new Error('Unable to check your session. Please try again.')
  if (!profile || typeof profile.id !== 'string' || typeof profile.role !== 'string' || typeof profile.isEmailVerified !== 'boolean') {
    throw new Error('The server returned an unexpected session response. Please try again.')
  }
  if (profile.id !== tokenSubject(token) || profile.role !== 'doctor' || !profile.isEmailVerified || profile.invitationStatus === 'pending') {
    setDoctorAccessToken(null)
    return null
  }
  return { name: typeof profile.name === 'string' ? profile.name : '', email: typeof profile.email === 'string' ? profile.email : '' }
}

export async function loginDoctor({ email, password }) {
  setDoctorAccessToken(null)
  const loginRevision = revision
  let response
  try {
    response = await fetch(`${apiBaseUrl}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password, role: 'doctor' }),
    })
  } catch (error) {
    throw new Error('Unable to connect. Please check your connection and try again.', { cause: error })
  }
  const data = await response.json().catch(() => null)
  if (revision !== loginRevision) throw new Error('Your login attempt is no longer active. Please try again.')
  if (response.status !== 200) {
    const message = Array.isArray(data?.message) ? data.message.filter(value => typeof value === 'string').join(' ') : typeof data?.message === 'string' ? data.message : ''
    throw new Error(message || 'Invalid email or password.')
  }
  if (data?.user?.role !== 'doctor' || typeof data.user.id !== 'string' || tokenSubject(data.accessToken) !== data.user.id) {
    throw new Error('Login returned an unexpected response. Please try again.')
  }
  setDoctorAccessToken(data.accessToken)
}
