import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../users/entities/user.entity';
import { SubscriptionService } from './subscription.service';

@ApiTags('Admin')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  // ── GET /api/admin/dashboard ─────────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard stats (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns user counts by role, invite stats, etc.' })
  @ApiResponse({ status: 403, description: 'Forbidden – admin only' })
  getDashboard(
    @CurrentUser() admin: { sub: string; email: string; name?: string },
  ) {
    return this.adminService.getDashboardStats(admin?.sub);
  }

  // ── GET /api/admin/audit-log ─────────────────────────────────────────────
  @Get('audit-log')
  @ApiOperation({
    summary: 'Get hospital audit log (admin only)',
    description:
      'Returns all logged clinical and administrative activities for the admin hospital with search, filter, sort, and optional pagination.',
  })
  @ApiResponse({ status: 200, description: 'Array of hospital activity records' })
  @ApiResponse({ status: 403, description: 'Forbidden – admin only' })
  getAuditLog(
    @CurrentUser() admin: { sub: string; email: string; name?: string },
    @Query() query: AuditLogQueryDto,
  ) {
    return this.adminService.getAuditLog(admin?.sub, query);
  }

  // ── GET /api/admin/activities (Alias) ────────────────────────────────────
  @Get('activities')
  @ApiOperation({ summary: 'Get hospital activities (alias for audit-log)' })
  @ApiResponse({ status: 200, description: 'Array of hospital activity records' })
  getActivities(
    @CurrentUser() admin: { sub: string; email: string; name?: string },
    @Query() query: AuditLogQueryDto,
  ) {
    return this.adminService.getAuditLog(admin?.sub, query);
  }

  // ── GET /api/admin/users ─────────────────────────────────────────────────
  @Get('users')
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiResponse({ status: 200, description: 'Array of all users' })
  getAllUsers(
    @CurrentUser() admin: { sub: string; email: string; name?: string },
  ) {
    return this.adminService.getAllUsers(admin?.sub);
  }

  // ── GET /api/admin/invited-users ─────────────────────────────────────────
  @Get('invited-users')
  @ApiOperation({ summary: 'List all invited users with their pending/accepted status (admin only)' })
  @ApiResponse({ status: 200, description: 'Array of invited users with invitationStatus' })
  getInvitedUsers(
    @CurrentUser() admin: { sub: string; email: string; name?: string },
  ) {
    return this.adminService.getInvitedUsers(admin?.sub);
  }

  // ── POST /api/admin/invite-user ──────────────────────────────────────────
  @Post('invite-user')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Invite a new user (doctor or pharmacist) by email',
    description:
      'Creates a pending user record and sends them a branded invitation email with a secure link to complete their registration and set a password.',
  })
  @ApiBody({ type: InviteUserDto })
  @ApiResponse({ status: 201, description: 'Invitation sent – user record created with pending status' })
  @ApiResponse({ status: 400, description: 'Validation error (missing fields, invalid email/role)' })
  @ApiResponse({ status: 403, description: 'Forbidden – admin only' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  inviteUser(
    @Body() dto: InviteUserDto,
    @CurrentUser() admin: { sub: string; email: string; name?: string },
  ) {
    return this.adminService.inviteUser(dto, admin.sub, admin.name ?? admin.email);
  }

  // ── POST /api/admin/resend-invitation/:id ─────────────────────────────────
  @Post('resend-invitation/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend an invitation email to a pending user',
    description: 'Generates a fresh token and resends the invitation email. Only works if the user is still in pending status.',
  })
  @ApiResponse({ status: 200, description: 'Invitation resent successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'User has already accepted their invitation' })
  resendInvitation(
    @Param('id') id: string,
    @CurrentUser() admin: { sub: string; email: string; name?: string },
  ) {
    return this.adminService.resendInvitation(id, admin.name ?? admin.email, admin.sub);
  }

  // ── DELETE /api/admin/users/:id ──────────────────────────────────────────
  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete a user (admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  removeUser(
    @Param('id') id: string,
    @CurrentUser() admin: { sub: string; email: string; name?: string },
  ) {
    return this.adminService.removeUser(id, admin?.sub);
  }

  // ── GET /api/admin/subscription/pricing ──────────────────────────────────
  @Public()
  @Get('subscription/pricing')
  @ApiOperation({ summary: 'Get non-editable plan pricing and Paystack fee' })
  getPlanPricing(
    @Query('plan') plan: string,
    @Query('billingCycle') billingCycle?: string,
  ) {
    return this.subscriptionService.calculatePlanPricing(plan, billingCycle);
  }

  // ── POST /api/admin/subscription/initialize ──────────────────────────────
  @Public()
  @Post('subscription/initialize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initialize Paystack payment for hospital plan' })
  initializeSubscriptionPayment(
    @Body() body: { plan: string; billingCycle?: string; email?: string; callbackUrl?: string },
    @CurrentUser() admin?: { email: string },
  ) {
    const userEmail = admin?.email || body.email;
    if (!userEmail) {
      throw new BadRequestException('User email is required');
    }
    return this.subscriptionService.initializePayment(
      userEmail,
      body.plan,
      body.billingCycle,
      body.callbackUrl,
    );
  }

  // ── POST /api/admin/subscription/verify ──────────────────────────────────
  @Public()
  @Post('subscription/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Paystack payment and activate subscription' })
  verifySubscriptionPayment(
    @Body() body: { reference: string; plan: string; billingCycle?: string; email?: string },
    @CurrentUser() admin?: { email: string },
  ) {
    const userEmail = admin?.email || body.email;
    if (!userEmail) {
      throw new BadRequestException('User email is required');
    }
    return this.subscriptionService.verifyPayment(
      userEmail,
      body.reference,
      body.plan,
      body.billingCycle,
    );
  }

  // ── POST /api/admin/subscription/free-trial ──────────────────────────────
  @Public()
  @Post('subscription/free-trial')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate 7-day free trial for hospital facility' })
  activateFreeTrial(
    @Body() body: { email?: string },
    @CurrentUser() admin?: { email: string },
  ) {
    const userEmail = admin?.email || body.email;
    if (!userEmail) {
      throw new BadRequestException('User email is required');
    }
    return this.subscriptionService.activateFreeTrial(userEmail);
  }
}
