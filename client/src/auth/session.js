let memoryToken = null

export function setAccessToken(token) {
  memoryToken = token
  if (token) {
    try {
      sessionStorage.setItem('medtrailAuthToken', token)
    } catch (_) {}
  } else {
    try {
      sessionStorage.removeItem('medtrailAuthToken')
    } catch (_) {}
  }
}

export function getAccessToken() {
  if (memoryToken) return memoryToken
  try {
    return sessionStorage.getItem('medtrailAuthToken')
  } catch (_) {
    return null
  }
}

