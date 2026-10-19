import { useEffect, useState, useSyncExternalStore } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import MedTrailLogo from '../../admin/components/MedTrailLogo'
import { getTokenExpiry } from '../../auth/session'
import { getPharmacistAccessToken, setPharmacistAccessToken, subscribeToPharmacistSession, verifyPharmacistSession } from '../../auth/pharmacistSession'

export default function PharmacistLayout() {
  const navigate = useNavigate()
  const token = useSyncExternalStore(subscribeToPharmacistSession, getPharmacistAccessToken)
  const [verification, setVerification] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const checked = Boolean(token && verification?.token === token && verification?.attempt === attempt)

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    verifyPharmacistSession(token, controller.signal).then(profile => {
      if (!controller.signal.aborted && profile && getPharmacistAccessToken() === token) {
        setVerification({ token, attempt, status: 'verified', name: profile.name })
      }
    }).catch(error => {
      if (!controller.signal.aborted && getPharmacistAccessToken() === token) {
        setVerification({ token, attempt, status: 'error', error: error.message })
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
        if (getPharmacistAccessToken() === token || !getPharmacistAccessToken()) setPharmacistAccessToken(null)
      } else timer = window.setTimeout(checkExpiry, Math.min(remaining, 2147483647))
    }
    function onFocus() {
      checkExpiry()
      if (getPharmacistAccessToken() === token) setAttempt(current => current + 1)
    }
    checkExpiry()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [token])

  function handleLogout() {
    setPharmacistAccessToken(null)
    navigate('/pharmacist/login', { replace: true })
  }

  if (!token) return <Navigate to="/pharmacist/login" replace />

  return <main className="min-h-screen bg-[#F6F7FB] text-[#111827]">
    <header className="flex items-center justify-between gap-4 bg-[#475AA2] px-5 py-5 text-white sm:px-8">
      <MedTrailLogo />
      <button type="button" onClick={handleLogout} className="rounded-xl px-4 py-2 text-sm font-medium transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/20">Log out</button>
    </header>
    <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
      {!checked ? <p role="status" aria-live="polite" className="py-12 text-center text-sm text-[#7A8190]">Checking your session...</p>
        : verification.status === 'error' ? <div role="alert" className="flex flex-col items-center gap-3 py-12 text-sm">
          <p className="text-[#E5484D]">{verification.error}</p>
          <button type="button" onClick={() => setAttempt(current => current + 1)} className="h-10 rounded-xl bg-[#475AA2] px-4 font-semibold text-white hover:bg-[#3D4F91] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25">Try again</button>
        </div> : <Outlet context={{ pharmacistName: verification.name }} />}
    </div>
  </main>
}
