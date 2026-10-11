import { expect, it, describe } from "vitest";
import crypto from "crypto";
import { encrypt, decrypt, isEncrypted } from "../../src/utils/cryptoUtils";

function legacyEncrypt(text: string): string {
  const key = crypto
    .createHash("sha256")
    .update(process.env.JWT_SECRET as string)
    .digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const enc = Buffer.concat([cipher.update(text), cipher.final()]);
  return `${iv.toString("hex")}:${enc.toString("hex")}`;
}

describe("cryptoUtils", () => {
  it("encrypts with AES-256-GCM (12B iv, 16B tag) and round-trips", () => {
    const encrypted = encrypt("my secret text");
    const [iv, , tag] = encrypted.split(":");
    expect(encrypted.split(":")).toHaveLength(3);
    expect(iv).toHaveLength(24);
    expect(tag).toHaveLength(32);
    expect(isEncrypted(encrypted)).toBe(true);
    expect(decrypt(encrypted)).toBe("my secret text");
  });

  it("produces different ciphertexts for the same input", () => {
    expect(encrypt("same")).not.toBe(encrypt("same"));
  });

  it("decrypts legacy AES-256-CBC payloads", () => {
    const legacy = legacyEncrypt("legacy secret data");
    expect(isEncrypted(legacy)).toBe(true);
    expect(decrypt(legacy)).toBe("legacy secret data");
  });

  it("rejects tampered ciphertext", () => {
    const [iv, data, tag] = encrypt("hello").split(":");
    const flipped = (data[0] === "0" ? "1" : "0") + data.slice(1);
    expect(() => decrypt(`${iv}:${flipped}:${tag}`)).toThrow();
  });

  it("rejects tampered or truncated auth tag", () => {
    const [iv, data, tag] = encrypt("hello").split(":");
    expect(() => decrypt(`${iv}:${data}:${tag.slice(0, 8)}`)).toThrow(
      "Invalid encrypted payload format",
    );
    const badTag = (tag[0] === "0" ? "1" : "0") + tag.slice(1);
    expect(() => decrypt(`${iv}:${data}:${badTag}`)).toThrow();
  });

  it("throws a descriptive error on malformed input", () => {
    expect(() => decrypt("plain")).toThrow("Invalid encrypted payload format");
    expect(() => decrypt("a:b:c:d")).toThrow("Invalid encrypted payload format");
    expect(() => decrypt("zz:yy")).toThrow("Invalid encrypted payload format");
  });

  it("isEncrypted does not misclassify plaintext lookalikes", () => {
    expect(isEncrypted("not encrypted")).toBe(false);
    expect(isEncrypted("abc:123:def")).toBe(false);
    expect(isEncrypted("xyz:123")).toBe(false);
    expect(isEncrypted("abc:123:def:456")).toBe(false);
  });
});
