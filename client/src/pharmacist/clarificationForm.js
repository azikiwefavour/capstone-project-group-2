export const clarificationConcerns = ['Dose', 'Frequency', 'Duration', 'Possible duplicate', 'Other']

export function validateClarification({ concern, notes } = {}) {
  const errors = {}
  if (!clarificationConcerns.includes(concern)) errors.concern = 'Choose a concern.'
  if (typeof notes !== 'string' || notes.trim().length < 10 || !/\p{L}/u.test(notes)) {
    errors.notes = 'Explain what needs clarification using at least 10 characters.'
  } else if (notes.length > 200) errors.notes = 'Keep notes within 200 characters.'
  return errors
}
