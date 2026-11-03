// Isolated browser-test host only. Not imported by application routes or builds.
import { MemoryRouter } from 'react-router-dom'
import { SuperAdminFacilitiesPage } from '../../src/super-admin/SuperAdminFacilities.jsx'

export default function FacilitiesHarness({ state }) {
  return <MemoryRouter><SuperAdminFacilitiesPage preview state={state} /></MemoryRouter>
}
