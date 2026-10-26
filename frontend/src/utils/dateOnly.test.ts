import { describe, expect, it } from "vitest";
import { parseISODateAtUTC } from "./dateOnly";

describe("parseISODateAtUTC", () => {
  it("creates UTC midnight without a local timezone shift", () => {
    expect(parseISODateAtUTC("2026-10-23").toISOString()).toBe("2026-10-23T00:00:00.000Z");
  });

  it("keeps consecutive business dates 24 hours apart across Chile DST end", () => {
    const before = parseISODateAtUTC("2026-04-04");
    const after = parseISODateAtUTC("2026-04-05");

    expect(after.getTime() - before.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it.each(["", "2026-2-03", "2026-02-30", "not-a-date"])(
    "returns an invalid date for %j",
    (value) => {
      expect(Number.isNaN(parseISODateAtUTC(value).getTime())).toBe(true);
    },
  );
});
