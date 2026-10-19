import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { AdminService } from '../admin/admin.service';
import { UserRole } from '../users/entities/user.entity';

vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('test-hash-not-a-password'),
}));

describe('Existing email workflow data handoff (no database or SMTP)', () => {
  const mail = {
    sendEmailVerificationOtp: vi.fn(),
    sendPasswordResetOtp: vi.fn(),
    sendInvitationEmail: vi.fn(),
  };
  const config = {
    get: vi.fn((key: string) =>
      key === 'OTP_EXPIRY_MINUTES'
        ? 17
        : key === 'FRONTEND_URL'
          ? 'https://example.invalid'
          : undefined,
    ),
  };
  let log: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-18T12:00:00Z'));
    vi.clearAllMocks();
    log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('registration passes its actual saved role, name, OTP and configurable expiry', async () => {
    const users = {
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn(async (data) => ({ ...data, id: 'test-user' })),
    };
    const auth = new AuthService(
      users as never,
      {} as never,
      mail as never,
      config as never,
    );
    await auth.register({
      name: 'Mrs. Jane Johnson',
      email: 'recipient@example.invalid',
      password: 'TestOnly!123',
      phone: '+234123456789',
      hospitalName: 'Testing Hospital',
    });
    const saved = users.create.mock.calls[0][0];
    expect(mail.sendEmailVerificationOtp).toHaveBeenCalledWith(
      saved.email,
      saved.name,
      saved.emailOtp,
      saved.emailOtpExpiry,
      UserRole.ADMIN,
    );
    expect(saved.emailOtp).toMatch(/^\d{6}$/);
    expect(saved.emailOtpExpiry.getTime() - Date.now()).toBe(17 * 60_000);
    expect(JSON.stringify(log.mock.calls)).not.toContain(saved.emailOtp);
  });

  it('verification resend passes the replacement OTP and expiry without changing the verified-account gate', async () => {
    const user = {
      id: 'test-user',
      name: 'Jane Johnson',
      email: 'recipient@example.invalid',
      role: UserRole.ADMIN,
      isEmailVerified: false,
    };
    const users = {
      findByEmail: vi.fn().mockResolvedValue(user),
      updateById: vi.fn(),
    };
    const auth = new AuthService(
      users as never,
      {} as never,
      mail as never,
      config as never,
    );
    await auth.resendEmailOtp(user.email);
    const saved = users.updateById.mock.calls[0][1];
    expect(mail.sendEmailVerificationOtp).toHaveBeenCalledWith(
      user.email,
      user.name,
      saved.emailOtp,
      saved.emailOtpExpiry,
      user.role,
    );
    expect(saved.emailOtpExpiry.getTime() - Date.now()).toBe(17 * 60_000);
    user.isEmailVerified = true;
    await expect(auth.resendEmailOtp(user.email)).rejects.toThrow(
      'Email is already verified',
    );
    expect(mail.sendEmailVerificationOtp).toHaveBeenCalledTimes(1);
  });

  it('password reset passes the actual role, name, reset code and saved expiry; unknown users do not send', async () => {
    const user = {
      id: 'test-user',
      name: 'Dr. Jane Johnson',
      email: 'recipient@example.invalid',
      role: UserRole.DOCTOR,
    };
    const users = {
      findByEmail: vi.fn().mockResolvedValue(user),
      updateById: vi.fn(),
    };
    const auth = new AuthService(
      users as never,
      {} as never,
      mail as never,
      config as never,
    );
    const result = await auth.forgotPassword({ email: user.email });
    const saved = users.updateById.mock.calls[0][1];
    expect(mail.sendPasswordResetOtp).toHaveBeenCalledWith(
      user.email,
      user.name,
      saved.resetPasswordOtp,
      saved.resetPasswordOtpExpiry,
      user.role,
    );
    expect(saved.resetPasswordOtpExpiry.getTime() - Date.now()).toBe(
      17 * 60_000,
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain(
      saved.resetPasswordOtp,
    );
    users.findByEmail.mockResolvedValue(null);
    expect(
      await auth.forgotPassword({ email: 'missing@example.invalid' }),
    ).toEqual(result);
    expect(mail.sendPasswordResetOtp).toHaveBeenCalledTimes(1);
  });

  it('invitation forwards the full name, confirmed role, resolved hospital, actual link and 48-hour expiry', async () => {
    const users = {
      findByEmail: vi.fn().mockResolvedValue(null),
      findById: vi
        .fn()
        .mockResolvedValue({ hospitalName: 'Administrator Hospital' }),
      create: vi.fn(async (data) => ({ ...data, id: 'test-user' })),
    };
    const admin = new AdminService(
      users as never,
      mail as never,
      config as never,
    );
    const result = await admin.inviteUser(
      {
        name: 'Jane Johnson',
        email: 'recipient@example.invalid',
        role: UserRole.DOCTOR,
      },
      'test-admin',
      'Administrator',
    );
    const saved = users.create.mock.calls[0][0];
    expect(mail.sendInvitationEmail).toHaveBeenCalledWith(
      saved.email,
      saved.name,
      saved.role,
      result.frontendInviteUrl,
      saved.hospitalName,
      saved.invitationTokenExpiry,
    );
    expect(saved.hospitalName).toBe('Administrator Hospital');
    expect(saved.invitationTokenExpiry.getTime() - Date.now()).toBe(
      48 * 60 * 60_000,
    );
    expect(new URL(result.frontendInviteUrl).searchParams.get('token')).toBe(
      saved.invitationToken,
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain(saved.invitationToken);
    expect(JSON.stringify(log.mock.calls)).not.toContain(
      result.frontendInviteUrl,
    );
  });

  it('resend uses the stored hospital and confirmed role without assuming Doctor for legacy records', async () => {
    const user = {
      id: 'test-user',
      email: 'recipient@example.invalid',
      name: 'Jane Johnson',
      invitedRole: null,
      role: UserRole.PHARMACIST,
      hospitalName: 'Stored Hospital',
      invitationStatus: 'pending',
    };
    const users = {
      findById: vi.fn().mockResolvedValue(user),
      updateById: vi.fn(),
    };
    const admin = new AdminService(
      users as never,
      mail as never,
      config as never,
    );
    const result = await admin.resendInvitation(user.id, 'Administrator');
    const saved = users.updateById.mock.calls[0][1];
    expect(mail.sendInvitationEmail).toHaveBeenCalledWith(
      user.email,
      user.name,
      UserRole.PHARMACIST,
      result.frontendInviteUrl,
      user.hospitalName,
      saved.invitationTokenExpiry,
    );
    expect(saved.invitationTokenExpiry.getTime() - Date.now()).toBe(
      48 * 60 * 60_000,
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain(saved.invitationToken);
    user.invitationStatus = 'accepted';
    await expect(
      admin.resendInvitation(user.id, 'Administrator'),
    ).rejects.toThrow('already accepted');
    expect(mail.sendInvitationEmail).toHaveBeenCalledTimes(1);
  });
});
