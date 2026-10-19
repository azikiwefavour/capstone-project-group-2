import { Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { readFileSync } from 'node:fs';
import * as nodemailer from 'nodemailer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MailService } from './mail.service';

describe('MailService with mocked SMTP delivery', () => {
  const sendMail = vi.fn();
  let service: MailService;
  let log: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;
  const expiresAt = () => new Date(Date.now() + 17 * 60_000);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-18T12:00:00Z'));
    sendMail.mockReset().mockResolvedValue(undefined);
    log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    service = new MailService({ sendMail } as unknown as MailerService);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('sends each MedTrail design through the existing mailer with a real PNG CID attachment', async () => {
    await service.sendEmailVerificationOtp(
      'recipient@example.invalid',
      'Jane Johnson',
      '001234',
      expiresAt(),
      'admin',
    );
    await service.sendPasswordResetOtp(
      'recipient@example.invalid',
      'Dr. Jane Johnson',
      '009876',
      expiresAt(),
      'doctor',
    );
    await service.sendInvitationEmail(
      'recipient@example.invalid',
      'Pharm. Jane Johnson',
      'pharmacist',
      'https://example.invalid/accept-invite?token=private-test-token',
      'Testing Hospital',
      new Date(Date.now() + 48 * 60 * 60_000),
    );
    expect(sendMail).toHaveBeenCalledTimes(3);
    const messages = sendMail.mock.calls.map(([message]) => message);
    expect(messages.map((message) => message.subject)).toEqual([
      'MedTrail – Verify Your Email',
      'MedTrail – Reset Your Password',
      "MedTrail – You've been invited as a Pharmacist",
    ]);
    expect(messages[0].html).toContain('Hello Jane, welcome to MedTrailNG.');
    expect(messages[0].html).toContain('001234');
    expect(messages[1].html).toContain(
      'Hello Dr. Johnson, please use this code',
    );
    expect(messages[1].html).toContain('009876');
    expect(messages[2].html).toContain('Hello Pharm. Johnson,');
    expect(messages[2].html).toContain('Welcome to Testing Hospital');
    expect(messages[2].html).toContain('48 hours');
    for (const message of messages) {
      expect(message.to).toBe('recipient@example.invalid');
      expect(message).not.toHaveProperty('transport');
      expect(message).not.toHaveProperty('from');
      expect(message.html).toContain('src="cid:medtrail-logo"');
      expect(message.attachments).toHaveLength(1);
      expect(message.attachments[0]).toMatchObject({
        cid: 'medtrail-logo',
        contentType: 'image/png',
        contentDisposition: 'inline',
      });
      const png = readFileSync(message.attachments[0].path);
      expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(png.readUInt32BE(16)).toBe(402);
      expect(png.readUInt32BE(20)).toBe(83);
    }
    const logs = JSON.stringify([log.mock.calls, error.mock.calls]);
    for (const secret of [
      '001234',
      '009876',
      'private-test-token',
      'https://example.invalid/accept-invite',
    ])
      expect(logs).not.toContain(secret);
  });

  it('preserves failure handling but never logs SMTP payloads containing secrets', async () => {
    sendMail.mockRejectedValue(
      new Error('SMTP payload: 001234 009876 private-test-token'),
    );
    await expect(
      service.sendEmailVerificationOtp(
        'recipient@example.invalid',
        'Jane',
        '001234',
        expiresAt(),
        'admin',
      ),
    ).resolves.toBeUndefined();
    await expect(
      service.sendPasswordResetOtp(
        'recipient@example.invalid',
        'Jane',
        '009876',
        expiresAt(),
        'patient',
      ),
    ).resolves.toBeUndefined();
    await expect(
      service.sendInvitationEmail(
        'recipient@example.invalid',
        'Jane',
        'doctor',
        'https://example.invalid/?token=private-test-token',
        null,
        expiresAt(),
      ),
    ).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledTimes(3);
    expect(log).not.toHaveBeenCalled();
    const logs = JSON.stringify(error.mock.calls);
    for (const secret of ['001234', '009876', 'private-test-token'])
      expect(logs).not.toContain(secret);
  });

  it('does not attempt delivery with an unsafe invitation URL', async () => {
    await service.sendInvitationEmail(
      'recipient@example.invalid',
      'Jane',
      'doctor',
      'javascript:alert(1)',
      null,
      expiresAt(),
    );
    expect(sendMail).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('Failed to send invitation email');
  });

  it('preserves the patient invitation subject', async () => {
    await service.sendInvitationEmail(
      'recipient@example.invalid',
      'Jane Johnson',
      'patient',
      'https://example.invalid/invite',
      null,
      expiresAt(),
    );
    expect(sendMail.mock.calls[0][0].subject).toBe(
      'MedTrail – Complete Your Patient Registration',
    );
    expect(sendMail.mock.calls[0][0].html).toContain('Hello Jane,');
  });

  it('builds a related MIME message with the CID PNG entirely in memory, without SMTP', async () => {
    vi.useRealTimers();
    await service.sendPasswordResetOtp(
      'recipient@example.invalid',
      'Jane',
      '001234',
      expiresAt(),
      'patient',
    );
    const transport = nodemailer.createTransport({
      streamTransport: true,
      buffer: true,
    });
    const result = await transport.sendMail({
      ...sendMail.mock.calls[0][0],
      from: 'sender@example.invalid',
    });
    const mime = result.message.toString();
    expect(mime).toContain('Content-Type: multipart/related');
    expect(mime).toContain('Content-ID: <medtrail-logo>');
    expect(mime).toContain('Content-Type: image/png');
    expect(mime).toContain('medtrail-logo.png');
  });
});
