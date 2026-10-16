import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { InviteUserDto } from './dto/invite-user.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
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
    let users = await this.usersService.findAll();
    if (adminId) {
      const admin = await this.usersService.findById(adminId);
      if (admin?.hospitalName) {
        const hospitalLower = admin.hospitalName.trim().toLowerCase();
        users = users.filter(
          (u) =>
            (u.hospitalName && u.hospitalName.trim().toLowerCase() === hospitalLower) ||
            u.id === adminId ||
            (u.invitedBy && u.invitedBy.includes(adminId)),
        );
      }
    }

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

    return {
      totalUsers: total,
      byRole,
      verified,
      unverified: total - verified,
      invitedPending: pending,
      invitedAccepted: accepted,
    };
  }

  // ─── Get All Users ────────────────────────────────────────────────────────

  async getAllUsers(adminId?: string) {
    let users = await this.usersService.findAll();
    if (adminId) {
      const admin = await this.usersService.findById(adminId);
      if (admin?.hospitalName) {
        const hospitalLower = admin.hospitalName.trim().toLowerCase();
        users = users.filter(
          (u) =>
            (u.hospitalName && u.hospitalName.trim().toLowerCase() === hospitalLower) ||
            u.id === adminId ||
            (u.invitedBy && u.invitedBy.includes(adminId)),
        );
      }
    }
    return users;
  }

  // ─── Get Invited Users (admin pending list) ───────────────────────────────

  async getInvitedUsers(adminId?: string) {
    let users = await this.usersService.findAllInvited();
    if (adminId) {
      const admin = await this.usersService.findById(adminId);
      if (admin?.hospitalName) {
        const hospitalLower = admin.hospitalName.trim().toLowerCase();
        users = users.filter(
          (u) =>
            (u.hospitalName && u.hospitalName.trim().toLowerCase() === hospitalLower) ||
            (u.invitedBy && u.invitedBy.includes(adminId)),
        );
      }
    }
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
    );

    this.logger.log(
      `\n═══════════════════════════════════════════════════════════════════════════════\n` +
      `📧 [INVITATION CREATED] Role: ${dto.role} | Email: ${user.email}\n` +
      `👉 Frontend Invite Link:\n   ${frontendInviteUrl}\n` +
      `👉 Browser Direct Link:\n   ${browserDirectUrl}\n` +
      `═══════════════════════════════════════════════════════════════════════════════`,
    );

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

  async resendInvitation(userId: string, adminName: string) {
    const user = await this.usersService.findById(userId, true);
    if (!user) throw new NotFoundException('User not found');

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
      user.invitedRole ?? 'doctor',
      frontendInviteUrl,
    );

    this.logger.log(
      `\n═══════════════════════════════════════════════════════════════════════════════\n` +
      `📧 [INVITATION RESENT] By Admin: ${adminName} to ${user.email}\n` +
      `👉 Frontend Invite Link:\n   ${frontendInviteUrl}\n` +
      `👉 Browser Direct Link:\n   ${browserDirectUrl}\n` +
      `═══════════════════════════════════════════════════════════════════════════════`,
    );

    return {
      message: `Invitation resent to ${user.email} successfully.`,
      invitationToken: token,
      invitationLink: browserDirectUrl,
      browserInviteUrl: browserDirectUrl,
      frontendInviteUrl: frontendInviteUrl,
    };
  }

  // ─── Remove User ──────────────────────────────────────────────────────────

  async removeUser(id: string) {
    await this.usersService.remove(id);
    return { message: 'User deleted successfully' };
  }
}
