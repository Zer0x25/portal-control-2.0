import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const LEGACY_ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

if (!process.env.JWT_SECRET) {
  throw new Error("CRITICAL: JWT_SECRET environment variable is not set.");
}

const SECRET_KEY = process.env.JWT_SECRET;

// Ensure key is 32 bytes
const ENCRYPTION_KEY = crypto.createHash("sha256").update(SECRET_KEY).digest();

/**
 * Encrypts a string using AES-256-GCM
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  return iv.toString("hex") + ":" + encrypted.toString("hex") + ":" + authTag.toString("hex");
}

/**
 * Decrypts a string. Supports both AES-256-GCM (new format) and AES-256-CBC (legacy format)
 */
export function decrypt(text: string): string {
  const textParts = text.split(":");
  const iv = Buffer.from(textParts[0], "hex");

  if (textParts.length === 3) {
    // GCM format: iv:encrypted:authTag
    const encryptedText = Buffer.from(textParts[1], "hex");
    const authTag = Buffer.from(textParts[2], "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } else {
    // CBC legacy format: iv:encrypted
    const encryptedText = Buffer.from(textParts[1], "hex");
    const decipher = crypto.createDecipheriv(LEGACY_ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
}

/**
 * Validates if a string is encrypted (contains the delimiter and valid hex)
 */
export function isEncrypted(text: string): boolean {
  if (!text.includes(":")) return false;
  const parts = text.split(":");
  if (parts.length === 2) {
    return /^[0-9a-fA-F]+$/.test(parts[0]) && /^[0-9a-fA-F]+$/.test(parts[1]);
  } else if (parts.length === 3) {
    return /^[0-9a-fA-F]+$/.test(parts[0]) && /^[0-9a-fA-F]+$/.test(parts[1]) && /^[0-9a-fA-F]+$/.test(parts[2]);
  }
  return false;
}
