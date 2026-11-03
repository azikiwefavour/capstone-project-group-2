import { useState } from 'react'
import NotificationProvider from '../../components/notifications/NotificationProvider'
import { createDoctorNotificationExamples } from './doctorNotificationExamples'

export default function DoctorNotificationPreview({ children }) {
  const [examples] = useState(() => createDoctorNotificationExamples())
  return <NotificationProvider role="doctor" initialNotifications={examples} previewLabel="Design preview — fictional notifications">
    {children}
  </NotificationProvider>
}
