export function formatDoctorNotificationTime(createdAt, now = Date.now()) {
  const date = new Date(createdAt)
  const elapsed = Math.max(0, now - date.getTime())
  const minutes = Math.floor(elapsed / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  return `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`
}
