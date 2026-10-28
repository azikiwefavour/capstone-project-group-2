// Isolated browser-test host. Never imported by application routes or builds.
import { MemoryRouter } from 'react-router-dom'
import { SuperAdminSystemHealthPage } from '../../src/super-admin/SuperAdminSystemHealth.jsx'

export default function SystemHealthHarness({ state }) {
  return <MemoryRouter><SuperAdminSystemHealthPage state={state} /></MemoryRouter>
}
