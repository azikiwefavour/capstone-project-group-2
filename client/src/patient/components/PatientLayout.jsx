import { useEffect, useState, useSyncExternalStore } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import MedTrailLogo from '../../admin/components/MedTrailLogo'
import DoctorIcon from '../../doctor/components/DoctorIcon'
import LogoutConfirmationModal from '../../components/LogoutConfirmationModal'
import { getTokenExpiry } from '../../auth/session'
import { getPatientAccessToken, setPatientAccessToken, subscribeToPatientSession, verifyPatientSession } from '../../auth/patientSession'

export default function PatientLayout() {
  const navigate = useNavigate()
  const token = useSyncExternalStore(subscribeToPatientSession, getPatientAccessToken)
  const [verification, setVerification] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const checked = Boolean(token && verification?.token === token && verification?.attempt === attempt)

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    verifyPatientSession(token, controller.signal).then(profile => {
      if (!controller.signal.aborted && profile && getPatientAccessToken() === token) {
        setVerification({ token, attempt, status: 'verified', name: profile.name })
      }
    }).catch(error => {
      if (!controller.signal.aborted && getPatientAccessToken() === token) {
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
        if (getPatientAccessToken() === token || !getPatientAccessToken()) setPatientAccessToken(null)
      } else timer = window.setTimeout(checkExpiry, Math.min(remaining, 2147483647))
    }
    function onFocus() {
      checkExpiry()
      if (getPatientAccessToken() === token) setAttempt(current => current + 1)
    }
    checkExpiry()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [token])

  function handleLogout() {
    setPatientAccessToken(null)
    navigate('/patient/login', { replace: true })
  }

  if (!token) return <Navigate to="/patient/login" replace />

  return <main className="min-h-screen bg-[#F6F7FB] text-[#111827] lg:flex lg:min-h-dvh lg:flex-col">
    <header className="bg-[#475AA2] text-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:max-w-[1440px] lg:px-6">
      <MedTrailLogo />
      <button type="button" onClick={() => setLogoutOpen(true)} aria-haspopup="dialog" className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/20"><DoctorIcon type="logout" />Log out</button>
    </div></header>
    {logoutOpen && <LogoutConfirmationModal onClose={() => setLogoutOpen(false)} onConfirm={handleLogout} />}
    <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:w-full lg:max-w-[1440px] lg:flex-1 lg:px-6 lg:pt-6 lg:pb-[22px]">
      {!checked ? <p role="status" aria-live="polite" className="py-12 text-center text-sm text-[#7A8190]">Checking your session...</p>
        : verification.status === 'error' ? <div role="alert" className="flex flex-col items-center gap-3 py-12 text-sm">
          <p className="text-[#E5484D]">{verification.error}</p>
          <button type="button" onClick={() => setAttempt(current => current + 1)} className="h-10 rounded-xl bg-[#475AA2] px-4 font-semibold text-white hover:bg-[#3D4F91] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25">Try again</button>
        </div> : <Outlet context={{ patientName: verification.name }} />}
    </div>
  </main>
}
