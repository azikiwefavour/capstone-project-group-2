import { useCallback, useEffect, useMemo, useState } from 'react'
import NotificationContext from './NotificationContext'
import { notificationsForRole } from './notificationModel'
import { getDoctorNotifications } from '../../doctor/api'
import { getPharmacistNotifications } from '../../pharmacist/api'

// State lasts only for this mounted role/account. Layouts key the provider by
// the existing session token so another account cannot inherit its notifications.
// initialNotifications is an injection point for fixtures or future integration.
export default function NotificationProvider({ role, initialNotifications = [], previewLabel = '', children }) {
  const [notifications, setNotifications] = useState(() => notificationsForRole(initialNotifications, role))
  const [readIds, setReadIds] = useState(() => new Set())
  const isPreview = Boolean(previewLabel || (initialNotifications && initialNotifications.length > 0))

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
        setNotifications(normalized)
      } catch {
        // Safe fail: unauthenticated or offline
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

  const value = useMemo(() => ({
    role, notifications, previewLabel, unreadCount: notifications.filter(record => !record.read).length,
    markAsRead, markAllAsRead,
  }), [role, notifications, previewLabel, markAsRead, markAllAsRead])

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}
