// Development testing only: use the current frontend, never a hardcoded Vite port
// or an untrusted URL supplied in the invitation response. Tokens stay in memory.
export function patientRegistrationTestUrl(result, frontendOrigin) {
  if (result?.user?.role !== 'patient' || typeof result.invitationToken !== 'string' || !result.invitationToken.trim()) return null
  const origin = new URL(frontendOrigin)
  if (!['http:', 'https:'].includes(origin.protocol)) return null
  const url = new URL('/accept-invite', origin.origin)
  url.searchParams.set('token', result.invitationToken)
  return url.href
}
