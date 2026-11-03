import { useCallback, useMemo, useState } from 'react'
import NotificationContext from './NotificationContext'
import { notificationsForRole } from './notificationModel'

// State lasts only for this mounted role/account. Layouts key the provider by
// the existing session token so another account cannot inherit its notifications.
// initialNotifications is an injection point for fixtures or future integration.
export default function NotificationProvider({ role, initialNotifications = [], previewLabel = '', children }) {
  const [notifications, setNotifications] = useState(() => notificationsForRole(initialNotifications, role))
  const markAsRead = useCallback(id => {
    setNotifications(records => records.map(record => record.id === id ? { ...record, read: true } : record))
  }, [])
  const markAllAsRead = useCallback(() => {
    setNotifications(records => records.map(record => record.read ? record : { ...record, read: true }))
  }, [])
  const value = useMemo(() => ({
    role, notifications, previewLabel, unreadCount: notifications.filter(record => !record.read).length,
    markAsRead, markAllAsRead,
  }), [role, notifications, previewLabel, markAsRead, markAllAsRead])

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}
