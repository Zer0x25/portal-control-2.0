import { expect, it } from "vitest";
import { configAuditValue } from "../../src/modules/configs";
it("redacts whole protected settings, including nested credentials and recipients", () => {
  for (const key of ["SMTP_CONFIG", "EMAIL_NOTIFICATION_RULES"]) {
    expect(
      configAuditValue(key, {
        password: "secret",
        profiles: [{ auth: { pass: "secret" } }],
        recipients: ["private"],
      }),
    ).toBe("[REDACTED]");
    expect(configAuditValue(key, "secret")).toBe("[REDACTED]");
    expect(configAuditValue(key, null)).toBeNull();
  }
  expect(configAuditValue("custom", { enabled: true })).toEqual({ enabled: true });
});
