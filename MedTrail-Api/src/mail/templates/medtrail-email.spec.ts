import { describe, expect, it } from 'vitest';
import {
  expirationTimeline,
  recipientGreeting,
  renderEmailVerificationEmail,
  renderHospitalInvitationEmail,
  renderResetPasswordEmail,
} from './medtrail-email';

describe('MedTrail email templates', () => {
  it.each([
    ['Jane Johnson', 'doctor', 'Hello Dr. Johnson,'],
    ['Dr. Dr. Jane Johnson', 'doctor', 'Hello Dr. Johnson,'],
    ['Dr.Dr.Jane Johnson', 'doctor', 'Hello Dr. Johnson,'],
    ['Jane Johnson', 'pharmacist', 'Hello Jane,'],
    ['Pharm. Jane Johnson', 'pharmacist', 'Hello Pharm. Johnson,'],
    ['Dr. Jane Johnson', 'pharmacist', 'Hello Jane,'],
    ['Pharm. Jane Johnson', 'patient', 'Hello Jane,'],
    ['Jane Johnson', 'admin', 'Hello Jane,'],
    ['Prof. Jane Johnson', 'admin', 'Hello Prof. Johnson,'],
    ['Mrs. Mrs. Jane Johnson', 'admin', 'Hello Mrs. Johnson,'],
    ['Dr. Jane Johnson', null, 'Hello Jane,'],
    [null, 'doctor', 'Hello,'],
    ['  ', 'patient', 'Hello,'],
    ['Dr.', 'doctor', 'Hello,'],
    ['Jane', 'doctor', 'Hello Dr. Jane,'],
  ])(
    'uses only the stored name and confirmed role: %s / %s',
    (name, role, greeting) => {
      expect(recipientGreeting(name, role)).toBe(greeting);
    },
  );

  it('renders the invitation with actual hospital, link, greeting and expiration', () => {
    const html = renderHospitalInvitationEmail({
      name: 'Dr. Jane Johnson',
      role: 'doctor',
      hospitalName: 'Testing & Hospital',
      invitationUrl:
        'https://example.invalid/accept-invite?token=test-only&source=email',
      expirationTimeline: '48 hours',
    });
    expect(html).toContain('Welcome to Testing &amp; Hospital');
    expect(html).toContain('Hello Dr. Johnson,');
    expect(html).toContain(
      'href="https://example.invalid/accept-invite?token=test-only&amp;source=email"',
    );
    expect(html).toContain('This link will expire in 48 hours');
    expect(html).not.toContain('Complete Registration');
  });

  it('uses the approved fallback for a missing hospital and missing name', () => {
    const html = renderHospitalInvitationEmail({
      invitationUrl: 'http://localhost:5173/accept-invite?token=test-only',
      expirationTimeline: '1 hour',
      hospitalName: ' ',
    });
    expect(html).toContain('Welcome to your hospital');
    expect(html).toContain('Hello, You have been invited');
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,test',
    '//example.invalid/invite',
    'https://user:pass@example.invalid/',
    'https://example.invalid/\ninvite',
    'not-a-url',
  ])(
    'rejects unsafe invitation URLs without embedding them: %s',
    (invitationUrl) => {
      expect(() =>
        renderHospitalInvitationEmail({
          invitationUrl,
          expirationTimeline: '48 hours',
        }),
      ).toThrow();
    },
  );

  it('escapes dynamic hospital names, recipient names, expiration text and URL attributes', () => {
    const html = renderHospitalInvitationEmail({
      name: '<script>alert(1)</script>',
      hospitalName: '<img src=x onerror="bad"> & Hospital',
      invitationUrl:
        'https://example.invalid/?token=%22%3E%3Cscript%3E&source=email',
      expirationTimeline: '<b>48 hours</b>',
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain(
      '&lt;img src=x onerror=&quot;bad&quot;&gt; &amp; Hospital',
    );
    expect(html).toContain('&lt;b&gt;48 hours&lt;/b&gt;');
    expect(html).toContain('&amp;source=email');
  });

  it.each([
    [
      renderEmailVerificationEmail({
        name: 'Jane Johnson',
        role: 'admin',
        verificationCode: '001234',
        expirationTimeline: '17 minutes',
      }),
      'Verify your email address',
      '001234',
    ],
    [
      renderResetPasswordEmail({
        name: 'Dr. Jane Johnson',
        role: 'doctor',
        resetCode: '009876',
        expirationTimeline: '17 minutes',
      }),
      'Reset password',
      '009876',
    ],
  ])(
    'renders a code email with the shared design and backend-supplied values',
    (html, heading, code) => {
      expect(html).toContain(heading);
      expect(html).toContain(code);
      expect(html).toContain('This code will expire in 17 minutes');
      expect(html).toContain('max-width:600px');
      expect(html).toContain('padding:46px 40px');
      expect(html).toContain('padding:60px 50px');
      expect(html).toContain('background:#BDC6EA');
      expect(html).toContain('src="cid:medtrail-logo"');
      expect(html).toContain('font-size:30px');
      expect(html).toContain('font-size:19px');
      expect(html).toContain('font-size:36px');
      expect(html).toContain('MedTrailNG team.');
      expect(html).toContain('@media only screen');
      expect(html).toContain('role="presentation"');
      expect(html).not.toContain('<svg');
      expect(html).not.toContain('className=');
    },
  );

  it('escapes codes rather than treating them as HTML', () => {
    expect(
      renderEmailVerificationEmail({
        verificationCode: '<script>1</script>',
        expirationTimeline: '10 minutes',
      }),
    ).toContain('&lt;script&gt;1&lt;/script&gt;');
    expect(
      renderResetPasswordEmail({
        resetCode: '<b>1</b>',
        expirationTimeline: '10 minutes',
      }),
    ).toContain('&lt;b&gt;1&lt;/b&gt;');
  });

  it('formats actual remaining expiry without changing or replacing it', () => {
    const now = Date.parse('2026-10-18T12:00:00Z');
    expect(expirationTimeline(new Date(now + 17 * 60_000), now)).toBe(
      '17 minutes',
    );
    expect(expirationTimeline(new Date(now + 48 * 60 * 60_000), now)).toBe(
      '48 hours',
    );
    expect(expirationTimeline(new Date(now + 60 * 60_000), now)).toBe('1 hour');
    expect(expirationTimeline(new Date(now + 59_000), now)).toBe('1 minute');
    expect(expirationTimeline(new Date(now - 1), now)).toBe('0 minutes');
    expect(() => expirationTimeline(new Date('invalid'), now)).toThrow();
  });
});
