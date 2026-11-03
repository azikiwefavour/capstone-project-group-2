import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { IntegrationsHealthService } from './integrations-health.service';
import { ReviewFacilityDto } from './dto/review-facility.dto';
import { LogPlatformActivityDto } from './dto/log-activity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Super Admin')
@Controller('super-admin')
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly integrationsHealthService: IntegrationsHealthService,
  ) {}

  /**
   * Public Quick Ping for Load Balancers (AWS Route53 / Nginx Health Check)
   */
  @SkipThrottle()
  @Get('health-check')
  @ApiOperation({ summary: 'Quick health-check for load balancers' })
  @ApiResponse({ status: 200, description: 'Server is alive' })
  getQuickHealth() {
    return {
      status: 'UP',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Main Super Admin Unified Dashboard Overview
   * Delivers all metrics, charts, widgets, renewals, integrations, and recent activities
   * in a single high-performance payload for the Super Admin frontend overview page.
   */
  @Get('dashboard')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get unified Super Admin Dashboard overview',
    description:
      'Returns alert banner, MRR with 6-month growth trend, Plan Mix (Starter ₦30k vs Growth ₦70k), 4 headline stat cards, upcoming renewals, live integration statuses, and recent activities.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard aggregate payload matching Figma specifications',
  })
  getDashboardOverview() {
    return this.superAdminService.getDashboardOverview();
  }

  /**
   * Pending Facility Reviews
   * Fetches hospitals and clinics that have registered and submitted certificates/licenses
   * awaiting qualification review and trial approval by the Super Admin.
   */
  @Get('facilities/review')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get facility applications waiting for qualification review',
    description:
      'Returns pending facilities with their CAC numbers, clinical practice license, contact details, and uploaded certificates.',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of pending facility review records',
  })
  getPendingFacilityReviews() {
    return this.superAdminService.getPendingFacilityReviews();
  }

  /**
   * Review Facility Application (Approve or Reject)
   */
  @Post('facilities/:id/review')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Approve or reject a facility application',
    description:
      'Approves hospital for free trial or active plan, sets trial expiry, and records the event in recent platform activities.',
  })
  @ApiResponse({
    status: 200,
    description: 'Approval or rejection confirmation with updated facility status',
  })
  reviewFacility(
    @Param('id') id: string,
    @Body() dto: ReviewFacilityDto,
    @Req() req: any,
  ) {
    return this.superAdminService.reviewFacility(id, dto, req.user);
  }

  /**
   * List All Facilities (with search, status filter, and pagination)
   */
  @Get('facilities')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'List all onboarded facilities across MedTrail' })
  @ApiQuery({ name: 'status', required: false, description: 'pending_review | active | trial | overdue | suspended' })
  @ApiQuery({ name: 'plan', required: false, description: 'Starter Plan | Growth Plan' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by facility name, state, or admin' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getAllFacilities(
    @Query('status') status?: string,
    @Query('plan') plan?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.superAdminService.getAllFacilities({ status, plan, search, page, limit });
  }

  /**
   * Get Single Facility by ID
   */
  @Get('facilities/:id')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get single facility detailed profile' })
  getFacilityById(@Param('id') id: string) {
    return this.superAdminService.getFacilityById(id);
  }

  /**
   * Upcoming Renewals
   * Returns hospitals whose recurring subscription renewals are approaching
   */
  @Get('renewals')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get list of upcoming facility subscription renewals' })
  @ApiQuery({ name: 'plan', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getUpcomingRenewals(
    @Query('plan') plan?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
  ) {
    return this.superAdminService.getUpcomingRenewals({ plan, status, limit });
  }

  /**
   * Subscriptions Overview & Subscribers Table
   * Delivers plan details (Starter vs Growth, Monthly vs Annually, features list),
   * subscriber counts per plan, and searchable, filterable, sortable subscribers list.
   */
  @Get('subscriptions')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get subscription plans and subscribers table',
    description:
      'Returns plans (Starter ₦30k vs Growth ₦70k), features, subscriber counts, and paginated subscribers list with search, filter, and sorting.',
  })
  @ApiQuery({ name: 'cycle', required: false, description: 'Monthly | Annually' })
  @ApiQuery({ name: 'search', required: false, description: 'Search facility, plan, method' })
  @ApiQuery({ name: 'plan', required: false, description: 'Starter | Growth | all' })
  @ApiQuery({ name: 'status', required: false, description: 'paid | past_due | trial | all' })
  @ApiQuery({ name: 'cycleFilter', required: false, description: 'Monthly | Annual | all' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'facility | plan | cycle | amount | nextCharge | method | status' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getSubscriptions(
    @Query('cycle') cycle?: string,
    @Query('search') search?: string,
    @Query('plan') plan?: string,
    @Query('status') status?: string,
    @Query('cycleFilter') cycleFilter?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.superAdminService.getSubscriptionsOverview({
      cycle,
      search,
      plan,
      status,
      cycleFilter,
      sortBy,
      sortOrder,
      page,
      limit,
    });
  }

  /**
   * Payments & Transactions Overview
   * Delivers:
   * - Collected (last 90 days) with percentage comparison
   * - Pending settlement (facilities yet to renew plan for that month)
   * - Failed charges count (with retry schedule notice)
   * - Active payment gateway info (Paystack)
   * - Full filterable, searchable, and sortable transactions table
   */
  @Get('payments')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get Payments overview, metrics, and transactions table',
    description:
      'Returns 90-day collected total, pending settlement, failed charges, and transactions list with search, filter, and pagination.',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search reference, facility, channel, gateway, reason' })
  @ApiQuery({ name: 'status', required: false, description: 'successful | pending | failed | all' })
  @ApiQuery({ name: 'channel', required: false, description: 'Card | Bank Transfer | USSD | all' })
  @ApiQuery({ name: 'gateway', required: false, description: 'Paystack | all' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'date | amount | facility | channel | gateway | status | reference' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getPayments(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('channel') channel?: string,
    @Query('gateway') gateway?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.superAdminService.getPaymentsOverview({
      search,
      status,
      channel,
      gateway,
      sortBy,
      sortOrder,
      page,
      limit,
    });
  }

  /**
   * Export Transactions List as CSV
   * Directly powers the "Export list" button in the Super Admin Payments screen
   */
  @Get('payments/export')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Export payments transaction list as CSV' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'channel', required: false })
  @ApiQuery({ name: 'gateway', required: false })
  async exportPaymentsCsv(
    @Query('search') search: string,
    @Query('status') status: string,
    @Query('channel') channel: string,
    @Query('gateway') gateway: string,
    @Res() res: Response,
  ) {
    const { csv, filename } = await this.superAdminService.exportPaymentsCsv({
      search,
      status,
      channel,
      gateway,
    });

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });

    res.end(csv);
  }

  /**
   * Get single payment transaction details
   */
  @Get('payments/:id')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get details for a specific payment transaction' })
  getPaymentById(@Param('id') id: string) {
    return this.superAdminService.getPaymentById(id);
  }

  /**
   * Retry failed transaction
   */
  @Post('payments/:id/retry')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Schedule or trigger a retry for a failed transaction' })
  retryPayment(@Param('id') id: string) {
    return this.superAdminService.retryPayment(id);
  }

  /**
   * Super Admin Messaging & Termii Analytics Overview
   * Delivers:
   * - Sent in October (3,366 messages, +18% vs September)
   * - Delivery rate (97.6% with WhatsApp 99.1% and SMS 96.4%)
   * - Failed messages (81, mostly DND registered numbers)
   * - Termii credit (₦ 48,000, ~3 weeks at current rate)
   * - Messages breakdown: Staff invites (1,120), Verification codes (640), Prescription details (520)
   * - Hospital message usage: Absolute Health (640/1000), Lifeline Specialist (910/1000), Mercy Cross (640/1000)
   * - Message log table with search, tab filters (All, Failed, Queued), and channel badges
   */
  @Get('messaging')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get messaging analytics, Termii credits, message types, hospital usage, and logs',
    description:
      'Returns 4 stat cards, message breakdown, hospital message usage against 1000 quota, and message logs table with All/Failed/Queued tabs.',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search recipient, facility, message type, content' })
  @ApiQuery({ name: 'tab', required: false, enum: ['all', 'failed', 'queued', 'delivered'] })
  @ApiQuery({ name: 'channel', required: false, enum: ['all', 'Email', 'SMS', 'WhatsApp'] })
  @ApiQuery({ name: 'facility', required: false })
  @ApiQuery({ name: 'messageType', required: false })
  @ApiQuery({ name: 'sortBy', required: false, description: 'time | facility | to | message | channel | status' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMessagingOverview(
    @Query('search') search?: string,
    @Query('tab') tab?: string,
    @Query('channel') channel?: string,
    @Query('facility') facility?: string,
    @Query('messageType') messageType?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.superAdminService.getMessagingOverview({
      search,
      tab,
      channel,
      facility,
      messageType,
      sortBy,
      sortOrder,
      page,
      limit,
    });
  }

  /**
   * Hospital Message Quota & Usage
   * Powers the "View all" link in the Usage card
   */
  @Get('messaging/usage')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get message quota and usage breakdown for all facilities (View all modal)',
  })
  getHospitalMessagingUsage() {
    return this.superAdminService.getHospitalMessagingUsage();
  }

  /**
   * Log an outgoing message event (for testing or external webhook)
   */
  @Post('messaging/log')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Record a message delivery event in the message log' })
  logMessageEvent(@Body() body: any) {
    return this.superAdminService.logMessageEvent(body);
  }

  /**
   * Platform Integrations Health Status
   * Reports availability, latency in milliseconds, uptime %, and operational ratings
   * for Medtrail API, Paystack, Termii SMS, and Termii WhatsApp.
   */
  @Get('integrations')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get live status and latency for all 4 external & internal integrations',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of integration health metrics (operational, degraded, down)',
  })
  getIntegrations() {
    return this.integrationsHealthService.getIntegrationsHealth();
  }

  /**
   * System Health Overview
   * Delivers:
   * - Alert banner: "1 service degraded: Termii SMS. Facilities and Patients may experience delays"
   * - 4 Stat cards: API uptime (99.98%), Response time (182 ms), Webhooks (99.8%), Open incidents (1)
   * - 6 Platform services: Medtrail API, Database, Sign in/OTPs, Paystack, Termii SMS, Termii WhatsApp
   * - Open incidents: "SMS Delays to MTN numbers • Termii SMS • Today, 13:40 • Investigating"
   */
  @Get('system-health')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get full System Health dashboard overview matching Figma specifications',
  })
  @ApiQuery({ name: 'filter', required: false, enum: ['all', 'operational', 'degraded', 'down'] })
  getSystemHealth(@Query('filter') filter?: string) {
    return this.integrationsHealthService.getSystemHealthOverview(filter);
  }

  /**
   * Run System Health Checks Now
   * Directly powers the "Run checks now" button in the Super Admin System Health screen
   */
  @Post('system-health/run-checks')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Execute live diagnostic pings across all 6 platform components now',
  })
  runChecksNow() {
    return this.integrationsHealthService.runChecksNow();
  }

  @Get('system-health/run-checks')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Execute live diagnostic pings (GET shortcut for browser / polling)',
  })
  runChecksNowGet() {
    return this.integrationsHealthService.runChecksNow();
  }

  /**
   * Recent Platform Activities / Audit Log
   */
  @Get('activities')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get paginated recent platform activities' })
  @ApiQuery({ name: 'facility', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getActivities(
    @Query('facility') facility?: string,
    @Query('role') role?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.superAdminService.getPlatformActivities({ facility, role, page, limit });
  }

  /**
   * Log a new platform activity (e.g. system billing event, manual admin action)
   */
  @Post('activities')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Record a new platform audit event' })
  logActivity(@Body() dto: LogPlatformActivityDto) {
    return this.superAdminService.logPlatformActivity(dto);
  }

  /**
   * Real-time Server Strength Indicator & Resource Diagnostic
   */
  @Get('server-strength')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get detailed real-time server strength score & hardware diagnostics',
  })
  @ApiResponse({
    status: 200,
    description: 'Server strength score (0-100), CPU, RAM, and Database latency report',
  })
  getServerStrength() {
    return this.superAdminService.getServerStrength();
  }

  /**
   * Platform-wide Legacy Overview (All Hospitals, Users & System Architecture)
   */
  @Get('overview')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Platform-wide overview across all registered hospitals',
  })
  getPlatformOverview() {
    return this.superAdminService.getPlatformOverview();
  }

  /**
   * Hospital Adoption & Department Frequency Analytics
   */
  @Get('adoption-analytics')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Hospital adoption metrics, department frequency, and revenue trend',
  })
  getAdoptionAnalytics(@Query('period') period?: string) {
    return this.superAdminService.getHospitalAdoptionAnalytics(period);
  }

  /**
   * Export Platform Overview & Audit (.xlsx)
   * Super Admin only. Produces a 6-sheet workbook conforming to the
   * MedTrail Super Admin Export Specification.
   */
  @Get('export/excel')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Export 6-sheet platform overview workbook as .xlsx',
  })
  @ApiResponse({
    status: 200,
    description: 'Binary stream of .xlsx workbook',
  })
  async exportExcel(
    @Query('period') period: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.superAdminService.generateExcelWorkbook(
      period,
      req.user,
    );

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });

    res.end(buffer);
  }
}
