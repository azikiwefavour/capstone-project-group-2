import { useEffect, useState } from 'react'
import { validateInvitation } from './invitations'

export default function useInvitation(token, errorParam = '', expectedRole = null) {
  const [snapshot, setSnapshot] = useState(null)
  const checked = snapshot?.token === token && snapshot?.expectedRole === expectedRole
  useEffect(() => {
    if (!token || errorParam) return
    const controller = new AbortController()
    validateInvitation(token, controller.signal).then(data => {
      if (controller.signal.aborted) return
      if (expectedRole && data.role !== expectedRole) throw new Error(`This invitation is not for a ${expectedRole.charAt(0).toUpperCase() + expectedRole.slice(1)} account. Please use the original invitation link.`)
      setSnapshot({ token, expectedRole, data })
    }).catch(error => {
      if (!controller.signal.aborted) setSnapshot({ token, expectedRole, error: error.message })
    })
    return () => controller.abort()
  }, [token, errorParam, expectedRole])
  return {
    isValidating: Boolean(token && !errorParam && !checked),
    validationError: errorParam || (!token ? 'No invitation token was provided. Please check the link in your email.' : checked ? snapshot.error || '' : ''),
    userData: checked && !errorParam ? snapshot.data || null : null,
  }
}
