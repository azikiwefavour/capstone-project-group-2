import { degradedServiceAlert } from './systemHealthModel.js'

export default function SystemHealthAlert({ services, alert, status = 'ready', neutral = false, error, onRetry }) {
  const available = ['ready', 'empty'].includes(status)
  const degraded = alert?.message || (available ? degradedServiceAlert(services) : null)
  if (available && !alert && Array.isArray(services) && services.length && services.every(service => service?.status === 'operational')) return null
  const message = status === 'loading' ? 'Loading system health status...' : status === 'error' ? error || 'Unable to load system health status.' : degraded || 'System health status is not available yet.'
  return <div data-system-health-status role={degraded || status === 'error' ? 'alert' : 'status'} className={`mt-3 flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-xs font-medium leading-5 ${neutral && !degraded ? 'bg-[#F6F7FB] text-[#7A8190]' : 'bg-[#FFF4E5] text-[#9A5B13]'}`}>
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="mt-0.5 h-4 w-4 shrink-0"><path d="M12 3 2 21h20L12 3Z M12 9v5 M12 17h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    <p>{message}{status === 'error' && onRetry && <button type="button" onClick={onRetry} className="ml-2 text-[#475AA2] underline">Try again</button>}</p>
  </div>
}
