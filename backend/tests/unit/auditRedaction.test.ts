import { expect, it } from "vitest";
import { redactAuditFields } from "../../src/modules/audit";
it("redacts historical protected configs and nested credential fields without mutating source", () => {
  const details = {
    key: "SMTP_CONFIG",
    previousValue: '{"pass":"secret"}',
    newValue: { pass: "secret" },
  };
  const result = redactAuditFields("CONFIG_SET", details, {
    authorization: "Bearer secret",
    safe: true,
  });
  expect(JSON.stringify(result)).not.toContain("secret");
  expect(result.details).toMatchObject({
    key: "SMTP_CONFIG",
    previousValue: "[REDACTED]",
    newValue: "[REDACTED]",
  });
  expect(details.newValue.pass).toBe("secret");
});
it("removes unhandled error message/stack and entire body/query, including old records", () => {
  const result = redactAuditFields(
    "UNHANDLED_ERROR",
    { message: "secret echoed in SQL", stack: "secret" },
    {
      path: "/api/admin/reset-password",
      method: "POST",
      body: { newPassword: "secret" },
      query: { token: "secret" },
    },
  );
  expect(JSON.stringify(result)).not.toContain("secret");
  expect(result.metadata).toMatchObject({
    path: "/api/admin/reset-password",
    method: "POST",
    body: "[REDACTED]",
    query: "[REDACTED]",
  });
});
it("preserves useful fields while redacting nested secrets and auth state", () => {
  expect(
    redactAuditFields(
      "MANUAL",
      { count: 2, nested: [{ passwordHash: "hash", mfaSecret: "mfa", token: "jwt", safe: true }] },
      null,
    ).details,
  ).toEqual({
    count: 2,
    nested: [
      { passwordHash: "[REDACTED]", mfaSecret: "[REDACTED]", token: "[REDACTED]", safe: true },
    ],
  });
});
