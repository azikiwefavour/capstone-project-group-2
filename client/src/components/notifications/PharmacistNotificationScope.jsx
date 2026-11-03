import { lazy, Suspense } from 'react'
import { useLocation } from 'react-router-dom'
import NotificationProvider from './NotificationProvider'

// This import and its fictional records are removed from production builds.
const DevelopmentPreview = import.meta.env.DEV
  ? lazy(() => import('../../pharmacist/previews/PharmacistNotificationPreview'))
  : null

export default function PharmacistNotificationScope({ verified, children }) {
  const { search } = useLocation()
  const previewRequested = import.meta.env.DEV && verified
    && new URLSearchParams(search).get('notificationPreview') === '1'
  const normal = <NotificationProvider role="pharmacist">{children}</NotificationProvider>

  return previewRequested
    ? <Suspense fallback={normal}><DevelopmentPreview>{children}</DevelopmentPreview></Suspense>
    : normal
}
