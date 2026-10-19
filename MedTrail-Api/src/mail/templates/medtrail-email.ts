export const MEDTRAIL_LOGO_CID = 'medtrail-logo';

interface Recipient {
  name?: string | null;
  role?: string | null;
  expirationTimeline: string;
}

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]!,
  );
}

export function recipientGreeting(
  name?: string | null,
  role?: string | null,
): string {
  let cleanName = (name || '').trim().replace(/\s+/g, ' ');
  const titles: Record<string, string> = {
    dr: 'Dr.',
    pharm: 'Pharm.',
    prof: 'Prof.',
    mr: 'Mr.',
    mrs: 'Mrs.',
    ms: 'Ms.',
    miss: 'Miss',
    mx: 'Mx.',
  };
  const storedTitles: string[] = [];
  let match: RegExpMatchArray | null;
  while (
    (match = cleanName.match(/^(dr|pharm|prof|mrs|mr|ms|miss|mx)(?:\.\s*|\s+)/i))
  ) {
    storedTitles.push(titles[match[1].toLowerCase()]);
    cleanName = cleanName.slice(match[0].length).trim();
  }
  if (!cleanName || /^(dr|pharm|prof|mrs|mr|ms|miss|mx)\.?$/i.test(cleanName))
    return 'Hello,';
  // The model stores only a full name: use its first/last remaining parts, not invented profile fields.
  const parts = cleanName.split(' ');
  const confirmedRole = role?.trim().toLowerCase();
  const lastName = parts[parts.length - 1];
  if (confirmedRole === 'doctor') return `Hello Dr. ${lastName},`;
  if (confirmedRole === 'pharmacist' && storedTitles.includes('Pharm.'))
    return `Hello Pharm. ${lastName},`;
  if (confirmedRole === 'admin' && storedTitles.length)
    return `Hello ${storedTitles[0]} ${lastName},`;
  return `Hello ${parts[0]},`;
}

export function expirationTimeline(expiresAt: Date, now = Date.now()): string {
  if (!(expiresAt instanceof Date) || !Number.isFinite(expiresAt.getTime()))
    throw new Error('Invalid email expiration date');
  const minutes = Math.max(0, Math.ceil((expiresAt.getTime() - now) / 60_000));
  if (minutes > 0 && minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

function invitationUrl(value: string): string {
  const url = new URL(value);
  const hasUnsafeCharacters = Array.from(value).some(
    (character) =>
      character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
  );
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    hasUnsafeCharacters
  ) {
    throw new Error('Invalid invitation URL');
  }
  return escapeHtml(url.href);
}

const paragraphStyle =
  'margin:30px 0 0;font-size:19px;line-height:1.6;color:#41434B;';
const expirationStyle =
  'margin:0;font-size:19px;line-height:1.6;color:#7A8190;';

function emailLayout(heading: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(heading)}</title>
<style>@media only screen and (max-width:639px){.email-header{padding-left:24px!important;padding-right:24px!important}.email-body{padding-left:24px!important;padding-right:24px!important}}</style>
</head><body style="margin:0;padding:0;background:#FFFFFF;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#FFFFFF;"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" align="center" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;margin:0 auto;background:#FFFFFF;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;text-align:left;">
<tr><td class="email-header" bgcolor="#BDC6EA" style="background:#BDC6EA;padding:46px 40px;text-align:left;vertical-align:middle;">
<img src="cid:${MEDTRAIL_LOGO_CID}" alt="MedTrail" width="134" height="28" style="display:block;width:134px;max-width:100%;height:auto;border:0;">
</td></tr><tr><td class="email-body" style="padding:60px 50px;background:#FFFFFF;text-align:left;overflow-wrap:anywhere;">
<h1 style="margin:0;font-size:30px;font-weight:700;line-height:1.25;color:#28345B;">${escapeHtml(heading)}</h1>
${content}
<p style="margin:20px 0 0;font-size:19px;font-weight:700;line-height:1.6;color:#28345B;">MedTrailNG team.</p>
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
}

export function renderHospitalInvitationEmail(
  data: Recipient & { hospitalName?: string | null; invitationUrl: string },
): string {
  const hospitalName = data.hospitalName?.trim() || 'your hospital';
  const url = invitationUrl(data.invitationUrl);
  return emailLayout(
    `Welcome to ${hospitalName}`,
    `
<p style="${paragraphStyle}">${escapeHtml(recipientGreeting(data.name, data.role))} You have been invited to use MedTrailNG with ${escapeHtml(hospitalName)}, use this link to accept your invitation to the platform</p>
<p style="margin:30px 0;font-size:19px;line-height:1.6;word-break:break-all;overflow-wrap:anywhere;"><a href="${url}" style="color:#6979D7;text-decoration:none;word-break:break-all;overflow-wrap:anywhere;">${url}</a></p>
<p style="${expirationStyle}">This link will expire in ${escapeHtml(data.expirationTimeline)}</p>`,
  );
}

function codeEmail(
  heading: string,
  message: string,
  code: string,
  timeline: string,
): string {
  return emailLayout(
    heading,
    `
<p style="${paragraphStyle}">${escapeHtml(message)}</p>
<p style="margin:30px 0;font-size:36px;font-weight:700;line-height:1.25;color:#28345B;">${escapeHtml(code)}</p>
<p style="${expirationStyle}">This code will expire in ${escapeHtml(timeline)}</p>`,
  );
}

export function renderEmailVerificationEmail(
  data: Recipient & { verificationCode: string },
): string {
  return codeEmail(
    'Verify your email address',
    `${recipientGreeting(data.name, data.role)} welcome to MedTrailNG. Use this code to verify your email address and continue your onboarding process.`,
    data.verificationCode,
    data.expirationTimeline,
  );
}

export function renderResetPasswordEmail(
  data: Recipient & { resetCode: string },
): string {
  return codeEmail(
    'Reset password',
    `${recipientGreeting(data.name, data.role)} please use this code to start your password reset process.`,
    data.resetCode,
    data.expirationTimeline,
  );
}
