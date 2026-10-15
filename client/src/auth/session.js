// Keep the JWT out of persistent browser storage and navigation state.
let accessToken = null

export function setAccessToken(token) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}
