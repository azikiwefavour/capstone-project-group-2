import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { SuperAdminMessagingPage } from './SuperAdminMessaging.jsx'
import { messagingMonths } from './messagingModel.js'

export default function SuperAdminMessagingPreview() {
  const [referenceDate, setReferenceDate] = useState(() => new Date())
  useEffect(() => {
    const refresh = () => setReferenceDate(previous => {
      const next = new Date()
      return messagingMonths(previous).currentKey === messagingMonths(next).currentKey ? previous : next
    })
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [])
  if (!import.meta.env.DEV || !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) return <Navigate to="/super-admin/login" replace />
  return <SuperAdminMessagingPage preview referenceDate={referenceDate} />
}
