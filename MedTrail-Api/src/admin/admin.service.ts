import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { Activity } from '../doctor/entities/activity.entity';
import { UserRole } from '../users/entities/user.entity';

function formatActivityDate(date: Date): string {
  if (!date) return '';
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${month}/${day}/${year}`;
}

function formatActivityTime(date: Date): string {
  if (!date) return '';
  const d = new Date(date);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Activity)
    private readonly activityRepo: Repository<Activity>,
    private usersService: UsersService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  private getFrontendUrl(): string {
    const configured = this.configService.get<string>('FRONTEND_URL');
    if (configured && configured.trim() !== '') {
      return configured.replace(/\/+$/, '');
    }
    return process.env.NODE_ENV === 'production'
      ? 'https://medtrail-client.onrender.com'
      : 'http://localhost:5173';
  }

  // ─── Dashboard Stats ──────────────────────────────────────────────────────

  async getDashboardStats(adminId?: string) {
    if (!adminId) {
      return {
        totalUsers: 0,
        byRole: {},
        verified: 0,
        unverified: 0,
        invitedPending: 0,
        invitedAccepted: 0,
        recentActivities: [],
      };
    }

    const admin = await this.usersService.findById(adminId);
    if (!admin) {
      return {
        totalUsers: 0,
        byRole: {},
        verified: 0,
        unverified: 0,
        invitedPending: 0,
        invitedAccepted: 0,
        recentActivities: [],
      };
    }

    const hospitalLower = admin.hospitalName?.trim().toLowerCase();
    const allUsers = await this.usersService.findAll();

    const users = allUsers.filter((u) => {
      if (hospitalLower) {
        return (
          (u.hospitalName && u.hospitalName.trim().toLowerCase() === hospitalLower) ||
          u.id === adminId
        );
      }
      return u.id === adminId || (u.invitedBy && u.invitedBy.includes(adminId));
    });

    const total = users.length;
    const byRole = users.reduce(
      (acc, u) => {
        if (u.role) acc[u.role] = (acc[u.role] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const verified = users.filter((u) => u.isEmailVerified).length;
    const pending = users.filter((u) => u.invitationStatus === 'pending').length;
    const accepted = users.filter((u) => u.invitationStatus === 'accepted').length;

    // Fetch hospital recent activities
    const recentActivitiesRaw = await this.activityRepo.find({
      where: hospitalLower ? { hospitalName: ILike(admin.hospitalName?.trim() || '%') } : {},
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const recentActivities = recentActivitiesRaw.map((a) => {
      const dateStr = formatActivityDate(a.createdAt);
      const timeStr = formatActivityTime(a.createdAt);
      return {
        id: a.id,
        when: `${dateStr}, ${timeStr}`,
        date: dateStr,
        time: timeStr,
        who: a.actorName,
        actorName: a.actorName,
        actorRole: a.actorRole,
        event: a.description,
        description: a.description,
        patient: a.targetPatientName || '-',
        targetPatientName: a.targetPatientName,
        actionType: a.actionType,
        createdAt: a.createdAt,
      };
    });

    return {
      totalUsers: total,
      byRole,
      verified,
      unverified: total - verified,
      invitedPending: pending,
      invitedAccepted: accepted,
      recentActivities,
    };
  }

  // ─── Get All Users ────────────────────────────────────────────────────────

  async getAllUsers(adminId?: string) {
    if (!adminId) return [];

    const admin = await this.usersService.findById(adminId);
    if (!admin) return [];

    const hospitalLower = admin.hospitalName?.trim().toLowerCase();
    const allUsers = await this.usersService.findAll();

    return allUsers.filter((u) => {
      if (hospitalLower) {
        return (
          (u.hospitalName && u.hospitalName.trim().toLowerCase() === hospitalLower) ||
          u.id === adminId
        );
      }
      return u.id === adminId || (u.invitedBy && u.invitedBy.includes(adminId));
    });
  }

  // ─── Get Invited Users (admin pending list) ───────────────────────────────

  async getInvitedUsers(adminId?: string) {
    if (!adminId) return [];

    const admin = await this.usersService.findById(adminId);
    if (!admin) return [];

    const hospitalLower = admin.hospitalName?.trim().toLowerCase();
    const allInvited = await this.usersService.findAllInvited();

    const users = allInvited.filter((u) => {
      if (hospitalLower) {
        return u.hospitalName && u.hospitalName.trim().toLowerCase() === hospitalLower;
      }
      return u.invitedBy && u.invitedBy.includes(adminId);
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.invitedRole,
      hospitalName: u.hospitalName,
      phone: u.phone,
      invitationStatus: u.invitationStatus,
      invitedBy: u.invitedBy,
      createdAt: u.createdAt,
    }));
  }

  // ─── Invite User ──────────────────────────────────────────────────────────

  async inviteUser(dto: InviteUserDto, adminId: string, adminName: string) {
    // 1. Check for duplicate email
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(
        `A user with the email "${dto.email}" already exists. Please use a different email address.`,
      );
    }

    // Resolve hospital name from DTO or the logged-in admin's hospital
    const adminUser = adminId ? await this.usersService.findById(adminId) : null;
    const resolvedHospital = dto.hospitalName || adminUser?.hospitalName || null;

    // 2. Generate a secure invitation token (UUID) and set 48h expiry
    const token = randomUUID();
    const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    // 3. Create the user record in a "pending" state (no password yet)
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      phone: dto.phone ?? null,
      hospitalName: resolvedHospital,
      gender: dto.gender ?? null,
      age: dto.age ?? null,
      password: null,           // No password until they complete registration
      role: dto.role,
      invitedRole: dto.role,
      isInvited: true,
      invitationStatus: 'pending',
      invitationToken: token,
      invitationTokenExpiry: expiry,
      isEmailVerified: false,
      invitedBy: `${adminName} (${adminId})`,
    });

    // 4. Build the invitation links
    const port = process.env.PORT ?? 3000;
    const browserDirectUrl = `http://localhost:${port}/api/auth/accept-invite?token=${token}`;
    const frontendUrl = this.getFrontendUrl();
    const frontendInviteUrl = `${frontendUrl}/accept-invite?token=${token}`;

    // 5. Send the invitation email with the frontend link
    await this.mailService.sendInvitationEmail(
      user.email,
      user.name,
      dto.role,
      frontendInviteUrl,
      user.hospitalName,
      expiry,
    );

    const cleanRole = dto.role ? dto.role.charAt(0).toUpperCase() + dto.role.slice(1).toLowerCase() : 'User';
    try {
      const activity = this.activityRepo.create({
        hospitalName: resolvedHospital || 'General Hospital',
        actorName: adminName,
        actorRole: 'admin',
        description: `${adminName} invited ${user.name} as ${cleanRole}`,
        actionType: 'invited',
        targetPatientName: dto.role === UserRole.PATIENT ? user.name : null,
      });
      await this.activityRepo.save(activity);
    } catch (err: any) {
      this.logger.warn(`Failed to log admin invite activity: ${err.message}`);
    }

    this.logger.log(`Invitation created for ${user.email} (${dto.role})`);

    return {
      message: `Invitation sent successfully to ${user.email}. The account is pending activation.`,
      invitationToken: token,
      invitationLink: browserDirectUrl,
      browserInviteUrl: browserDirectUrl,
      frontendInviteUrl: frontendInviteUrl,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: dto.role,
        invitationStatus: 'pending',
      },
    };
  }

  // ─── Resend Invitation ────────────────────────────────────────────────────

  async resendInvitation(userId: string, adminName: string, adminId?: string) {
    const user = await this.usersService.findById(userId, true);
    if (!user) throw new NotFoundException('User not found');

    if (adminId) {
      const admin = await this.usersService.findById(adminId);
      const adminHospital = admin?.hospitalName?.trim().toLowerCase();
      const userHospital = user.hospitalName?.trim().toLowerCase();
      if (adminHospital && userHospital && adminHospital !== userHospital) {
        throw new NotFoundException('User not found in your hospital');
      }
    }

    if (user.invitationStatus === 'accepted') {
      throw new ConflictException('This user has already accepted their invitation and completed registration.');
    }

    // Regenerate token & expiry
    const token = randomUUID();
    const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await this.usersService.updateById(userId, {
      invitationToken: token,
      invitationTokenExpiry: expiry,
      invitationStatus: 'pending',
    });

    const port = process.env.PORT ?? 3000;
    const browserDirectUrl = `http://localhost:${port}/api/auth/accept-invite?token=${token}`;
    const frontendUrl = this.getFrontendUrl();
    const frontendInviteUrl = `${frontendUrl}/accept-invite?token=${token}`;

    await this.mailService.sendInvitationEmail(
      user.email,
      user.name,
      user.invitedRole ?? user.role ?? '',
      frontendInviteUrl,
      user.hospitalName,
      expiry,
    );

    try {
      const cleanRole = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase() : 'User';
      const activity = this.activityRepo.create({
        hospitalName: user.hospitalName || 'General Hospital',
        actorName: adminName,
        actorRole: 'admin',
        description: `${adminName} resent invitation to ${user.name} (${cleanRole})`,
        actionType: 'invited',
        targetPatientName: user.role === UserRole.PATIENT ? user.name : null,
      });
      await this.activityRepo.save(activity);
    } catch (err: any) {
      this.logger.warn(`Failed to log admin resend invite activity: ${err.message}`);
    }

    this.logger.log(`Invitation resent by ${adminName} to ${user.email}`);

    return {
      message: `Invitation resent to ${user.email} successfully.`,
      invitationToken: token,
      invitationLink: browserDirectUrl,
      browserInviteUrl: browserDirectUrl,
      frontendInviteUrl: frontendInviteUrl,
    };
  }

  // ─── Remove User ──────────────────────────────────────────────────────────

  async removeUser(id: string, adminId?: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('User not found');

    let adminName = 'Admin';
    if (adminId) {
      const admin = await this.usersService.findById(adminId);
      if (admin) adminName = admin.name || admin.email;
      const adminHospital = admin?.hospitalName?.trim().toLowerCase();
      const userHospital = user.hospitalName?.trim().toLowerCase();
      if (adminHospital && userHospital && adminHospital !== userHospital) {
        throw new NotFoundException('User not found in your hospital');
      }
    }

    try {
      const cleanRole = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase() : 'User';
      const activity = this.activityRepo.create({
        hospitalName: user.hospitalName || 'General Hospital',
        actorName: adminName,
        actorRole: 'admin',
        description: `${adminName} removed account for ${user.name} (${cleanRole})`,
        actionType: 'deleted',
        targetPatientName: user.role === UserRole.PATIENT ? user.name : null,
      });
      await this.activityRepo.save(activity);
    } catch (err: any) {
      this.logger.warn(`Failed to log admin remove user activity: ${err.message}`);
    }

    await this.usersService.remove(id);
    return { message: 'User deleted successfully' };
  }

  // ─── Hospital Audit Log ───────────────────────────────────────────────────

  async getAuditLog(adminId?: string, query?: AuditLogQueryDto) {
    if (!adminId) {
      return query?.paginate === 'true'
        ? { data: [], records: [], total: 0, page: 1, limit: 50, totalPages: 1 }
        : [];
    }

    const admin = await this.usersService.findById(adminId);
    if (!admin) {
      return query?.paginate === 'true'
        ? { data: [], records: [], total: 0, page: 1, limit: 50, totalPages: 1 }
        : [];
    }

    const hospitalName = admin.hospitalName?.trim() || 'General Hospital';

    const qb = this.activityRepo
      .createQueryBuilder('a')
      .where('LOWER(a.hospitalName) = LOWER(:hospitalName)', { hospitalName });

    if (query?.search && query.search.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(a.description) LIKE :term OR LOWER(a.actorName) LIKE :term OR LOWER(COALESCE(a.targetPatientName, \'\')) LIKE :term OR LOWER(COALESCE(a.actionType, \'\')) LIKE :term)',
        { term },
      );
    }

    const filterVal = (query?.actionType || query?.filter || '').trim().toLowerCase();
    if (filterVal && filterVal !== 'all') {
      qb.andWhere(
        '(LOWER(COALESCE(a.actionType, \'\')) LIKE :filterVal OR LOWER(a.description) LIKE :filterVal)',
        { filterVal: `%${filterVal}%` },
      );
    }

    switch (query?.sortBy) {
      case 'Oldest':
        qb.orderBy('a.createdAt', 'ASC');
        break;
      case 'Who':
        qb.orderBy('a.actorName', 'ASC');
        break;
      case 'Event':
        qb.orderBy('a.description', 'ASC');
        break;
      case 'Patient':
        qb.orderBy('a.targetPatientName', 'ASC');
        break;
      default:
        qb.orderBy('a.createdAt', 'DESC');
        break;
    }

    const page = Math.max(1, Number(query?.page) || 1);
    const limit = query?.limit ? Math.max(1, Number(query.limit)) : 50;

    if (query?.paginate === 'true' || query?.page) {
      qb.skip((page - 1) * limit).take(limit);
    }

    const [activities, total] = await qb.getManyAndCount();

    const formatted = activities.map((a) => {
      const dateStr = formatActivityDate(a.createdAt);
      const timeStr = formatActivityTime(a.createdAt);
      return {
        id: a.id,
        when: `${dateStr}, ${timeStr}`,
        date: dateStr,
        time: timeStr,
        who: a.actorName,
        actorName: a.actorName,
        actorRole: a.actorRole,
        event: a.description,
        description: a.description,
        patient: a.targetPatientName || '-',
        targetPatientName: a.targetPatientName,
        actionType: a.actionType,
        hospitalName: a.hospitalName,
        createdAt: a.createdAt,
      };
    });

    if (query?.paginate === 'true') {
      return {
        data: formatted,
        records: formatted,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }

    return formatted;
  }
}

