// Isolated test inputs only. Never imported by application routes or builds.
import { averageResponseTime, monitoringPercentage } from '../../src/super-admin/systemHealthModel.js'

export const healthTestData = {
  services: [
    ['medtrail', 'Test API'], ['database', 'Test database'], ['signin', 'Test access'],
    ['paystack', 'Test payments'], ['termii-sms', 'Test SMS'], ['termii-whatsapp', 'Test WhatsApp'],
  ].map(([id, name]) => ({
    id, name, status: id === 'termii-sms' ? 'degraded' : 'operational',
    monitoring: { availableSeconds: 8, totalSeconds: 10 }, responseTimesMs: [10, 20],
    uptimePercentage: monitoringPercentage(8, 10), responseTimeMs: averageResponseTime([10, 20]),
  })),
  summaryDetails: { uptimeTargetPercent: 90, requestsFasterPercent: 75, resolvedThisMonth: 0 },
  webhooks: { successful: 3, totalProcessed: 4 },
  incidents: [{ id: 'test-incident', title: 'Isolated delivery incident', serviceId: 'termii-sms', timestamp: '2027-02-10T10:00:00Z', displayTime: 'Feb 10, 10:00', status: 'Investigating' }],
}
