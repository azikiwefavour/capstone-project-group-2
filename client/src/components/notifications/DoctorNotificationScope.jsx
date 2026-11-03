import { lazy, Suspense } from 'react'
import { useLocation } from 'react-router-dom'
import NotificationProvider from './NotificationProvider'

// Vite removes this branch and the fictional examples from production builds.
const DevelopmentPreview = import.meta.env.DEV
  ? lazy(() => import('../../doctor/previews/DoctorNotificationPreview'))
  : null

export default function DoctorNotificationScope({ verified, children }) {
  const { search } = useLocation()
  const previewRequested = import.meta.env.DEV && verified
    && new URLSearchParams(search).get('notificationPreview') === '1'
  const normal = <NotificationProvider role="doctor">{children}</NotificationProvider>

  return previewRequested
    ? <Suspense fallback={normal}><DevelopmentPreview>{children}</DevelopmentPreview></Suspense>
    : normal
}
