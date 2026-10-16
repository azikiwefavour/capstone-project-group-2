import { useEffect, useState, useSyncExternalStore } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { getAccessToken, getAuthenticatedRole, getTokenExpiry, setAccessToken, subscribeToSession } from '../auth/session'
import { verifyAdminSession } from '../auth/adminSession'
import AdminSidebar from './components/AdminSidebar'

function AdminLayout() {
  const navigate = useNavigate()
  const token = useSyncExternalStore(subscribeToSession, getAccessToken)
  const [verification, setVerification] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const checked = verification?.token === token && verification?.attempt === attempt
  const adminName = checked && verification.status === 'verified' ? verification.name : (sessionStorage.getItem('medtrailDemoAdminName') || 'Amos')

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    async function checkSession() {
      try {
        const profile = await verifyAdminSession(token, controller.signal)
        if (!controller.signal.aborted && profile && getAccessToken() === token) {
          setVerification({ token, attempt, status: 'verified', name: profile.name })
        }
      } catch (error) {
        if (!controller.signal.aborted && getAccessToken() === token) {
          setVerification({ token, attempt, status: 'error', error: error.message })
        }
      }
    }
    checkSession()
    return () => controller.abort()
  }, [token, attempt])

  useEffect(() => {
    if (!token) return
    let timer
    function checkExpiry() {
      window.clearTimeout(timer)
      const remaining = getTokenExpiry(token) - Date.now()
      if (remaining <= 0) {
        if (getAccessToken() === token || !getAccessToken()) setAccessToken(null)
      } else {
        timer = window.setTimeout(checkExpiry, Math.min(remaining, 2147483647))
      }
    }
    checkExpiry()
    window.addEventListener('focus', checkExpiry)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', checkExpiry)
    }
  }, [token])

  function handleLogout() {
    try {
      sessionStorage.removeItem('medtrailDemoAdminName')
      sessionStorage.removeItem('medtrailUser')
    } catch (_) {}
    setAccessToken(null)
    navigate('/login', { replace: true, state: { selectedRole: 'Admin' } })
  }

  if (!token || (getAuthenticatedRole && getAuthenticatedRole() && getAuthenticatedRole() !== 'admin')) {
    return <Navigate to="/login" replace state={{ selectedRole: 'Admin' }} />
  }

  return (
    <main className="min-h-screen bg-[#F6F7FB] text-[#111827] lg:flex lg:h-screen">
      <AdminSidebar adminName={adminName} onLogout={handleLogout} />
      <section
        data-admin-content
        className="min-h-screen flex-1 px-5 py-6 sm:px-8 lg:min-h-0 lg:overflow-y-auto lg:px-8 lg:py-5 xl:px-10"
      >
        {!checked && token ? (
          <div role="status" aria-live="polite" className="flex min-h-[240px] items-center justify-center text-sm text-[#7A8190]">
            Checking your session...
          </div>
        ) : verification?.status === 'error' ? (
          <div role="alert" className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-sm">
            <p className="text-[#E5484D]">{verification.error}</p>
            <button
              type="button"
              onClick={() => setAttempt((current) => current + 1)}
              className="h-10 rounded-xl bg-[#475AA2] px-4 font-semibold text-white hover:bg-[#3D4F91] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25"
            >
              Try again
            </button>
          </div>
        ) : (
          <Outlet context={{ adminName }} />
        )}
      </section>
    </main>
  )
}

export default AdminLayout
