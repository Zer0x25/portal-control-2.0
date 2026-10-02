import speakeasy from "speakeasy";
import qrcode from "qrcode";

export const mfaService = {
  /**
   * Generates a new TOTP secret for a user.
   */
  generateSecret(username: string) {
    const secret = speakeasy.generateSecret({
      name: `PORTAL:${username}`,
      issuer: "PORTAL",
    });
    return {
      otpauthUrl: secret.otpauth_url,
      base32: secret.base32,
    };
  },

  /**
   * Generates a QR Code Data URL from an otpauth URL.
   */
  async generateQRCode(otpauthUrl: string): Promise<string> {
    try {
      return await qrcode.toDataURL(otpauthUrl);
    } catch (err) {
      console.error("Error generating QR Code:", err);
      throw new Error("No se pudo generar el código QR");
    }
  },

  /**
   * Verifies a TOTP token against a secret.
   */
  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 1, // Allow 30 seconds clock drift
    });
  },
};
