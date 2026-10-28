import { getAccessToken, setAccessToken } from './session'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')

export async function verifyAdminSession(token, signal) {
  let response
  try {
    response = await fetch(`${apiBaseUrl}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
      cache: 'no-store',
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Unable to check your session. Please check your connection and try again.', { cause: error })
  }

  if (signal?.aborted || getAccessToken() !== token) return null
  const profile = await response.json().catch(() => null)
  if (signal?.aborted || getAccessToken() !== token) return null
  if ([401, 403, 404].includes(response.status)) {
    setAccessToken(null)
    return null
  }
  if (!response.ok) throw new Error('Unable to check your session. Please try again.')
  if (!profile || typeof profile.id !== 'string' || typeof profile.role !== 'string'
    || typeof profile.isEmailVerified !== 'boolean') {
    throw new Error('The server returned an unexpected session response. Please try again.')
  }
  if ((profile.role !== 'admin' && profile.role !== 'super_admin') || !profile.isEmailVerified || profile.invitationStatus === 'pending') {
    setAccessToken(null)
    return null
  }
  // Retain display name, email, plan status, and hospital name
  const result = {
    name: typeof profile.name === 'string' ? profile.name : '',
    email: typeof profile.email === 'string' ? profile.email : '',
  }
  if (profile.hasPlan !== undefined) result.hasPlan = profile.hasPlan
  if (profile.hospitalName !== undefined) result.hospitalName = typeof profile.hospitalName === 'string' ? profile.hospitalName : ''
  return result
}
