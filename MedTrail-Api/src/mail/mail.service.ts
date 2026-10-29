import { Injectable, Logger, Optional } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { join } from 'node:path';
import {
  MEDTRAIL_LOGO_CID,
  expirationTimeline,
  renderEmailVerificationEmail,
  renderHospitalInvitationEmail,
  renderResetPasswordEmail,
} from './templates/medtrail-email';
import { MessageLog, MessageChannel, MessageStatus, MessageType } from '../super-admin/entities/message-log.entity';

import { existsSync } from 'node:fs';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private mailerService: MailerService,
    @Optional() @InjectDataSource() private readonly dataSource?: DataSource,
  ) {}

  maskEmail(email: string): string {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const [local, domain] = parts;
    if (local.length <= 1) {
      return `${local}****@${domain}`;
    }
    const firstTwo = local.slice(0, 2);
    const lastChar = local.length > 2 ? local.slice(-1) : '';
    return `${firstTwo}****${lastChar}@${domain}`;
  }

  private async recordMessageLog(params: {
    recipient: string;
    facilityName?: string | null;
    messageType: string;
    content?: string;
    status: MessageStatus;
    failureReason?: string;
  }) {
    if (!this.dataSource) return;
    try {
      const repo = this.dataSource.getRepository(MessageLog);
      const log = repo.create({
        facilityName: params.facilityName || 'MedTrail Platform',
        recipient: params.recipient,
        recipientMasked: this.maskEmail(params.recipient),
        messageType: params.messageType,
        content: params.content,
        channel: MessageChannel.EMAIL,
        status: params.status,
        provider: 'SMTP / Gmail',
        failureReason: params.failureReason,
      });
      await repo.save(log);
    } catch (err: any) {
      this.logger.warn(`Failed to persist email message log: ${err?.message || err}`);
    }
  }

  private logoAttachments() {
    const candidatePaths = [
      join(__dirname, 'assets', 'medtrail-logo.png'),
      join(__dirname, '..', 'assets', 'medtrail-logo.png'),
      join(process.cwd(), 'src', 'mail', 'assets', 'medtrail-logo.png'),
      join(process.cwd(), 'dist', 'mail', 'assets', 'medtrail-logo.png'),
    ];
    const validPath = candidatePaths.find((p) => {
      try {
        return existsSync(p);
      } catch {
        return false;
      }
    });

    if (!validPath) return [];

    return [
      {
        filename: 'medtrail-logo.png',
        path: validPath,
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
    const html = renderEmailVerificationEmail({
      name,
      role,
      verificationCode: otp,
      expirationTimeline: expirationTimeline(expiresAt),
    });
    const attachments = this.logoAttachments();

    try {
      await this.mailerService.sendMail({
        to,
        subject: 'MedTrail – Verify Your Email',
        html,
        attachments: attachments.length ? attachments : undefined,
      });
      this.logger.log(`Verification email sent to ${to}`);
      await this.recordMessageLog({
        recipient: to,
        facilityName: 'MedTrail Platform',
        messageType: MessageType.VERIFICATION_CODE,
        content: `Verification code sent to ${name || to}`,
        status: MessageStatus.DELIVERED,
      });
    } catch (err: any) {
      this.logger.error(`Failed to send verification email with attachments to ${to}: ${err?.message || err}`);
      try {
        await this.mailerService.sendMail({
          to,
          subject: 'MedTrail – Verify Your Email',
          html,
        });
        this.logger.log(`Verification email sent to ${to} (fallback without attachments)`);
        await this.recordMessageLog({
          recipient: to,
          facilityName: 'MedTrail Platform',
          messageType: MessageType.VERIFICATION_CODE,
          content: `Verification code sent to ${name || to}`,
          status: MessageStatus.DELIVERED,
        });
      } catch (fallbackErr: any) {
        this.logger.error(`Verification email fallback failed for ${to}: ${fallbackErr?.message || fallbackErr}`);
        await this.recordMessageLog({
          recipient: to,
          facilityName: 'MedTrail Platform',
          messageType: MessageType.VERIFICATION_CODE,
          content: `Verification code failed for ${name || to}`,
          status: MessageStatus.FAILED,
          failureReason: fallbackErr?.message || String(fallbackErr),
        });
      }
    }
  }

  async sendPasswordResetOtp(
    to: string,
    name: string,
    otp: string,
    expiresAt: Date,
    role?: string | null,
  ): Promise<void> {
    const html = renderResetPasswordEmail({
      name,
      role,
      resetCode: otp,
      expirationTimeline: expirationTimeline(expiresAt),
    });
    const attachments = this.logoAttachments();

    try {
      await this.mailerService.sendMail({
        to,
        subject: 'MedTrail – Reset Your Password',
        html,
        attachments: attachments.length ? attachments : undefined,
      });
      this.logger.log(`Password reset email sent to ${to}`);
      await this.recordMessageLog({
        recipient: to,
        facilityName: 'MedTrail Platform',
        messageType: MessageType.VERIFICATION_CODE,
        content: `Password reset code sent to ${name || to}`,
        status: MessageStatus.DELIVERED,
      });
    } catch (err: any) {
      this.logger.error(`Failed to send password reset email with attachments to ${to}: ${err?.message || err}`);
      try {
        await this.mailerService.sendMail({
          to,
          subject: 'MedTrail – Reset Your Password',
          html,
        });
        this.logger.log(`Password reset email sent to ${to} (fallback without attachments)`);
        await this.recordMessageLog({
          recipient: to,
          facilityName: 'MedTrail Platform',
          messageType: MessageType.VERIFICATION_CODE,
          content: `Password reset code sent to ${name || to}`,
          status: MessageStatus.DELIVERED,
        });
      } catch (fallbackErr: any) {
        this.logger.error(`Password reset email fallback failed for ${to}: ${fallbackErr?.message || fallbackErr}`);
        await this.recordMessageLog({
          recipient: to,
          facilityName: 'MedTrail Platform',
          messageType: MessageType.VERIFICATION_CODE,
          content: `Password reset code failed for ${name || to}`,
          status: MessageStatus.FAILED,
          failureReason: fallbackErr?.message || String(fallbackErr),
        });
      }
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

    const html = renderHospitalInvitationEmail({
      name,
      role,
      hospitalName,
      invitationUrl: invitationLink,
      expirationTimeline: expirationTimeline(expiresAt),
    });
    const attachments = this.logoAttachments();

    try {
      await this.mailerService.sendMail({
        to,
        subject:
          roleLower === 'patient'
            ? 'MedTrail – Complete Your Patient Registration'
            : `MedTrail – You've been invited as a ${roleFull}`,
        html,
        attachments: attachments.length ? attachments : undefined,
      });
      this.logger.log(`Invitation email sent to ${to}`);
      await this.recordMessageLog({
        recipient: to,
        facilityName: hospitalName?.trim() || 'MedTrail Platform',
        messageType: MessageType.STAFF_INVITE,
        content: `Staff invitation sent as ${roleFull} for ${hospitalName || 'MedTrail'}`,
        status: MessageStatus.DELIVERED,
      });
    } catch (err: any) {
      this.logger.error(`Failed to send invitation email with attachments to ${to}: ${err?.message || err}`);
      try {
        await this.mailerService.sendMail({
          to,
          subject:
            roleLower === 'patient'
              ? 'MedTrail – Complete Your Patient Registration'
              : `MedTrail – You've been invited as a ${roleFull}`,
          html,
        });
        this.logger.log(`Invitation email sent to ${to} (fallback without attachments)`);
        await this.recordMessageLog({
          recipient: to,
          facilityName: hospitalName?.trim() || 'MedTrail Platform',
          messageType: MessageType.STAFF_INVITE,
          content: `Staff invitation sent as ${roleFull} for ${hospitalName || 'MedTrail'}`,
          status: MessageStatus.DELIVERED,
        });
      } catch (fallbackErr: any) {
        this.logger.error(`Invitation email fallback failed for ${to}: ${fallbackErr?.message || fallbackErr}`);
        await this.recordMessageLog({
          recipient: to,
          facilityName: hospitalName?.trim() || 'MedTrail Platform',
          messageType: MessageType.STAFF_INVITE,
          content: `Staff invitation failed for ${name || to}`,
          status: MessageStatus.FAILED,
          failureReason: fallbackErr?.message || String(fallbackErr),
        });
      }
    }
  }
}
