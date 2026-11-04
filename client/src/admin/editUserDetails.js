// Only these display fields may be edited. Role and identifiers are never payload fields.
export function getUserEdits(user, draft) {
  const values = Object.fromEntries(['name', 'email', 'phone'].map(field => [field, String(draft[field] ?? '').trim()]))
  const errors = {}
  if (!values.name) errors.name = 'Enter a name.'
  else if (values.name.length > 255) errors.name = 'Use 255 characters or fewer.'
  if (!values.email && user.email) errors.email = 'Enter an email address.'
  else if (values.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) || values.email.length > 255)) {
    errors.email = 'Enter a valid email address.'
  }
  if (values.phone && (!/^\+?[\d\s().-]+$/.test(values.phone) || !/^\d{7,15}$/.test(values.phone.replace(/\D/g, '')) || values.phone.length > 50)) {
    errors.phone = 'Enter a valid phone number with 7–15 digits, including the country code where applicable.'
  }
  const changes = Object.fromEntries(Object.entries(values).filter(([field, value]) => value !== (user[field] || '')))
  return { values, changes, errors }
}
