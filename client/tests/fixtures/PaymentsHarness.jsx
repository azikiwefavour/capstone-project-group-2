// Isolated browser-test host. Never imported by application routes or builds.
import { MemoryRouter } from 'react-router-dom'
import { SuperAdminPaymentsPage } from '../../src/super-admin/SuperAdminPayments.jsx'

export default function PaymentsHarness({ state }) {
  return <MemoryRouter><SuperAdminPaymentsPage state={state} /></MemoryRouter>
}
