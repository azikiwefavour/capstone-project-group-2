import { useState } from 'react'
import NotificationProvider from '../../components/notifications/NotificationProvider'
import { createPharmacistNotificationExamples } from './pharmacistNotificationExamples'

export default function PharmacistNotificationPreview({ children }) {
  const [examples] = useState(() => createPharmacistNotificationExamples())
  return <NotificationProvider role="pharmacist" initialNotifications={examples} previewLabel="Design preview — fictional notifications">
    {children}
  </NotificationProvider>
}
