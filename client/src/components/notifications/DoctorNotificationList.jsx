import { Pill } from 'lucide-react'
import NotificationCardList from './NotificationCardList'

export default function DoctorNotificationList(props) {
  return <NotificationCardList {...props} icon={Pill} unreadIconClassName="text-[#E35977]" unreadIndicatorTestId="doctor-notification-unread" />
}
