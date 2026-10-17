import { useState } from 'react'
import { Outlet } from 'react-router-dom'

export default function DoctorClarificationRoutes() {
  // Keep selected records in memory, not browser history/storage or URL parameters.
  const [selectedClarification, setSelectedClarification] = useState(null)
  return <Outlet context={{ selectedClarification, setSelectedClarification }} />
}
