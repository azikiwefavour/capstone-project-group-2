import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
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
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
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
      emailOtp: otp,
      emailOtpExpiry: expiry,
      isEmailVerified: false,
    });

    await this.mailService.sendEmailVerificationOtp(user.email, user.name, otp);

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

    await this.usersService.updateById(String(user._id), {
      isEmailVerified: true,
      emailOtp: null,
      emailOtpExpiry: null,
    });

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
    await this.usersService.updateById(String(user._id), {
      emailOtp: otp,
      emailOtpExpiry: expiry,
    });

    await this.mailService.sendEmailVerificationOtp(user.email, user.name, otp);

    return { message: 'A new verification code has been sent to your email.' };
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email, true);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
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

    // Persist the role if it changed or was not set yet
    if (user.role !== dto.role) {
      await this.usersService.updateById(String(user._id), { role: dto.role });
    }

    const token = this.signToken({
      sub: String(user._id),
      email: user.email,
      role: dto.role,
    });

    return {
      message: 'Login successful',
      accessToken: token,
      user: {
        id: user._id,
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
    await this.usersService.updateById(String(user._id), {
      resetPasswordOtp: otp,
      resetPasswordOtpExpiry: expiry,
    });

    await this.mailService.sendPasswordResetOtp(user.email, user.name, otp);

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
    await this.usersService.updateById(String(user._id), {
      password: hashedPassword,
      resetPasswordOtp: null,
      resetPasswordOtpExpiry: null,
    });

    return { message: 'Password reset successfully. You can now log in with your new password.' };
  }

  // ─── Get Profile ──────────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
