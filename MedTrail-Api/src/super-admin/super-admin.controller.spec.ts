import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { IntegrationsHealthService } from './integrations-health.service';
import { ReviewAction } from './dto/review-facility.dto';

describe('SuperAdminController', () => {
  let controller: SuperAdminController;
  let service: SuperAdminService;
  let integrationsService: IntegrationsHealthService;

  const mockDashboardData = {
    facilityReviewAlert: {
      pendingCount: 1,
      facilityId: 'fac-1',
      facilityName: 'Royal Bay Clinic',
      message: '1 facility application is waiting for review (Royal Bay Clinic)',
    },
    revenue: {
      mrr: 676667,
      growthPercentage: 7.4,
      comparisonPeriod: 'vs September',
      currency: 'NGN',
      currencySymbol: '₦',
    },
    planMix: {
      totalSubscribers: 10,
      plans: [
        { name: 'Starter Plan', price: 30000, subscribersCount: 2, percentage: 20 },
        { name: 'Growth Plan', price: 70000, subscribersCount: 8, percentage: 80 },
      ],
    },
    stats: {
      registeredFacilities: { total: 8, awaitingReview: 1 },
      activeSubscribers: { total: 4, inTrial: 1, overdue: 2 },
      messagesSent: { total: 3366, delivered: 3285, deliveryPercentage: 97.6 },
      patientsOnRecord: { total: 5638, liveFacilitiesCount: 5 },
    },
  };

  const mockIntegrations = [
    { name: 'Medtrail API', uptimePercent: 99.0, latencyMs: 182, status: 'operational' },
    { name: 'Paystack', uptimePercent: 99.0, latencyMs: 410, status: 'operational' },
    { name: 'Termii SMS', uptimePercent: 99.21, latencyMs: 2.9, status: 'degraded' },
    { name: 'Termii WhatsApp', uptimePercent: 99.21, latencyMs: 640, status: 'operational' },
  ];

  beforeEach(() => {
    service = {
      getDashboardOverview: vi.fn().mockResolvedValue(mockDashboardData),
      getPendingFacilityReviews: vi.fn().mockResolvedValue([]),
      reviewFacility: vi.fn().mockResolvedValue({ success: true }),
      getAllFacilities: vi.fn().mockResolvedValue({ facilities: [], total: 0 }),
      getFacilityById: vi.fn().mockResolvedValue({ id: 'fac-1' }),
      getUpcomingRenewals: vi.fn().mockResolvedValue([]),
      getSubscriptionsOverview: vi.fn().mockResolvedValue({ plans: {}, subscribers: [], pagination: {}, summary: {} }),
      getPaymentsOverview: vi.fn().mockResolvedValue({ summary: {}, gateway: {}, counts: {}, transactions: [], pagination: {} }),
      exportPaymentsCsv: vi.fn().mockResolvedValue({ csv: '', filename: 'test.csv' }),
      getPaymentById: vi.fn().mockResolvedValue({ id: 'tx-1' }),
      retryPayment: vi.fn().mockResolvedValue({ message: 'Retry scheduled' }),
      getMessagingOverview: vi.fn().mockResolvedValue({ summary: {}, provider: {}, messages: {}, usage: {}, counts: {}, logs: [], pagination: {} }),
      getHospitalMessagingUsage: vi.fn().mockResolvedValue({ title: '', quotaPerFacility: 1000, facilities: [] }),
      logMessageEvent: vi.fn().mockResolvedValue({ success: true }),
      getPlatformActivities: vi.fn().mockResolvedValue({ activities: [], total: 0 }),
      logPlatformActivity: vi.fn().mockResolvedValue({ id: 'act-1' }),
      getServerStrength: vi.fn().mockResolvedValue({ serverStrengthScore: 95 }),
      getQuickHealth: vi.fn().mockReturnValue({ status: 'UP' }),
      generateExcelWorkbook: vi.fn().mockResolvedValue({ buffer: Buffer.from(''), filename: 'test.xlsx' }),
    } as any;

    integrationsService = {
      getIntegrationsHealth: vi.fn().mockResolvedValue(mockIntegrations),
      getSystemHealthOverview: vi.fn().mockResolvedValue({
        alert: { hasDegraded: true, message: '1 service degraded: Termii SMS' },
        summary: {},
        platform: [],
        incidents: { items: [] },
      }),
      runChecksNow: vi.fn().mockResolvedValue({
        success: true,
        message: 'Checks completed',
        executionTimeMs: 40,
        health: {},
      }),
    } as any;

    controller = new SuperAdminController(service, integrationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return complete dashboard overview matching Figma specifications', async () => {
    const result = await controller.getDashboardOverview();
    expect(result).toEqual(mockDashboardData);
    expect(result.revenue.mrr).toBe(676667);
    expect(result.planMix.plans[0].name).toBe('Starter Plan');
    expect(result.planMix.plans[0].price).toBe(30000);
    expect(result.planMix.plans[1].name).toBe('Growth Plan');
    expect(result.planMix.plans[1].price).toBe(70000);
    expect(result.stats.registeredFacilities.total).toBe(8);
    expect(result.stats.messagesSent.deliveryPercentage).toBe(97.6);
  });

  it('should return integration statuses with Termii SMS degraded', async () => {
    const integrations = await controller.getIntegrations();
    expect(integrations).toHaveLength(4);
    const sms = integrations.find((i) => i.name === 'Termii SMS');
    expect(sms?.status).toBe('degraded');
  });

  it('should approve facility review application', async () => {
    const req = { user: { name: 'Adekemi', email: 'adekemi@medtrail.ng' } };
    const res = await controller.reviewFacility(
      'fac-1',
      { action: ReviewAction.APPROVE, notes: 'Qualified' },
      req,
    );
    expect(service.reviewFacility).toHaveBeenCalledWith(
      'fac-1',
      { action: ReviewAction.APPROVE, notes: 'Qualified' },
      req.user,
    );
    expect(res).toEqual({ success: true });
  });
});
