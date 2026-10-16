// Keep the JWT out of persistent browser storage and navigation state.
let accessToken = null
let authenticatedRole = null

export function setAccessToken(token, role = null) {
  accessToken = token
  authenticatedRole = token ? role : null
}

export function getAccessToken() {
  return accessToken
}

export function getAuthenticatedRole() {
  return authenticatedRole
}
