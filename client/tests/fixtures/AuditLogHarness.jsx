// Isolated browser-test host. Never imported by application routes or builds.
import { MemoryRouter } from 'react-router-dom'
import { SuperAdminAuditLogPage } from '../../src/super-admin/SuperAdminAuditLog.jsx'

export default function AuditLogHarness({ state }) {
  return <MemoryRouter><SuperAdminAuditLogPage state={state} /></MemoryRouter>
}
