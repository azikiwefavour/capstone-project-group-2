import { useEffect, useState, useSyncExternalStore } from 'react'
import { getDoctorAccessToken, subscribeToDoctorSession } from '../auth/doctorSession'

// Call within the verified DoctorLayout content. Visual preview layouts stay API-free.
export default function useDoctorRecords(loadRecords, enabled) {
  const token = useSyncExternalStore(subscribeToDoctorSession, getDoctorAccessToken)
  const [attempt, setAttempt] = useState(0)
  const [snapshot, setSnapshot] = useState(null)
  const checked = snapshot?.token === token && snapshot?.attempt === attempt && snapshot?.loader === loadRecords
  useEffect(() => {
    if (!enabled || !token) return
    const controller = new AbortController()
    loadRecords(controller.signal).then(records => {
      if (!controller.signal.aborted && getDoctorAccessToken() === token) setSnapshot({ token, attempt, loader: loadRecords, records })
    }).catch(error => {
      if (!controller.signal.aborted && error.name !== 'AbortError' && getDoctorAccessToken() === token) setSnapshot({ token, attempt, loader: loadRecords, error: error.message })
    })
    return () => controller.abort()
  }, [enabled, token, attempt, loadRecords])
  return {
    records: enabled && checked ? snapshot.records || [] : [],
    isLoading: enabled && !checked,
    error: enabled && checked ? snapshot.error || '' : '',
    onRetry: () => setAttempt(current => current + 1),
  }
}
