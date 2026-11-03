import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { UserRole } from '../users/entities/user.entity';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Facility, FacilityStatus } from '../super-admin/entities/facility.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
    private configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) { }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private otpExpiry(): Date {
    const minutes = this.configService.get<number>('OTP_EXPIRY_MINUTES') ?? 10;
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  private signToken(payload: { sub: string; email: string; role: UserRole | null }) {
    return this.jwtService.sign(payload);
  }

  // ─── Register ─────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const cleanEmail = dto.email.trim().toLowerCase();
    const existing = await this.usersService.findByEmail(cleanEmail);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const otp = this.generateOtp();
    const expiry = this.otpExpiry();

    const assignedRole = dto.role ?? UserRole.ADMIN;

    const user = await this.usersService.create({
      name: dto.name.trim(),
      email: cleanEmail,
      phone: dto.phone?.trim() ?? null,
      hospitalName: dto.hospitalName?.trim() || 'General Hospital',
      password: hashedPassword,
      role: assignedRole,
      emailOtp: otp,
      emailOtpExpiry: expiry,
      isEmailVerified: false,
      isInvited: false,
    });

    await this.mailService.sendEmailVerificationOtp(user.email, user.name, otp, expiry, user.role);
    this.logger.log(`New account registered: ${user.email} (role: ${user.role || 'admin'})`);

    return {
      message: 'Account created. A 6-digit verification code has been sent to your email.',
      email: user.email,
    };
  }

  // ─── Verify Email OTP ─────────────────────────────────────────────────────

  async verifyEmail(dto: VerifyEmailDto) {
    const cleanEmail = dto.email?.trim().toLowerCase();
    const cleanOtp = dto.otp?.trim();
    const user = await this.usersService.findByEmail(cleanEmail, true);
    if (!user) throw new NotFoundException('No account found with this email');

    if (user.isEmailVerified) {
      const currentRole = user.role || user.invitedRole || (!user.isInvited ? UserRole.ADMIN : UserRole.PATIENT);
      const token = this.signToken({
        sub: String(user.id),
        email: user.email,
        role: currentRole,
      });
      return {
        message: 'Email is already verified.',
        accessToken: token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: currentRole,
          hospitalName: user.hospitalName,
          phone: user.phone,
        },
      };
    }

    const matchesEmail = user.emailOtp && user.emailOtp === cleanOtp;
    const matchesReset = user.resetPasswordOtp && user.resetPasswordOtp === cleanOtp;

    if (!matchesEmail && !matchesReset) {
      throw new BadRequestException('Invalid verification code');
    }

    const expiry = matchesEmail ? user.emailOtpExpiry : user.resetPasswordOtpExpiry;
    if (!expiry || new Date() > expiry) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    const resolvedRole = user.role || user.invitedRole || (!user.isInvited ? UserRole.ADMIN : UserRole.PATIENT);

    await this.usersService.updateById(String(user.id), {
      isEmailVerified: true,
      invitationStatus: user.invitationStatus === 'pending' ? 'accepted' : user.invitationStatus,
      role: resolvedRole,
      emailOtp: null,
      emailOtpExpiry: null,
      resetPasswordOtp: null,
      resetPasswordOtpExpiry: null,
    });

    user.role = resolvedRole;
    user.isEmailVerified = true;

    const token = this.signToken({
      sub: String(user.id),
      email: user.email,
      role: resolvedRole,
    });

    this.logger.log(`Email verified and logged in: ${user.email} (role: ${resolvedRole})`);
    return {
      message: 'Email verified successfully.',
      accessToken: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: resolvedRole,
        hospitalName: user.hospitalName,
        phone: user.phone,
      },
    };
  }

  // ─── Resend Email / Reset OTP ─────────────────────────────────────────────

  async resendEmailOtp(rawEmail: string) {
    if (!rawEmail || typeof rawEmail !== 'string') {
      throw new BadRequestException('Email is required');
    }
    const email = rawEmail.trim().toLowerCase();
    const user = await this.usersService.findByEmail(email, true);
    if (!user) throw new NotFoundException('No account found with this email');

    const otp = this.generateOtp();
    const expiry = this.otpExpiry();

    // If user is already verified, send a fresh password reset code so they are never blocked
    if (user.isEmailVerified) {
      await this.usersService.updateById(String(user.id), {
        resetPasswordOtp: otp,
        resetPasswordOtpExpiry: expiry,
      });

      await this.mailService.sendPasswordResetOtp(user.email, user.name, otp, expiry, user.role);
      this.logger.log(`Fresh reset code resent to verified user: ${user.email}`);
      return { message: 'A new verification code has been sent to your email.' };
    }

    // If user is not yet verified or pending invitation
    await this.usersService.updateById(String(user.id), {
      emailOtp: otp,
      emailOtpExpiry: expiry,
    });

    await this.mailService.sendEmailVerificationOtp(user.email, user.name, otp, expiry, user.role);
    this.logger.log(`Fresh verification code sent to: ${user.email}`);

    return { message: 'A new verification code has been sent to your email.' };
  }

  async resendResetCode(rawEmail: string) {
    if (!rawEmail || typeof rawEmail !== 'string') {
      throw new BadRequestException('Email is required');
    }
    const email = rawEmail.trim().toLowerCase();
    return this.forgotPassword({ email });
  }

  async resendAnyCode(rawEmail: string, type?: 'email' | 'reset') {
    if (type === 'reset') {
      return this.resendResetCode(rawEmail);
    }
    return this.resendEmailOtp(rawEmail);
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const cleanEmail = dto.email?.trim().toLowerCase();
    const user = await this.usersService.findByEmail(cleanEmail, true);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Users with no password yet must set one first
    if (!user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email address before logging in.');
    }

    // Strict Role Enforcement:
    // A user can ONLY log into their assigned role.
    let userRole = user.role || user.invitedRole;

    // Self-registered hospital creator whose role was not yet explicitly populated
    if (!userRole && !user.isInvited) {
      userRole = UserRole.ADMIN;
      await this.usersService.updateById(String(user.id), { role: UserRole.ADMIN });
      user.role = UserRole.ADMIN;
    }

    if (userRole) {
      if (userRole === UserRole.SUPER_ADMIN) {
        if (dto.role && dto.role !== UserRole.ADMIN && dto.role !== UserRole.SUPER_ADMIN) {
          throw new UnauthorizedException('Invalid email or password');
        }
      } else if (userRole === UserRole.ADMIN && dto.role && dto.role !== UserRole.ADMIN) {
        throw new UnauthorizedException('Invalid email or password');
      } else if (userRole !== UserRole.ADMIN && dto.role === UserRole.ADMIN) {
        throw new UnauthorizedException('Invalid email or password');
      } else if (dto.role && userRole !== dto.role) {
        throw new UnauthorizedException('Invalid email or password');
      }
    } else {
      if (dto.role === UserRole.ADMIN) {
        throw new UnauthorizedException('Invalid email or password');
      }
      const initialRole = dto.role || UserRole.PATIENT;
      await this.usersService.updateById(String(user.id), { role: initialRole });
      user.role = initialRole;
    }

    const effectiveRole: UserRole = user.role || user.invitedRole || UserRole.PATIENT;

    let hasPlan = true;
    if (effectiveRole === UserRole.ADMIN) {
      try {
        const facilityRepo = this.dataSource.getRepository(Facility);
        const hospitalName = user.hospitalName?.trim() || '';
        const facility = await facilityRepo.findOne({
          where: [
            { adminEmail: user.email },
            ...(hospitalName ? [{ name: hospitalName }] : []),
          ],
        });
        hasPlan = Boolean(
          facility &&
          (facility.status === FacilityStatus.ACTIVE ||
           facility.status === FacilityStatus.TRIAL)
        );
      } catch (err: any) {
        this.logger.warn(`Could not check facility plan status: ${err.message}`);
        hasPlan = true;
      }
    }

    const token = this.signToken({
      sub: String(user.id),
      email: user.email,
      role: effectiveRole,
    });

    this.logger.log(`Login success: ${user.email} as ${effectiveRole} (hasPlan: ${hasPlan})`);

    return {
      message: 'Login successful',
      accessToken: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: effectiveRole,
        hospitalName: user.hospitalName,
        phone: user.phone,
        hasPlan,
      },
    };
  }

  // ─── Forgot Password ──────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const cleanEmail = dto.email?.trim().toLowerCase();
    const user = await this.usersService.findByEmail(cleanEmail);
    // Always return same message to prevent email enumeration
    if (!user) {
      return { message: 'If an account exists with this email, a reset code has been sent.' };
    }

    const otp = this.generateOtp();
    const expiry = this.otpExpiry();
    await this.usersService.updateById(String(user.id), {
      resetPasswordOtp: otp,
      resetPasswordOtpExpiry: expiry,
    });

    const targetRole = user.role || user.invitedRole;
    await this.mailService.sendPasswordResetOtp(user.email, user.name, otp, expiry, targetRole);
    this.logger.log(`Password reset OTP sent to: ${user.email}`);

    return { message: 'If an account exists with this email, a reset code has been sent.' };
  }

  // ─── Verify Reset Code ────────────────────────────────────────────────────

  async verifyResetCode(dto: VerifyResetCodeDto) {
    const cleanEmail = dto.email?.trim().toLowerCase();
    const cleanOtp = dto.otp?.trim();
    const user = await this.usersService.findByEmail(cleanEmail, true);
    if (!user) throw new NotFoundException('No account found with this email');

    const matchesReset = user.resetPasswordOtp && user.resetPasswordOtp === cleanOtp;
    const matchesEmail = user.emailOtp && user.emailOtp === cleanOtp;

    if (!matchesReset && !matchesEmail) {
      throw new BadRequestException('Invalid reset code');
    }

    const expiry = matchesReset ? user.resetPasswordOtpExpiry : user.emailOtpExpiry;
    if (!expiry || new Date() > expiry) {
      throw new BadRequestException('Reset code has expired. Please request a new one.');
    }

    return { message: 'Reset code verified. You can now set a new password.' };
  }

  // ─── Reset Password ───────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto) {
    const cleanEmail = dto.email?.trim().toLowerCase();
    const cleanOtp = dto.otp?.trim();
    const user = await this.usersService.findByEmail(cleanEmail, true);
    if (!user) throw new NotFoundException('No account found with this email');

    const matchesReset = user.resetPasswordOtp && user.resetPasswordOtp === cleanOtp;
    const matchesEmail = user.emailOtp && user.emailOtp === cleanOtp;

    if (!matchesReset && !matchesEmail) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const expiry = matchesReset ? user.resetPasswordOtpExpiry : user.emailOtpExpiry;
    if (!expiry || new Date() > expiry) {
      throw new BadRequestException('Reset code has expired. Please request a new one.');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
    await this.usersService.updateById(String(user.id), {
      password: hashedPassword,
      isEmailVerified: true,
      invitationStatus: user.invitationStatus === 'pending' ? 'accepted' : user.invitationStatus,
      role: user.role || user.invitedRole,
      resetPasswordOtp: null,
      resetPasswordOtpExpiry: null,
      emailOtp: null,
      emailOtpExpiry: null,
    });

    this.logger.log(`Password reset successfully for: ${user.email}`);
    return { message: 'Password reset successfully. You can now log in with your new password.' };
  }


  // ─── Accept Invite – Validate Token ───────────────────────────────────────

  /**
   * Called when the invited user clicks their email link.
   * Validates the token and returns the user's name + role
   * so the frontend can display the personalised welcome screen.
   */
  async validateInvitationToken(token: string) {
    this.logger.warn(`Validating invitation token: [${token}]`);
    const cleanToken = (token || '').trim();
    const user = await this.usersService.findByInvitationToken(cleanToken);

    if (!user) {
      this.logger.warn(`No user found for invitation token: [${token}] (clean: [${cleanToken}])`);
      throw new BadRequestException('Invalid invitation link. Please contact your administrator.');
    }

    if (!user.invitationTokenExpiry || new Date() > user.invitationTokenExpiry) {
      throw new BadRequestException(
        'This invitation link has expired. Please ask your administrator to send a new one.',
      );
    }

    if (user.invitationStatus === 'accepted') {
      throw new BadRequestException(
        'This invitation has already been used. Please log in instead.',
      );
    }

    this.logger.log(`Invitation token validated for: ${user.email}`);

    return {
      valid: true,
      name: user.name,
      email: user.email,
      role: user.invitedRole,
    };
  }

  // ─── Complete Registration (Set Password) ─────────────────────────────────

  /**
   * Called when the invited user submits their chosen password.
   * Activates the account, clears the token, marks email as verified,
   * and returns a JWT so the user lands directly in their dashboard.
   */
  async completeRegistration(dto: CompleteRegistrationDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match. Please try again.');
    }

    const user = await this.usersService.findByInvitationToken(dto.token);

    if (!user) {
      throw new BadRequestException('Invalid invitation link. Please contact your administrator.');
    }

    if (!user.invitationTokenExpiry || new Date() > user.invitationTokenExpiry) {
      throw new BadRequestException(
        'This invitation link has expired. Please ask your administrator to send a new one.',
      );
    }

    if (user.invitationStatus === 'accepted') {
      throw new BadRequestException(
        'Registration already completed. Please log in with your credentials.',
      );
    }

    // Hash password and activate the account
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    await this.usersService.updateById(String(user.id), {
      password: hashedPassword,
      isEmailVerified: true,        // Invitation confirms email ownership
      invitationStatus: 'accepted',
      invitationToken: null,        // Invalidate the token after use
      invitationTokenExpiry: null,
      role: user.invitedRole,       // Apply the role set by admin
    });

    // Issue a JWT so the user goes straight to their dashboard
    const accessToken = this.signToken({
      sub: String(user.id),
      email: user.email,
      role: user.invitedRole,
    });

    this.logger.log(`Invited user completed registration: ${user.email} as ${user.invitedRole}`);

    return {
      message: 'Registration complete! Welcome to MedTrail.',
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.invitedRole,
        hospitalName: user.hospitalName,
        phone: user.phone,
      },
    };
  }

  // ─── Get Profile ──────────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    let hasPlan = true;
    if (user.role === UserRole.ADMIN) {
      try {
        const facilityRepo = this.dataSource.getRepository(Facility);
        const hospitalName = user.hospitalName?.trim() || '';
        const facility = await facilityRepo.findOne({
          where: [
            { adminEmail: user.email },
            ...(hospitalName ? [{ name: hospitalName }] : []),
          ],
        });
        hasPlan = Boolean(
          facility &&
          (facility.status === FacilityStatus.ACTIVE ||
           facility.status === FacilityStatus.TRIAL)
        );
      } catch {
        hasPlan = true;
      }
    }
    return { ...user, hasPlan };
  }

  // ─── Dev Admin Token (for testing/development) ─────────────────────────────

  async getDevAdminToken() {
    let admin = await this.usersService.findByEmail('admin@medtrail.com');
    if (!admin) {
      admin = await this.usersService.create({
        name: 'Amos',
        email: 'admin@medtrail.com',
        role: UserRole.ADMIN,
        isEmailVerified: true,
        isInvited: false,
      });
    }

    const token = this.signToken({
      sub: String(admin.id),
      email: admin.email,
      role: UserRole.ADMIN,
    });

    return {
      accessToken: token,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: UserRole.ADMIN,
      },
    };
  }
}
