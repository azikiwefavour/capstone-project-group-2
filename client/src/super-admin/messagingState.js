// Frontend presentation state only; not an assumed backend response contract.
// Aggregate months, credit, categories, facility usage and logs are independent.
// Each usage allowance is supplied per facility; null explicitly means unlimited.
export function createMessagingState(status = 'unavailable', data) {
  const validStatus = ['unavailable', 'loading', 'ready', 'empty', 'error'].includes(status) ? status : 'unavailable'
  const source = ['ready', 'empty'].includes(validStatus) ? data : undefined
  const list = key => Array.isArray(source?.[key]) ? source[key] : []
  return {
    status: validStatus,
    data: {
      months: list('months'),
      credit: source?.credit ?? null,
      failureExplanation: typeof source?.failureExplanation === 'string' ? source.failureExplanation : null,
      categories: list('categories'),
      usage: list('usage'),
      messageLog: validStatus === 'empty' ? [] : list('messageLog'),
    },
  }
}
