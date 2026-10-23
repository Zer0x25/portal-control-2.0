import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { checkMeasurements, findPrecacheEntries, lowerBudgets } =
  require("../../../scripts/bundleBudgetPolicy.cjs") as {
    checkMeasurements: (
      measurements: Record<string, number>,
      limits: Record<string, number>,
    ) => string[];
    findPrecacheEntries: (source: string) => Array<{ url: string; revision: string | null }>;
    lowerBudgets: (
      measurements: Record<string, number>,
      budget: { limits: Record<string, number> },
      reason: string,
    ) => { limits: Record<string, number>; updateReason: string };
  };

const measurements = {
  reactCoreBytes: 218_860,
  chartsBytes: 145_613,
  precacheBytes: 1_955_000,
};

describe("bundle budget policy", () => {
  it("accepts measurements at or below the documented bundle limits", () => {
    expect(
      checkMeasurements(measurements, {
        reactCoreBytes: 266_240,
        chartsBytes: 184_320,
        precacheBytes: 2_097_152,
      }),
    ).toEqual([]);
  });

  it("reports each exceeded metric", () => {
    expect(
      checkMeasurements(
        { ...measurements, reactCoreBytes: 266_241, precacheBytes: 2_097_153 },
        { reactCoreBytes: 266_240, chartsBytes: 184_320, precacheBytes: 2_097_152 },
      ),
    ).toEqual([
      "reactCoreBytes 266241 exceeds budget 266240",
      "precacheBytes 2097153 exceeds budget 2097152",
    ]);
  });

  it("lowers current limits without raising them", () => {
    const updated = lowerBudgets(
      measurements,
      {
        limits: { reactCoreBytes: 266_240, chartsBytes: 184_320, precacheBytes: 2_097_152 },
      },
      "Stable measurement",
    );

    expect(updated.limits).toEqual(measurements);
    expect(updated.updateReason).toBe("Stable measurement");
  });

  it("refuses an update when any measurement exceeds the current limit", () => {
    expect(() =>
      lowerBudgets(
        { ...measurements, chartsBytes: 184_321 },
        { limits: { reactCoreBytes: 266_240, chartsBytes: 184_320, precacheBytes: 2_097_152 } },
        "This must fail",
      ),
    ).toThrow(/Cannot update bundle budget: chartsBytes 184321 exceeds budget 184320/);
  });

  it("parses a JSON precache array from a minified service worker", () => {
    expect(
      findPrecacheEntries(
        'x.precacheAndRoute([{url:"index.html",revision:"a"},{url:"a.js",revision:null}],{});',
      ),
    ).toEqual([
      { url: "index.html", revision: "a" },
      { url: "a.js", revision: null },
    ]);
  });
});
