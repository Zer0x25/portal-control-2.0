import { afterEach, expect, it, vi } from "vitest";
import { nextReportRun, validReportCron } from "../../src/utils/reportCron";
afterEach(() => vi.unstubAllEnvs());
it.each([
  ["0 8 * * *", "2026-01-02T10:00:00Z", "2026-01-02T11:00:00Z"],
  ["0 8 * * *", "2026-01-02T11:00:00Z", "2026-01-03T11:00:00Z"],
  ["30 9 * * 1-5", "2026-01-02T13:00:00Z", "2026-01-05T12:30:00Z"],
  ["0 8 1 * *", "2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z"],
  ["0 8 1 * *", "2026-01-31T12:00:00Z", "2026-02-01T11:00:00Z"],
  ["0 8 * * *", "2026-09-05T12:00:00Z", "2026-09-06T11:00:00Z"],
  ["0 8 * * *", "2026-04-04T11:00:00Z", "2026-04-05T12:00:00Z"],
  ["0 8 * * THU", "2026-01-02T13:00:00Z", "2026-01-08T11:00:00Z"],
  ["*/15 8-9 * * *", "2026-01-02T11:01:00Z", "2026-01-02T11:15:00Z"],
])("calculates %s in Chile from %s", (cron, now, expected) => {
  for (const zone of ["UTC", "America/Santiago", "Asia/Tokyo"]) {
    vi.stubEnv("TZ", zone);
    expect(nextReportRun(cron, new Date(now)).toISOString()).toBe(new Date(expected).toISOString());
  }
});
it.each(["invalid", "0 25 * * *", "0 8 31 2 *", "H 8 * * *", "* * * * * *", "@daily"])(
  "rejects unsupported/impossible expression %s",
  (cron) => {
    expect(validReportCron(cron)).toBe(false);
    expect(() => nextReportRun(cron, new Date("2026-01-01T00:00:00Z"))).toThrow();
  },
);
