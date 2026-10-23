import { describe, expect, it } from "vitest";

import { isDegradedVital } from "../utils/webVitals";

describe("web-vitals degraded thresholds", () => {
  it.each([
    ["LCP", 4000, false],
    ["LCP", 4001, true],
    ["INP", 500, false],
    ["INP", 501, true],
    ["CLS", 0.25, false],
    ["CLS", 0.251, true],
    ["FCP", 3000, false],
    ["FCP", 3001, true],
    ["TTFB", 1800, false],
    ["TTFB", 1801, true],
    ["FID", 1000, false],
  ])("checks %s value %s against its degraded threshold", (name, value, degraded) => {
    expect(isDegradedVital(name, value)).toBe(degraded);
  });

  it("does not classify a non-finite measurement as degraded", () => {
    expect(isDegradedVital("LCP", Number.NaN)).toBe(false);
  });
});
