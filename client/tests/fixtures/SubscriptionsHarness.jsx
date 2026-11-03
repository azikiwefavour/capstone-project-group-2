// Isolated browser-test host. Never imported by application routes or builds.
import { MemoryRouter } from 'react-router-dom'
import { SuperAdminSubscriptionsPage } from '../../src/super-admin/SuperAdminSubscriptions.jsx'

export default function SubscriptionsHarness({ state }) {
  return <MemoryRouter><SuperAdminSubscriptionsPage preview state={state} /></MemoryRouter>
}
