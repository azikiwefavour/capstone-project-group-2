import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { join } from 'node:path';
import {
  MEDTRAIL_LOGO_CID,
  expirationTimeline,
  renderEmailVerificationEmail,
  renderHospitalInvitationEmail,
  renderResetPasswordEmail,
} from './templates/medtrail-email';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private mailerService: MailerService) {}

  private logoAttachments() {
    return [
      {
        filename: 'medtrail-logo.png',
        path: join(__dirname, 'assets', 'medtrail-logo.png'),
        cid: MEDTRAIL_LOGO_CID,
        contentType: 'image/png',
        contentDisposition: 'inline' as const,
      },
    ];
  }

  async sendEmailVerificationOtp(
    to: string,
    name: string,
    otp: string,
    expiresAt: Date,
    role?: string | null,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'MedTrail – Verify Your Email',
        html: renderEmailVerificationEmail({
          name,
          role,
          verificationCode: otp,
          expirationTimeline: expirationTimeline(expiresAt),
        }),
        attachments: this.logoAttachments(),
      });
      this.logger.log(`Verification email sent to ${to}`);
    } catch {
      // SMTP errors may contain the message payload; do not log credentials, codes or links.
      this.logger.error('Failed to send verification email');
    }
  }

  async sendPasswordResetOtp(
    to: string,
    name: string,
    otp: string,
    expiresAt: Date,
    role?: string | null,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'MedTrail – Reset Your Password',
        html: renderResetPasswordEmail({
          name,
          role,
          resetCode: otp,
          expirationTimeline: expirationTimeline(expiresAt),
        }),
        attachments: this.logoAttachments(),
      });
      this.logger.log(`Password reset email sent to ${to}`);
    } catch {
      this.logger.error('Failed to send password reset email');
    }
  }

  async sendInvitationEmail(
    to: string,
    name: string,
    role: string,
    invitationLink: string,
    hospitalName: string | null | undefined,
    expiresAt: Date,
  ): Promise<void> {
    const roleLower = (role || '').toLowerCase();
    const roleFull =
      roleLower === 'doctor'
        ? 'Doctor'
        : roleLower === 'pharmacist'
          ? 'Pharmacist'
          : 'Patient';
    try {
      await this.mailerService.sendMail({
        to,
        subject:
          roleLower === 'patient'
            ? 'MedTrail – Complete Your Patient Registration'
            : `MedTrail – You've been invited as a ${roleFull}`,
        html: renderHospitalInvitationEmail({
          name,
          role,
          hospitalName,
          invitationUrl: invitationLink,
          expirationTimeline: expirationTimeline(expiresAt),
        }),
        attachments: this.logoAttachments(),
      });
      this.logger.log(`Invitation email sent to ${to}`);
    } catch {
      this.logger.error('Failed to send invitation email');
    }
  }
}
