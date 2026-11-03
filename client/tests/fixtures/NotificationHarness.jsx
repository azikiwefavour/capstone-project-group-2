// Isolated browser-test host; never imported by application routes.
import { useState } from 'react'
import AdminHeader from '../../src/admin/components/AdminHeader'
import NotificationProvider from '../../src/components/notifications/NotificationProvider'
import { notificationDemoData } from './notificationDemoData'
import { createDoctorNotificationExamples } from '../../src/doctor/previews/doctorNotificationExamples'
import { createPharmacistNotificationExamples } from '../../src/pharmacist/previews/pharmacistNotificationExamples'

export default function NotificationHarness({ longList = false, doctorDesign = false, doctorOverflow = false, doctorAdditionalCount = 3, pharmacistDesign = false, pharmacistOverflow = false, pharmacistAdditionalCount = 3 }) {
  const [account, setAccount] = useState('demo')
  const [doctorExamples] = useState(() => createDoctorNotificationExamples())
  const [pharmacistExamples] = useState(() => createPharmacistNotificationExamples())
  const records = longList ? Array.from({ length: 30 }, (_, index) => ({
    ...notificationDemoData[0], id: `demo-long-${index}`, title: `DEMO ${index}: ${'Long interface text '.repeat(8)}`,
  })) : notificationDemoData

  const examplesFor = (examples, role, overflow, count) => [
    ...examples,
    ...(overflow ? Array.from({ length: count }, (_, index) => ({ ...examples[4], id: `${role}-design-extra-${index}`, title: `DEMO: additional notification ${index + 1}` })) : []),
  ]
  const recordsByRole = {
    admin: records,
    doctor: doctorDesign ? examplesFor(doctorExamples, 'doctor', doctorOverflow, doctorAdditionalCount) : records,
    pharmacist: pharmacistDesign ? examplesFor(pharmacistExamples, 'pharmacist', pharmacistOverflow, pharmacistAdditionalCount) : records,
  }

  return <div className="min-h-screen bg-[#F6F7FB] p-5 text-[#111827]">
    <h1 className="mb-6 text-xl font-bold">Notification demo fixtures — interface tests only</h1>
    {['admin', 'doctor', 'pharmacist'].map(role => (
      <section key={role} aria-label={`${role} demo notifications`} className="mb-8 rounded-2xl border border-[#E2E5ED] bg-white p-4">
        <NotificationProvider role={role} key={`${role}:${account}`} previewLabel={(doctorDesign && role === 'doctor') || (pharmacistDesign && role === 'pharmacist') ? 'Design preview — fictional notifications' : ''} initialNotifications={account === 'demo' ? recordsByRole[role] : []}>
          <AdminHeader adminName={`${role} demo`} />
        </NotificationProvider>
      </section>
    ))}
    <button type="button" className="mr-4 rounded-lg border p-2" onClick={() => setAccount('empty')}>Switch demo account</button>
    <button type="button" className="rounded-lg border p-2">Outside notification panel</button>
  </div>
}
