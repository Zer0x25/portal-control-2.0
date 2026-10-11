import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const LEGACY_ALGORITHM = "aes-256-cbc";
const GCM_IV_LENGTH = 12;
const GCM_TAG_LENGTH = 16;
const HEX = /^[0-9a-fA-F]+$/;

if (!process.env.JWT_SECRET) {
  throw new Error("CRITICAL: JWT_SECRET environment variable is not set.");
}

const SECRET_KEY = process.env.JWT_SECRET;

// Ensure key is 32 bytes
const ENCRYPTION_KEY = crypto.createHash("sha256").update(SECRET_KEY).digest();

/**
 * Encrypts a string using AES-256-GCM. Format: iv(12B):ciphertext:authTag(16B), all hex.
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(GCM_IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv, {
    authTagLength: GCM_TAG_LENGTH,
  });
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${encrypted.toString("hex")}:${authTag.toString("hex")}`;
}

function isGcmFormat(parts: string[]): boolean {
  return (
    parts.length === 3 &&
    parts[0].length === GCM_IV_LENGTH * 2 &&
    parts[2].length === GCM_TAG_LENGTH * 2 &&
    parts.every((p) => HEX.test(p))
  );
}

function isLegacyCbcFormat(parts: string[]): boolean {
  return parts.length === 2 && parts.every((p) => HEX.test(p));
}

/**
 * Decrypts a string. Supports AES-256-GCM (current) and AES-256-CBC (legacy, read-only).
 * Throws a descriptive error on malformed input or failed authentication.
 */
export function decrypt(text: string): string {
  const parts = text.split(":");

  if (isGcmFormat(parts)) {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      ENCRYPTION_KEY,
      Buffer.from(parts[0], "hex"),
      { authTagLength: GCM_TAG_LENGTH },
    );
    decipher.setAuthTag(Buffer.from(parts[2], "hex"));
    return Buffer.concat([
      decipher.update(Buffer.from(parts[1], "hex")),
      decipher.final(),
    ]).toString("utf8");
  }

  if (isLegacyCbcFormat(parts)) {
    const decipher = crypto.createDecipheriv(
      LEGACY_ALGORITHM,
      ENCRYPTION_KEY,
      Buffer.from(parts[0], "hex"),
    );
    return Buffer.concat([
      decipher.update(Buffer.from(parts[1], "hex")),
      decipher.final(),
    ]).toString("utf8");
  }

  throw new Error("Invalid encrypted payload format");
}

/**
 * Validates if a string looks encrypted: strict GCM shape, or legacy CBC (iv:data hex).
 */
export function isEncrypted(text: string): boolean {
  if (!text.includes(":")) return false;
  const parts = text.split(":");
  return isGcmFormat(parts) || isLegacyCbcFormat(parts);
}
