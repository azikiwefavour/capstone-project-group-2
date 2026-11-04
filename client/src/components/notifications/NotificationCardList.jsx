import { formatDoctorNotificationTime as formatNotificationTime } from './doctorNotificationTime'

export default function NotificationCardList({ id, notifications, onRead, onSelect, icon: Icon, unreadIconClassName, unreadIndicatorTestId }) {
  return <ul id={id} aria-label="Notification list" className="space-y-2 px-4 py-4">
    {notifications.map(notification => {
      const content = <>
        <span aria-hidden="true" className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${notification.read ? 'border border-[#E6E7EC] bg-white text-[#C6C9D3]' : `bg-white ${unreadIconClassName}`}`}>
          <Icon size={22} strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1 pr-2">
          <span className={`block text-[15px] font-semibold leading-6 ${notification.read ? 'text-[#707584]' : 'text-[#475AA2]'}`}>{notification.title}</span>
          <span className={`mt-0.5 block text-sm leading-5 ${notification.read ? 'text-[#707584]' : 'text-[#475AA2]'}`}>{notification.description}</span>
          <time dateTime={notification.createdAt} title={new Date(notification.createdAt).toLocaleString()} className={`mt-2 block text-xs leading-4 ${notification.read ? 'text-[#707584]' : 'text-[#475AA2]'}`}>{formatNotificationTime(notification.createdAt)}</time>
          <span className="sr-only">{notification.read ? 'Read' : 'Unread'}</span>
        </span>
        {!notification.read && <span aria-hidden="true" data-testid={unreadIndicatorTestId} className="absolute right-4 top-4 h-2 w-2 rounded-full bg-[#E35977]" />}
      </>
      const className = `relative flex w-full items-start gap-4 rounded-[20px] p-4 text-left [overflow-wrap:anywhere] ${notification.read ? 'bg-white cursor-pointer hover:bg-[#F9FAFB]' : 'bg-[#F0F1FF] transition hover:bg-[#E8EAFF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/25 cursor-pointer'}`
      return <li key={notification.id}>
        {notification.read ? (
          onSelect ? (
            <button
              type="button"
              className={className}
              aria-label={`View ${notification.title}`}
              onClick={() => onSelect(notification)}
            >
              {content}
            </button>
          ) : (
            <div className={className}>{content}</div>
          )
        ) : (
          <button
            type="button"
            className={className}
            aria-label={`Mark ${notification.title} as read`}
            onClick={() => {
              if (onSelect) onSelect(notification)
              else onRead(notification.id)
            }}
          >
            {content}
          </button>
        )}
      </li>
    })}
  </ul>
}
