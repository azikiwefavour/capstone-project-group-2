import { getAccessToken, setAccessToken } from '../auth/session'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')

export async function adminRequest(path, { method = 'GET', body, signal } = {}) {
  const token = getAccessToken()
  if (!token) throw new Error('Please log in as an admin to continue.')

  let response
  try {
    response = await fetch(`${apiBaseUrl}/api/admin/${path}`, {
      method,
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Unable to connect. Please check your connection and try again.', { cause: error })
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 && getAccessToken() === token) setAccessToken(null)
    const message = Array.isArray(data?.message)
      ? data.message.filter((value) => typeof value === 'string').join(' ')
      : typeof data?.message === 'string' ? data.message : ''
    throw new Error(message || (response.status === 403
      ? 'This account does not have permission to manage users.'
      : 'The request could not be completed. Please try again.'))
  }
  return data
}

// Select display fields only; never retain invitation tokens or private account fields.
export function normalizeUser(user) {
  const role = user.role || user.invitedRole || ''
  return {
    id: user.id,
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    role: role ? role[0].toUpperCase() + role.slice(1).toLowerCase() : '',
    createdAt: user.createdAt || '',
    invitationStatus: user.invitationStatus,
    status: user.invitationStatus === 'pending' ? 'pending'
      : user.isEmailVerified === true ? 'active' : null,
  }
}

export async function getAdminUsers(signal) {
  const [users, invitedUsers] = await Promise.all([
    adminRequest('users', { signal }),
    adminRequest('invited-users', { signal }),
  ])
  if (!Array.isArray(users) || !Array.isArray(invitedUsers)) {
    throw new Error('The server returned an unexpected user list. Please try again.')
  }
  const merged = new Map(users.map((user) => [user.id, user]))
  for (const invitation of invitedUsers) {
    merged.set(invitation.id, { ...merged.get(invitation.id), ...invitation })
  }
  return [...merged.values()].map(normalizeUser)
}
