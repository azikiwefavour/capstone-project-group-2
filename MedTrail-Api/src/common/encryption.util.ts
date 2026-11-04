import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const SECRET =
  process.env.ENCRYPTION_KEY ||
  process.env.JWT_SECRET ||
  'medtrail-clinical-encryption-key-32b';

function getKey(): Buffer {
  return crypto.createHash('sha256').update(SECRET).digest();
}

/**
 * Encrypts sensitive clinical text (e.g. patient illness, symptoms) before storing in DB.
 * Output format: enc:<hex_iv>:<hex_ciphertext>
 */
export function encryptClinicalText(plainText: string | null | undefined): string | null {
  if (!plainText || typeof plainText !== 'string' || !plainText.trim()) {
    return null;
  }
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(plainText.trim(), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `enc:${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts sensitive clinical text for authorized Doctor views only.
 * Returns null or plaintext. If already plaintext, returns as-is.
 */
export function decryptClinicalText(cipherText: string | null | undefined): string | null {
  if (!cipherText || typeof cipherText !== 'string' || !cipherText.trim()) {
    return null;
  }
  if (!cipherText.startsWith('enc:')) {
    // Legacy or unencrypted plain text
    return cipherText;
  }
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) return cipherText;
    const iv = Buffer.from(parts[1], 'hex');
    const encryptedData = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

