// Internal development-preview model only. Not an assumed backend response contract.
export function summarizePreviewStatistics({ hospitals, pendingApplications, smsSent, whatsappSent, deliveredMessages, patientsOnRecord, liveFacilities }) {
  const unique = [...new Map(hospitals.filter(item => item.facilityType === 'hospital').map(item => [item.id, item])).values()]
  const messagesSent = smsSent + whatsappSent
  return {
    registeredFacilities: unique.filter(item => item.everSubscribed === true).length,
    pendingApplications,
    activeSubscribers: unique.filter(item => item.subscriptionStatus === 'active').length,
    trialSubscriptions: unique.filter(item => item.subscriptionStatus === 'trial').length,
    overdueSubscriptions: unique.filter(item => item.subscriptionStatus === 'overdue').length,
    messagesSent,
    deliveryPercentage: messagesSent > 0 && Number.isFinite(deliveredMessages) && deliveredMessages >= 0 && deliveredMessages <= messagesSent ? deliveredMessages / messagesSent * 100 : null,
    patientsOnRecord,
    liveFacilities,
  }
}

export const formatStatistic = value => Number.isSafeInteger(value) && value >= 0 ? new Intl.NumberFormat('en-NG').format(value) : '—'
