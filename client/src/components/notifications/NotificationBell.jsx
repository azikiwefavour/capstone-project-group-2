import { useCallback, useContext, useId, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import NotificationContext from './NotificationContext'
import NotificationPanel from './NotificationPanel'

function NotificationControl({ role, notifications, unreadCount, markAsRead, markAllAsRead, previewLabel }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const panelId = useId()
  const close = useCallback(restoreFocus => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true })
  }, [])

  return <>
    <button
      ref={triggerRef}
      type="button"
      aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      onClick={() => setOpen(value => !value)}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2E5ED] bg-white text-[#52556C] transition hover:bg-[#F7F8FB] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/15 dark:border-[#2C3852] dark:bg-[#161F30] dark:text-[#94A3B8] dark:hover:bg-[#1E293B]"
    >
      <Bell size={20} strokeWidth={1.8} aria-hidden="true" />
      {unreadCount > 0 && <span data-testid="notification-unread-indicator" aria-hidden="true" className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#E35977] ring-2 ring-white dark:ring-[#161F30]" />}
    </button>
    {open && <NotificationPanel role={role} previewLabel={previewLabel} id={panelId} triggerRef={triggerRef} notifications={notifications} unreadCount={unreadCount} onRead={markAsRead} onReadAll={markAllAsRead} onClose={close} />}
  </>
}

export default function NotificationBell() {
  const state = useContext(NotificationContext)
  return state ? <NotificationControl {...state} /> : null
}
