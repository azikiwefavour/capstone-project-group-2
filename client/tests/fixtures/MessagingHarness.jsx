// Isolated browser-test host. Never imported by application routes or builds.
import { MemoryRouter } from 'react-router-dom'
import { SuperAdminMessagingPage } from '../../src/super-admin/SuperAdminMessaging.jsx'

export default function MessagingHarness({ state }) {
  return <MemoryRouter><SuperAdminMessagingPage state={state} referenceDate={new Date('2026-10-27T12:00:00Z')} /></MemoryRouter>
}
