import { describe, expect, it } from "vitest";
import { CorrectionRequestSchema } from "../../src/models/schemas/time-correction.schemas";

const base = {
  employeeId: "e1",
  timeRecordId: "r1",
  recordField: "entrada",
  reason: "olvido marcar",
};

describe("CorrectionRequestSchema future guard (spec 030)", () => {
  it("accepts a past requestedValue", () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const result = CorrectionRequestSchema.safeParse({ ...base, requestedValue: past });
    expect(result.success).toBe(true);
  });

  it("rejects a future requestedValue", () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const result = CorrectionRequestSchema.safeParse({ ...base, requestedValue: future });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/futura/i);
    }
  });
});
