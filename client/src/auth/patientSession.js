import { getTokenExpiry } from './session'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const storageKey = 'medtrailPatientSession'
let accessToken = null
let revision = 0
const listeners = new Set()

function tokenSubject(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.role === 'patient' && typeof payload.sub === 'string' && payload.sub.trim() && getTokenExpiry(token) > Date.now() ? payload.sub : null
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

export function getPatientAccessToken() {
  return tokenSubject(accessToken) ? accessToken : null
}

export function subscribeToPatientSession(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setPatientAccessToken(token) {
  accessToken = typeof token === 'string' && tokenSubject(token) ? token : null
  revision += 1
  // Bearer-only backend: sessionStorage is JS-accessible, not an HttpOnly cookie.
  // Keep Patient, Pharmacist, Doctor, and Admin sessions separate; never persist credentials or profiles.
  if (accessToken) {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ token: accessToken })) } catch { clearStorage() }
  } else clearStorage()
  listeners.forEach(listener => listener())
}

export async function verifyPatientSession(token, signal) {
  const checkedRevision = revision
  const isCurrent = () => !signal?.aborted && revision === checkedRevision && getPatientAccessToken() === token
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
    setPatientAccessToken(null)
    return null
  }
  if (!response.ok) throw new Error('Unable to check your session. Please try again.')
  if (!profile || typeof profile.id !== 'string' || typeof profile.role !== 'string' || typeof profile.isEmailVerified !== 'boolean') {
    throw new Error('The server returned an unexpected session response. Please try again.')
  }
  if (profile.id !== tokenSubject(token) || profile.role !== 'patient' || !profile.isEmailVerified || profile.invitationStatus === 'pending') {
    setPatientAccessToken(null)
    return null
  }
  return { name: typeof profile.name === 'string' ? profile.name : '' }
}

export async function loginPatient({ email, password, signal }) {
  setPatientAccessToken(null)
  const loginRevision = revision
  const checkCurrent = () => {
    if (signal?.aborted || revision !== loginRevision) throw new Error('Your login attempt is no longer active. Please try again.')
  }
  checkCurrent()
  let response
  try {
    response = await fetch(`${apiBaseUrl}/api/auth/login`, {
      signal, method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password, role: 'patient' }),
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
  if (data?.user?.role !== 'patient' || typeof data.user.id !== 'string' || tokenSubject(data.accessToken) !== data.user.id) {
    throw new Error('Login returned an unexpected response. Please try again.')
  }
  setPatientAccessToken(data.accessToken)
}
