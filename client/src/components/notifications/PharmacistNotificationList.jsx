import { Stethoscope } from 'lucide-react'
import NotificationCardList from './NotificationCardList'

export default function PharmacistNotificationList(props) {
  return <NotificationCardList {...props} icon={Stethoscope} unreadIconClassName="text-[#7A8DD5]" unreadIndicatorTestId="pharmacist-notification-unread" />
}
