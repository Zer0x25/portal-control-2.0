import { expect, it, describe } from "vitest";
import { encrypt, decrypt, isEncrypted } from "../../src/utils/cryptoUtils";
import crypto from "crypto";

describe("cryptoUtils", () => {
  it("encrypts using AES-256-GCM and decrypts correctly", () => {
    const original = "my secret text";
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(isEncrypted(encrypted)).toBe(true);

    // GCM format has 3 parts (iv:encrypted:authTag)
    const parts = encrypted.split(":");
    expect(parts.length).toBe(3);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it("decrypts legacy AES-256-CBC format correctly", () => {
    // Generate a legacy CBC encrypted string using the same secret logic
    const SECRET_KEY = process.env.JWT_SECRET!;
    const ENCRYPTION_KEY = crypto.createHash("sha256").update(SECRET_KEY).digest();

    const originalText = "legacy secret data";
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(originalText);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const legacyEncryptedString = iv.toString("hex") + ":" + encrypted.toString("hex");

    expect(isEncrypted(legacyEncryptedString)).toBe(true);

    const decrypted = decrypt(legacyEncryptedString);
    expect(decrypted).toBe(originalText);
  });

  it("verifies isEncrypted handles invalid inputs", () => {
    expect(isEncrypted("not encrypted")).toBe(false);
    expect(isEncrypted("abc:123")).toBe(true); // legacy valid shape
    expect(isEncrypted("abc:123:def")).toBe(true); // GCM valid shape
    expect(isEncrypted("xyz:123")).toBe(false); // non-hex
    expect(isEncrypted("abc:123:def:456")).toBe(false); // 4 parts
  });
});
