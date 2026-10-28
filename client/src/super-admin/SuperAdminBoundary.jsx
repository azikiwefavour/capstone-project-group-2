import { useEffect, useState, useSyncExternalStore } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { getTokenExpiry } from '../auth/session'
import { getSuperAdminAccessToken, setSuperAdminAccessToken, subscribeToSuperAdminSession, verifySuperAdminSession } from './authentication'

export default function SuperAdminBoundary() {
  const token = useSyncExternalStore(subscribeToSuperAdminSession, getSuperAdminAccessToken)
  const [verification, setVerification] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const checked = verification?.token === token && verification?.attempt === attempt

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    verifySuperAdminSession(token, controller.signal).then(profile => {
      if (!controller.signal.aborted && profile && getSuperAdminAccessToken() === token) {
        setVerification({ token, attempt, profile })
      }
    }).catch(error => {
      if (!controller.signal.aborted && getSuperAdminAccessToken() === token) {
        setVerification({ token, attempt, error: error.message })
      }
    })
    return () => controller.abort()
  }, [token, attempt])

  useEffect(() => {
    if (!token) return
    let timer
    function checkExpiry() {
      window.clearTimeout(timer)
      const remaining = getTokenExpiry(token) - Date.now()
      if (remaining <= 0) {
        if (!getSuperAdminAccessToken() || getSuperAdminAccessToken() === token) setSuperAdminAccessToken(null)
      } else timer = window.setTimeout(checkExpiry, Math.min(remaining, 2147483647))
    }
    checkExpiry()
    window.addEventListener('focus', checkExpiry)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', checkExpiry)
    }
  }, [token])

  if (!token) return <Navigate to="/super-admin/login" replace />
  if (!checked) return <p role="status" className="p-5 text-sm text-[#7A8190]">Checking your session...</p>
  if (verification.error) return <div role="alert" className="p-5 text-sm text-[#52556C]">
    <p>{verification.error}</p>
    <button type="button" onClick={() => setAttempt(value => value + 1)} className="mt-3 rounded-xl bg-[#475AA2] px-4 py-2 font-semibold text-white">Try again</button>
    <button type="button" onClick={() => setSuperAdminAccessToken(null)} className="ml-3 font-semibold text-[#475AA2]">Log out</button>
  </div>
  return <Outlet context={{ profile: verification.profile, onLogout: () => setSuperAdminAccessToken(null) }} />
}
