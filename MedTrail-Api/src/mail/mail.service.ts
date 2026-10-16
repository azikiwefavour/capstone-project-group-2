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

  /**
   * Send invitation email to a doctor or pharmacist added by an admin.
   * The link embeds a secure token that the user clicks to complete their registration.
   */
  async sendInvitationEmail(
    to: string,
    name: string,
    role: string,
    invitationLink: string,
  ): Promise<void> {
    this.logger.log(`📨 [DEV/TEST] Invitation Link for ${to} (${role}):\n👉 ${invitationLink}`);

    const roleLower = (role || '').toLowerCase();
    const cleanName = name.replace(/^(dr\.?|pharm\.?)\s+/i, '');
    const roleLabel =
      roleLower === 'doctor' ? 'Dr.' : roleLower === 'pharmacist' ? 'Pharm.' : '';
    const roleFull =
      roleLower === 'doctor'
        ? 'Doctor'
        : roleLower === 'pharmacist'
        ? 'Pharmacist'
        : 'Patient';
    const accentColor =
      roleLower === 'doctor'
        ? '#475AA2'
        : roleLower === 'pharmacist'
        ? '#B83F5C'
        : '#2F7D59';

    const greetingName = roleLabel ? `${roleLabel} ${cleanName}` : cleanName;
    const invitationIntro =
      roleLower === 'patient'
        ? `You've been registered by your healthcare administrator to join MedTrail as a <strong style="color:${accentColor};">Patient</strong>.`
        : `You've been invited by your administrator to join MedTrail as a <strong style="color:${accentColor};">${roleFull}</strong>.`;

    try {
      await this.mailerService.sendMail({
        to,
        subject:
          roleLower === 'patient'
            ? 'MedTrail – Complete Your Patient Registration'
            : `MedTrail – You've been invited as a ${roleFull}`,
        html: `
          <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:auto;background:#ffffff;border:1px solid #e2e5ed;border-radius:16px;overflow:hidden;">
            <!-- Header -->
            <div style="background:${accentColor};padding:32px 24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">med<span style="opacity:0.8;">trail</span></h1>
              <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:13px;">One medication record, from prescription to patient</p>
            </div>

            <!-- Body -->
            <div style="padding:36px 32px;">
              <h2 style="color:#111827;font-size:20px;margin:0 0 8px;">Welcome to MedTrail, ${greetingName}!</h2>
              <p style="color:#6B7280;line-height:1.6;margin:0 0 24px;">
                ${invitationIntro}
                Click the button below to complete your account setup and create your password.
              </p>

              <!-- CTA Button -->
              <div style="text-align:center;margin:32px 0;">
                <a href="${invitationLink}"
                   style="display:inline-block;background:${accentColor};color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
                  Complete Registration
                </a>
              </div>

              <p style="color:#9CA3AF;font-size:13px;line-height:1.5;margin:0 0 8px;">
                This invitation link expires in <strong>48 hours</strong>. If you did not expect this email, you can safely ignore it.
              </p>
              <p style="color:#9CA3AF;font-size:12px;word-break:break-all;">
                Or copy this link: <a href="${invitationLink}" style="color:${accentColor};">${invitationLink}</a>
              </p>
            </div>

            <!-- Footer -->
            <div style="background:#F9FAFB;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="color:#9CA3AF;font-size:12px;margin:0;">© ${new Date().getFullYear()} MedTrail. All rights reserved.</p>
            </div>
          </div>
        `,
      });
      this.logger.log(`✅ Invitation email sent to ${to}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send invitation email to ${to}`, error);
    }
  }
}
