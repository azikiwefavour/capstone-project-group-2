import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell, X } from 'lucide-react'
import NotificationContext from './NotificationContext'
import { notificationsForRole } from './notificationModel'
import { getDoctorNotifications } from '../../doctor/api'
import { getPharmacistNotifications } from '../../pharmacist/api'

// State lasts only for this mounted role/account. Layouts key the provider by
// the existing session token so another account cannot inherit its notifications.
// initialNotifications is an injection point for fixtures or future integration.
export default function NotificationProvider({ role, initialNotifications, previewLabel = '', verified = false, children }) {
  const getDefaultNotifications = () => {
    if (Array.isArray(initialNotifications)) {
      return notificationsForRole(initialNotifications, role)
    }
    return []
  }

  const [notifications, setNotifications] = useState(getDefaultNotifications)
  const [readIds, setReadIds] = useState(() => new Set())
  const [toastNotification, setToastNotification] = useState(null)
  const isInitialMount = useRef(true)
  const previousUnreadIds = useRef(new Set())
  const isPreview = Boolean(previewLabel)

  const markAsRead = useCallback(id => {
    setReadIds(prev => new Set(prev).add(id))
    setNotifications(records => records.map(record => record.id === id ? { ...record, read: true } : record))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(records => {
      setReadIds(new Set(records.map(r => r.id)))
      return records.map(record => record.read ? record : { ...record, read: true })
    })
  }, [])

  useEffect(() => {
    if (!toastNotification) return
    const timer = setTimeout(() => setToastNotification(null), 8000)
    return () => clearTimeout(timer)
  }, [toastNotification])

  useEffect(() => {
    if (isPreview || (role !== 'doctor' && role !== 'pharmacist')) return
    let active = true
    const controller = new AbortController()

    async function fetchLiveNotifications() {
      try {
        let fetched = []
        if (role === 'doctor') {
          fetched = await getDoctorNotifications(controller.signal)
        } else if (role === 'pharmacist') {
          fetched = await getPharmacistNotifications(controller.signal)
        }
        if (!active || !Array.isArray(fetched)) return
        const normalized = notificationsForRole(fetched, role).map(record => ({
          ...record,
          read: record.read || readIds.has(record.id),
        }))
        const unreadList = normalized.filter(record => !record.read)
        const unreadIds = new Set(unreadList.map(r => r.id))
        if (!isInitialMount.current) {
          const newlyArrived = unreadList.find(r => !previousUnreadIds.current.has(r.id))
          if (newlyArrived) {
            setToastNotification(newlyArrived)
          }
        } else {
          isInitialMount.current = false
        }
        previousUnreadIds.current = unreadIds
        setNotifications(normalized)
      } catch (err) {
        // Safe fail: unauthenticated, offline, or transient network error
        console.error('Notification fetch error:', err)
      }
    }

    fetchLiveNotifications()
    const timer = setInterval(fetchLiveNotifications, 3000)

    const onRefresh = () => {
      fetchLiveNotifications()
    }
    window.addEventListener('medtrail:notification-refresh', onRefresh)
    window.addEventListener('focus', onRefresh)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchLiveNotifications()
    }
    document.addEventListener('visibilitychange', onVisibility)

    let channel
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('medtrail_notifications')
        channel.onmessage = () => {
          fetchLiveNotifications()
        }
      }
    } catch {}

    return () => {
      active = false
      controller.abort()
      clearInterval(timer)
      window.removeEventListener('medtrail:notification-refresh', onRefresh)
      window.removeEventListener('focus', onRefresh)
      document.removeEventListener('visibilitychange', onVisibility)
      try {
        channel?.close()
      } catch {}
    }
  }, [role, isPreview, readIds])

  useEffect(() => {
    if (verified && !isPreview && (role === 'doctor' || role === 'pharmacist')) {
      window.dispatchEvent(new CustomEvent('medtrail:notification-refresh'))
    }
  }, [verified, isPreview, role])

  const value = useMemo(() => ({
    role, notifications, previewLabel, unreadCount: notifications.filter(record => !record.read).length,
    markAsRead, markAllAsRead,
  }), [role, notifications, previewLabel, markAsRead, markAllAsRead])

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' && toastNotification && createPortal(
        <aside
          role="status"
          aria-live="polite"
          aria-label="New notification"
          className="fixed bottom-5 right-5 z-[9999] flex max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
        >
          <div className="flex w-full items-start gap-3.5 rounded-2xl border border-[#D5D9E8] bg-white p-4 shadow-2xl ring-1 ring-black/5 dark:border-[#2C3852] dark:bg-[#161F30]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0F1FF] text-[#475AA2]">
              <Bell size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#E35977]" />
                <p className="text-sm font-semibold text-[#111827] dark:text-white">
                  {toastNotification.title}
                </p>
              </div>
              <p className="mt-1 text-xs text-[#52556C] dark:text-[#94A3B8]">
                {toastNotification.description}
              </p>
              {toastNotification.patientName && (
                <p className="mt-0.5 text-xs font-medium text-[#475AA2]">
                  Patient: {toastNotification.patientName}
                </p>
              )}
              {toastNotification.prescriptionId && (
                <button
                  type="button"
                  onClick={() => {
                    const targetUrl = role === 'doctor'
                      ? `/doctor/clarifications/${encodeURIComponent(toastNotification.prescriptionId)}`
                      : `/pharmacist/verification-queue/${encodeURIComponent(toastNotification.prescriptionId)}`
                    markAsRead(toastNotification.id)
                    setToastNotification(null)
                    window.location.assign(targetUrl)
                  }}
                  className="mt-2.5 inline-flex items-center rounded-lg bg-[#475AA2] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#394982] transition"
                >
                  Review now →
                </button>
              )}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setToastNotification(null)}
              className="shrink-0 rounded-lg p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <X size={16} />
            </button>
          </div>
        </aside>,
        document.body
      )}
    </NotificationContext.Provider>
  )
}
