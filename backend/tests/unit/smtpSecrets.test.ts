import { expect, it } from "vitest";
import { maskConfigValue, mergeSmtpSecrets } from "../../src/modules/configs";
it("masks generic SMTP reads and preserves saved secret on unchanged destination", () => {
  const stored = {
    profiles: [{ host: "smtp.invalid", user: "owner", port: 587, secure: false, pass: "secret" }],
  };
  const masked = maskConfigValue("SMTP_CONFIG", stored);
  expect(JSON.stringify(masked)).not.toContain("secret");
  expect(mergeSmtpSecrets(masked, stored)).toEqual(stored);
  expect(stored.profiles[0].pass).toBe("secret");
});
it("rejects a retained password with a different host/user rather than sending it elsewhere", () => {
  const stored = { host: "smtp.invalid", user: "owner", port: 587, secure: false, pass: "secret" };
  expect(() =>
    mergeSmtpSecrets({ ...stored, host: "other.invalid", pass: "********" }, stored),
  ).toThrow("contraseña nueva");
  expect(() => mergeSmtpSecrets({ pass: "********" }, null)).toThrow("No existe");
});
