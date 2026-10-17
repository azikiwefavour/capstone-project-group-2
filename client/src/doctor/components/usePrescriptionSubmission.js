import { useEffect, useRef, useState } from 'react'

export default function usePrescriptionSubmission(onSubmit) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const busy = useRef(false)
  const controller = useRef(null)
  useEffect(() => () => controller.current?.abort(), [])
  async function submit(value) {
    if (busy.current || uncertain || typeof onSubmit !== 'function') return
    busy.current = true
    const current = new AbortController()
    controller.current = current
    setIsSubmitting(true)
    setError('')
    try {
      await onSubmit(value, current.signal)
    } catch (error) {
      if (!current.signal.aborted) {
        setError(error.message || 'Unable to save. Please try again.')
        setUncertain(Boolean(error.saveUncertain))
      }
    } finally {
      busy.current = false
      if (!current.signal.aborted) setIsSubmitting(false)
    }
  }
  return { submit, isSubmitting, error, uncertain, busy, available: typeof onSubmit === 'function' }
}
