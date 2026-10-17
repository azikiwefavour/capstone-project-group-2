// Never guess the timezone of a date-only or timezone-less timestamp, or the units
// of a numeric value. Backend adapters must supply a Date or an ISO timestamp with an offset.
export function formatMedicationTimestamp(value, timeZone) {
  if (!(value instanceof Date) && (typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value))) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  // An omitted timezone uses the browser's local timezone, including daylight saving.
  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h12',
    ...(timeZone ? { timeZone } : {}),
  })
  const parts = Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value]))
  return {
    dateTime: date.toISOString(),
    label: `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute} ${parts.dayPeriod.toUpperCase()}`,
  }
}
