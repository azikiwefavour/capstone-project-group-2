import { getTokenExpiry } from './session'
import { setDoctorAccessToken } from './doctorSession'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '')
const invitationRoles = ['doctor', 'pharmacist']

function responseMessage(data, fallback) {
  return Array.isArray(data?.message) ? data.message.filter(value => typeof value === 'string').join(' ') || fallback : typeof data?.message === 'string' && data.message ? data.message : fallback
}

export async function validateInvitation(token, signal) {
  if (typeof token !== 'string' || !token.trim()) throw new Error('No invitation token was provided. Please check the link in your email.')
  let response
  try {
    response = await fetch(`${apiBaseUrl}/api/auth/validate-invitation?token=${encodeURIComponent(token)}`, { signal, cache: 'no-store' })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Failed to connect to the server. Please verify your connection.', { cause: error })
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(responseMessage(data, 'Invalid or expired invitation link.'))
  if (data?.valid !== true || typeof data.name !== 'string' || !data.name.trim() || typeof data.email !== 'string' || !data.email.trim() || !invitationRoles.includes(data.role)) {
    throw new Error('The server returned an unexpected invitation response. Please contact your administrator.')
  }
  return { name: data.name, email: data.email, role: data.role }
}

export async function completeInvitation({ token, password, confirmPassword, invitation, signal }) {
  if (typeof token !== 'string' || !token.trim() || !invitationRoles.includes(invitation?.role)) throw new Error('Please open a valid invitation link before creating your password.')
  if (typeof password !== 'string' || password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new Error('Please ensure your password meets all requirements.')
  }
  if (confirmPassword !== password) throw new Error('Passwords do not match. Please verify your confirm password.')
  if (signal?.aborted) return null
  let response
  try {
    response = await fetch(`${apiBaseUrl}/api/auth/complete-registration`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
      body: JSON.stringify({ token, password, confirmPassword }),
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Unable to complete registration. Please check your network and try again.', { cause: error })
  }
  const data = await response.json().catch(() => null)
  if (signal?.aborted) return null
  if (!response.ok) throw new Error(responseMessage(data, 'Registration failed.'))
  let payload
  try { payload = JSON.parse(atob(data.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) } catch { /* Reject malformed tokens below. */ }
  if (!data?.user || typeof data.user.id !== 'string' || data.user.role !== invitation.role
    || typeof data.user.email !== 'string' || data.user.email.trim().toLowerCase() !== invitation.email?.trim().toLowerCase()
    || payload?.sub !== data.user.id || payload?.role !== data.user.role || getTokenExpiry(data.accessToken) <= Date.now()) {
    throw new Error('Registration completed, but the session response could not be verified. Please log in or contact your administrator.')
  }
  // This is a candidate server-issued token. DoctorLayout still verifies the profile.
  // Never put a Doctor token in Admin storage or retain credentials/invitation tokens.
  if (data.user.role === 'doctor') setDoctorAccessToken(data.accessToken)
  // Pharmacist account creation is supported, but its protected workspace is not
  // implemented here. Send it to existing Login instead of an unprotected dashboard.
  return { role: data.user.role }
}
