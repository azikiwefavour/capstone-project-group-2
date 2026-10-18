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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

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
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const otp = this.generateOtp();
    const expiry = this.otpExpiry();

    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      phone: dto.phone,
      hospitalName: dto.hospitalName,
      password: hashedPassword,
      role: UserRole.ADMIN,
      emailOtp: otp,
      emailOtpExpiry: expiry,
      isEmailVerified: false,
      isInvited: false,
    });

    await this.mailService.sendEmailVerificationOtp(user.email, user.name, otp, expiry, user.role);
    this.logger.log(`New account registered: ${user.email}`);

    return {
      message: 'Account created. A 6-digit verification code has been sent to your email.',
      email: user.email,
    };
  }

  // ─── Verify Email OTP ─────────────────────────────────────────────────────

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.usersService.findByEmail(dto.email, true);
    if (!user) throw new NotFoundException('No account found with this email');

    if (user.isEmailVerified) {
      return { message: 'Email is already verified. Please log in.' };
    }

    if (!user.emailOtp || user.emailOtp !== dto.otp) {
      throw new BadRequestException('Invalid verification code');
    }

    if (!user.emailOtpExpiry || new Date() > user.emailOtpExpiry) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    await this.usersService.updateById(String(user.id), {
      isEmailVerified: true,
      emailOtp: null,
      emailOtpExpiry: null,
    });

    this.logger.log(`Email verified: ${user.email}`);
    return { message: 'Email verified successfully. You can now log in.' };
  }

  // ─── Resend Email OTP ─────────────────────────────────────────────────────

  async resendEmailOtp(email: string) {
    const user = await this.usersService.findByEmail(email, true);
    if (!user) throw new NotFoundException('No account found with this email');
    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const otp = this.generateOtp();
    const expiry = this.otpExpiry();
    await this.usersService.updateById(String(user.id), {
      emailOtp: otp,
      emailOtpExpiry: expiry,
    });

    await this.mailService.sendEmailVerificationOtp(user.email, user.name, otp, expiry, user.role);

    return { message: 'A new verification code has been sent to your email.' };
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email, true);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Invited users who haven't completed registration have no password yet
    if (!user.password || user.invitationStatus === 'pending') {
      throw new UnauthorizedException(
        'Please complete your registration first by clicking the invitation link sent to your email.',
      );
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in. Check your inbox for the verification code.',
      );
    }

    // Strict Role Enforcement
    if (user.role === UserRole.ADMIN && dto.role !== UserRole.ADMIN) {
      throw new UnauthorizedException(
        'Administrator accounts can only log in as Admin. You cannot log in as a doctor, pharmacist, or patient.',
      );
    }

    if (user.role && user.role !== UserRole.ADMIN && dto.role === UserRole.ADMIN) {
      throw new UnauthorizedException(
        `Access denied. Your account is registered as a ${user.role}, not an administrator.`,
      );
    }

    if (user.role && user.role !== dto.role) {
      throw new UnauthorizedException(
        `Your account is registered as a ${user.role}. Please select the ${user.role} role to log in.`,
      );
    }

    if (!user.role) {
      if (dto.role === UserRole.ADMIN) {
        throw new UnauthorizedException(
          'Access denied. This account does not have administrator privileges.',
        );
      }
      await this.usersService.updateById(String(user.id), { role: dto.role });
      user.role = dto.role;
    }

    const token = this.signToken({
      sub: String(user.id),
      email: user.email,
      role: dto.role,
    });

    this.logger.log(`Login success: ${user.email} as ${dto.role}`);

    return {
      message: 'Login successful',
      accessToken: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: dto.role,
        hospitalName: user.hospitalName,
        phone: user.phone,
      },
    };
  }

  // ─── Forgot Password ──────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
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

    await this.mailService.sendPasswordResetOtp(user.email, user.name, otp, expiry, user.role);
    this.logger.log(`Password reset OTP sent to: ${user.email}`);

    return { message: 'If an account exists with this email, a reset code has been sent.' };
  }

  // ─── Verify Reset Code ────────────────────────────────────────────────────

  async verifyResetCode(dto: VerifyResetCodeDto) {
    const user = await this.usersService.findByEmail(dto.email, true);
    if (!user) throw new NotFoundException('No account found with this email');

    if (!user.resetPasswordOtp || user.resetPasswordOtp !== dto.otp) {
      throw new BadRequestException('Invalid reset code');
    }

    if (!user.resetPasswordOtpExpiry || new Date() > user.resetPasswordOtpExpiry) {
      throw new BadRequestException('Reset code has expired. Please request a new one.');
    }

    return { message: 'Reset code verified. You can now set a new password.' };
  }

  // ─── Reset Password ───────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email, true);
    if (!user) throw new NotFoundException('No account found with this email');

    if (!user.resetPasswordOtp || user.resetPasswordOtp !== dto.otp) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    if (!user.resetPasswordOtpExpiry || new Date() > user.resetPasswordOtpExpiry) {
      throw new BadRequestException('Reset code has expired. Please request a new one.');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
    await this.usersService.updateById(String(user.id), {
      password: hashedPassword,
      resetPasswordOtp: null,
      resetPasswordOtpExpiry: null,
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
    const user = await this.usersService.findByInvitationToken(token);

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
    return user;
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
