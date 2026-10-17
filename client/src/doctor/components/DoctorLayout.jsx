import { useEffect, useState, useSyncExternalStore } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import AdminHeader from '../../admin/components/AdminHeader'
import { getDoctorAccessToken, setDoctorAccessToken, subscribeToDoctorSession, verifyDoctorSession } from '../../auth/doctorSession'
import { getTokenExpiry } from '../../auth/session'
import { endDoctorPreviewSession } from '../previewAuth'
import DoctorSidebar from './DoctorSidebar'

function DoctorLayout({ view = 'overview', background = 'default', children }) {
  const navigate = useNavigate()
  const token = useSyncExternalStore(subscribeToDoctorSession, getDoctorAccessToken)
  const [verification, setVerification] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const checked = Boolean(token && verification?.token === token && verification?.attempt === attempt)
  const name = checked && verification.status === 'verified' ? verification.name.trim() : ''
  const doctorName = name ? `Dr ${name.replace(/^Dr\.?\s+/i, '')}` : ''

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    verifyDoctorSession(token, controller.signal).then(profile => {
      if (!controller.signal.aborted && profile && getDoctorAccessToken() === token) setVerification({ token, attempt, status: 'verified', name: profile.name })
    }).catch(error => {
      if (!controller.signal.aborted && getDoctorAccessToken() === token) setVerification({ token, attempt, status: 'error', error: error.message })
    })
    return () => controller.abort()
  }, [token, attempt])

  useEffect(() => {
    if (!token) return
    let timer
    const checkExpiry = () => {
      window.clearTimeout(timer)
      const remaining = getTokenExpiry(token) - Date.now()
      if (remaining <= 0) {
        if (getDoctorAccessToken() === token || !getDoctorAccessToken()) setDoctorAccessToken(null)
      } else timer = window.setTimeout(checkExpiry, Math.min(remaining, 2147483647))
    }
    const onFocus = () => { checkExpiry(); if (getDoctorAccessToken() === token) setAttempt(current => current + 1) }
    checkExpiry()
    window.addEventListener('focus', onFocus)
    return () => { window.clearTimeout(timer); window.removeEventListener('focus', onFocus) }
  }, [token])

  function handleLogout() {
    setDoctorAccessToken(null)
    endDoctorPreviewSession()
    navigate('/doctor/login', { replace: true })
  }

  if (!token) return <Navigate to="/doctor/login" replace />

  return (
    <main className={`min-h-screen ${background === 'white' ? 'bg-white' : 'bg-[#F6F7FB]'} text-[#111827] lg:flex lg:h-screen`}>
      <DoctorSidebar doctorName={doctorName} view={view} onLogout={handleLogout} />
      <section className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:min-h-0 lg:overflow-y-auto lg:px-8 lg:py-5 xl:px-10">
        <div className="mx-auto max-w-7xl">
          <AdminHeader adminName={doctorName} />
          {!checked ? <div role="status" aria-live="polite" className="flex min-h-[240px] items-center justify-center text-sm text-[#7A8190]">Checking your session...</div>
            : verification.status === 'error' ? <div role="alert" className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-sm">
              <p className="text-[#E5484D]">{verification.error}</p>
              <button type="button" onClick={() => setAttempt(current => current + 1)} className="h-10 rounded-xl bg-[#475AA2] px-4 font-semibold text-white hover:bg-[#3D4F91] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25">Try again</button>
            </div> : children}
          <div className="h-4 lg:hidden" />
        </div>
      </section>
    </main>
  )
}

export default DoctorLayout
