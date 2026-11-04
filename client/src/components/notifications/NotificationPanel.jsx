import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Bell, X } from 'lucide-react'
import DoctorNotificationList from './DoctorNotificationList'
import PharmacistNotificationList from './PharmacistNotificationList'

const focusStyle = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/25'

export default function NotificationPanel({ role, previewLabel, id, triggerRef, notifications, unreadCount, onRead, onReadAll, onClose }) {
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const [visibleCount, setVisibleCount] = useState(5)
  const hasCardLayout = role === 'doctor' || role === 'pharmacist'
  const NotificationList = role === 'pharmacist' ? PharmacistNotificationList : DoctorNotificationList
  const cardRecords = hasCardLayout ? [...notifications.filter(record => !record.read), ...notifications.filter(record => record.read)] : []
  const hasMore = visibleCount < cardRecords.length
  const navigate = useNavigate()

  function readCardNotification(notificationId) {
    onRead(notificationId)
    closeRef.current?.focus({ preventScroll: true })
  }

  function readAllCardNotifications() {
    onReadAll()
    closeRef.current?.focus({ preventScroll: true })
  }

  function handleSelectCard(notification) {
    readCardNotification(notification.id)
    onClose(false)
    if (notification.prescriptionId && navigate) {
      if (role === 'doctor') {
        const openDialogs = Array.from(document.querySelectorAll('dialog[open]'))
        if (openDialogs.length > 0) {
          const proceed = window.confirm(
            'You currently have an active prescription form open. Would you like to leave this page to review the clarification?'
          )
          if (!proceed) return
        }
        navigate(`/doctor/clarifications/${encodeURIComponent(notification.prescriptionId)}`)
      } else if (role === 'pharmacist') {
        navigate(`/pharmacist/prescriptions/${encodeURIComponent(notification.prescriptionId)}`)
      }
    }
  }

  useLayoutEffect(() => {
    const panel = panelRef.current
    function position() {
      const trigger = triggerRef.current.getBoundingClientRect()
      const { width, height } = panel.getBoundingClientRect()
      const below = trigger.bottom + 8
      const above = trigger.top - height - 8
      if (hasCardLayout) {
        // Prefer an anchored dropdown; shrink the scrollable list to fit below
        // the bell rather than lifting a tall panel over the header.
        const availableBelow = window.innerHeight - below - 16
        const cardMaxHeight = Math.max(0, Math.min(560, window.innerHeight - 100))
        // Keep a readable list below the Pharmacist panel's fixed controls.
        // When its bell is low in the viewport, use the bounded fallback.
        const minimumBelowHeight = role === 'pharmacist' ? 300 : 200
        if (availableBelow >= minimumBelowHeight) {
          panel.style.maxHeight = `${Math.min(cardMaxHeight, availableBelow)}px`
          panel.style.top = `${below}px`
        } else {
          panel.style.maxHeight = `${cardMaxHeight}px`
          const boundedHeight = panel.getBoundingClientRect().height
          panel.style.top = `${Math.max(16, Math.min(below, window.innerHeight - boundedHeight - 16))}px`
        }
        panel.style.left = `${Math.max(16, Math.min(trigger.right - width, window.innerWidth - width - 16))}px`
        return
      }
      const preferred = below + height <= window.innerHeight - 16 ? below : above
      panel.style.left = `${Math.max(16, Math.min(trigger.right - width, window.innerWidth - width - 16))}px`
      panel.style.top = `${Math.max(16, Math.min(preferred, window.innerHeight - height - 16))}px`
    }
    position()
    closeRef.current?.focus({ preventScroll: true })
    const observer = new ResizeObserver(position)
    observer.observe(panel)
    window.addEventListener('resize', position)
    // Role layouts scroll their content independently of the window.
    window.addEventListener('scroll', position, true)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', position)
      window.removeEventListener('scroll', position, true)
    }
  }, [triggerRef, hasCardLayout, role])

  useEffect(() => {
    function outside(event) {
      if (!panelRef.current.contains(event.target) && !triggerRef.current.contains(event.target)) onClose(false)
    }
    function keyboard(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose(true)
      } else if (event.key === 'Tab' && panelRef.current.contains(document.activeElement)) {
        const selector = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
        const controls = [...panelRef.current.querySelectorAll(selector)]
        if (event.shiftKey && document.activeElement === controls[0]) {
          event.preventDefault()
          onClose(true)
        } else if (!event.shiftKey && document.activeElement === controls.at(-1)) {
          // The panel is non-modal. Continue after its trigger in the header,
          // rather than tabbing into browser chrome from the portal's last item.
          event.preventDefault()
          const outsideControls = [...document.querySelectorAll(selector)].filter(element =>
            !panelRef.current.contains(element) && element.getClientRects().length && !element.closest('[inert]'))
          const next = outsideControls[outsideControls.indexOf(triggerRef.current) + 1] || triggerRef.current
          onClose(false)
          next.focus({ preventScroll: true })
        }
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', outside)
    document.addEventListener('keydown', keyboard)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('focusin', outside)
      document.removeEventListener('keydown', keyboard)
    }
  }, [triggerRef, onClose])

  return createPortal(
    <section
      ref={panelRef}
      id={id}
      role="dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-count`}
      className={`fixed z-[80] flex flex-col overflow-hidden border bg-white shadow-xl shadow-[#111827]/10 ${hasCardLayout ? 'rounded-[24px] border-[#E6E7EC] text-[#30313D]' : 'rounded-2xl border-[#E2E5ED] text-[#111827] dark:border-[#2C3852] dark:bg-[#161F30] dark:text-[#F8FAFC]'}`}
      style={{ width: hasCardLayout ? 'min(26rem, calc(100vw - 2rem))' : 'min(24rem, calc(100vw - 2rem))', maxHeight: hasCardLayout ? 'min(560px, calc(100dvh - 100px))' : 'min(32rem, calc(100dvh - 2rem))' }}
    >
      <div className={hasCardLayout ? 'mx-6 flex shrink-0 items-start justify-between gap-3 border-b border-dashed border-[#DCDDE5] py-5' : 'flex shrink-0 items-start justify-between gap-3 border-b border-[#E2E5ED] px-5 py-4 dark:border-[#2C3852]'}>
        <div className={hasCardLayout ? 'min-w-0 flex-1' : undefined}>
          <h2 id={`${id}-title`} className={hasCardLayout ? 'text-lg font-semibold text-[#30313D]' : 'text-base font-semibold'}>Notifications</h2>
          <div className={hasCardLayout ? 'mt-2 flex flex-wrap items-center gap-x-4 gap-y-2' : undefined}>
            <p id={`${id}-count`} role="status" className={hasCardLayout ? 'text-xs text-[#707584]' : 'mt-1 text-xs text-[#7A8190] dark:text-[#94A3B8]'}>{unreadCount} unread</p>
            {hasCardLayout && <button type="button" disabled={unreadCount === 0} onClick={readAllCardNotifications} className={`rounded-md text-xs font-medium text-[#475AA2] disabled:opacity-50 ${focusStyle}`}>Mark all as read</button>}
          </div>
        </div>
        <button ref={closeRef} type="button" aria-label="Close notifications" onClick={() => onClose(true)} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#52556C] hover:bg-[#F7F8FB] ${hasCardLayout ? '' : 'dark:text-[#94A3B8] dark:hover:bg-[#1E293B]'} ${focusStyle}`}>
          <X size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
      {hasCardLayout && previewLabel && <p className="mx-4 mt-3 shrink-0 rounded-lg border border-[#E3E5F5] bg-[#F8F8FF] px-3 py-2 text-xs text-[#475AA2]">{previewLabel}</p>}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {notifications.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-5 py-8 text-center">
            <span className={`flex h-11 w-11 items-center justify-center rounded-full ${hasCardLayout ? 'bg-[#F0F1FF] text-[#475AA2]' : 'bg-[#F1F3FA] text-[#475AA2] dark:bg-[#1E293B] dark:text-[#94A3B8]'}`}><Bell size={20} strokeWidth={1.8} aria-hidden="true" /></span>
            <div><p className="text-sm font-semibold">You're all caught up</p><p className={hasCardLayout ? 'mt-1 text-xs text-[#707584]' : 'mt-1 text-xs text-[#7A8190] dark:text-[#94A3B8]'}>No notifications to show.</p></div>
          </div>
        ) : hasCardLayout ? (
          <NotificationList id={`${id}-list`} notifications={cardRecords.slice(0, visibleCount)} onRead={readCardNotification} onSelect={handleSelectCard} />
        ) : (
          <ul aria-label="Notification list" className="divide-y divide-[#E2E5ED] dark:divide-[#2C3852]">
            {notifications.map(notification => (
              <li key={notification.id}>
                <article className={`break-words px-5 py-4 ${notification.read ? '' : 'bg-[#F7F8FC] dark:bg-[#1E293B]/50'}`}>
                  <h3 className="text-sm font-semibold">{notification.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#52556C] dark:text-[#94A3B8]">{notification.description}</p>
                  <time dateTime={notification.createdAt} className="mt-2 block text-xs text-[#7A8190] dark:text-[#94A3B8]">{new Date(notification.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                    <span className={notification.read ? 'text-[#7A8190] dark:text-[#94A3B8]' : 'font-semibold text-[#475AA2] dark:text-[#A5B4FC]'}>{notification.read ? 'Read' : 'Unread'}</span>
                    {!notification.read && <button type="button" aria-label={`Mark ${notification.title} as read`} onClick={() => { onRead(notification.id); closeRef.current?.focus({ preventScroll: true }) }} className={`rounded-md px-2 py-1 font-semibold text-[#475AA2] hover:bg-[#E8ECF8] dark:text-[#A5B4FC] dark:hover:bg-[#2C3852] ${focusStyle}`}>Mark as read</button>}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
      {hasCardLayout ? notifications.length > 0 && <div className="flex shrink-0 justify-center px-6 pb-5 pt-2">
        <button type="button" disabled={!hasMore} aria-controls={`${id}-list`} onClick={() => {
          setVisibleCount(count => count + 5)
          if (visibleCount + 5 >= cardRecords.length) closeRef.current?.focus({ preventScroll: true })
        }} className={`rounded-xl border border-[#E2E5ED] bg-white px-6 py-2.5 text-sm font-semibold text-[#475AA2] transition hover:bg-[#F0F1FF] disabled:cursor-default disabled:text-[#8B90A0] disabled:hover:bg-white ${focusStyle}`}>Load more</button>
      </div> : <div className="shrink-0 border-t border-[#E2E5ED] px-5 py-3 dark:border-[#2C3852]">
        <button type="button" disabled={unreadCount === 0} onClick={() => { onReadAll(); closeRef.current?.focus({ preventScroll: true }) }} className={`rounded-lg px-2 py-2 text-sm font-semibold text-[#475AA2] hover:bg-[#F7F8FB] disabled:cursor-default disabled:opacity-50 dark:text-[#A5B4FC] dark:hover:bg-[#1E293B] ${focusStyle}`}>Mark all as read</button>
      </div>}
    </section>, document.body,
  )
}
