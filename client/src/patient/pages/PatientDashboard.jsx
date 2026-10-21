import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import PatientDashboardContent from '../components/PatientDashboardContent'
import { fetchPatientDashboard } from '../api'

export default function PatientDashboard() {
  const { patientName } = useOutletContext()
  const [data, setData] = useState(null)
  const [, setLoading] = useState(true)
  const [, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetchPatientDashboard(controller.signal)
      .then(res => {
        if (!controller.signal.aborted) {
          setData(res)
          setLoading(false)
        }
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  return (
    <PatientDashboardContent
      patientName={data?.patient?.name || patientName}
      prescriptions={data?.prescriptions || null}
      diagnoses={data?.diagnoses || null}
    />
  )
}
