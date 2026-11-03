import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import PatientDashboardContent from '../components/PatientDashboardContent'
import { fetchPatientDashboard, completePatientPrescription } from '../api'

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

  async function handleCompletePrescription(prescriptionId) {
    await completePatientPrescription(prescriptionId)
    const updated = await fetchPatientDashboard()
    setData(updated)
  }

  return (
    <PatientDashboardContent
      patientName={data?.patient?.name || patientName}
      prescriptions={data?.prescriptions || null}
      diagnoses={data?.diagnoses || null}
      onCompletePrescription={handleCompletePrescription}
    />
  )
}
