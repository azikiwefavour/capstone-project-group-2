import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private mailerService: MailerService) {}

  async sendEmailVerificationOtp(to: string, name: string, otp: string): Promise<void> {
    this.logger.log(`🔑 [DEV/TEST] Verification OTP for ${to}: ${otp}`);
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'MedTrail – Verify Your Email',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;border:1px solid #e2e5ed;border-radius:12px;">
            <h2 style="color:#475AA2;margin-bottom:8px;">Verify your email</h2>
            <p style="color:#7A8190;">Hi <strong>${name}</strong>, welcome to MedTrail!</p>
            <p style="color:#7A8190;">Enter the code below to verify your email address. It expires in <strong>10 minutes</strong>.</p>
            <div style="font-size:36px;font-weight:700;letter-spacing:12px;text-align:center;padding:24px 0;color:#111827;">${otp}</div>
            <p style="color:#A6ADBA;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error('Failed to send verification email', error);
    }
  }

  async sendPasswordResetOtp(to: string, name: string, otp: string): Promise<void> {
    this.logger.log(`🔑 [DEV/TEST] Password Reset OTP for ${to}: ${otp}`);
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'MedTrail – Reset Your Password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;border:1px solid #e2e5ed;border-radius:12px;">
            <h2 style="color:#475AA2;margin-bottom:8px;">Reset your password</h2>
            <p style="color:#7A8190;">Hi <strong>${name}</strong>,</p>
            <p style="color:#7A8190;">Enter the code below to reset your password. It expires in <strong>10 minutes</strong>.</p>
            <div style="font-size:36px;font-weight:700;letter-spacing:12px;text-align:center;padding:24px 0;color:#111827;">${otp}</div>
            <p style="color:#A6ADBA;font-size:12px;">If you didn't request this, please secure your account immediately.</p>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error('Failed to send password reset email', error);
    }
  }
}
