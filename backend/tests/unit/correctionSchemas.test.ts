import { describe, expect, it } from "vitest";
import {
  CorrectionQuerySchema,
  CorrectionRequestSchema,
} from "../../src/models/schemas/time-correction.schemas";

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

describe("Correction API validation", () => {
  const body = { ...base, requestedValue: new Date(Date.now() - 60_000).toISOString() };
  it.each(["", "   "])("rejects empty reason %j", (reason) => {
    expect(CorrectionRequestSchema.safeParse({ ...body, reason }).success).toBe(false);
  });
  it("rejects attachments explicitly and accepts the legacy value aliases", () => {
    const result = CorrectionRequestSchema.safeParse({ ...body, attachment: { name: "test.pdf" } });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toMatch(/adjuntos/i);
    expect(
      CorrectionRequestSchema.safeParse({ ...body, currentValue: "", originalValue: "" }).success,
    ).toBe(true);
  });
  it.each([
    { limit: "abc" },
    { limit: "-1" },
    { limit: "0" },
    { offset: "-1" },
    { offset: "1.5" },
    { since: "nan" },
    { status: "other" },
  ])("rejects invalid pagination %j", (query) => {
    expect(CorrectionQuerySchema.safeParse(query).success).toBe(false);
  });
  it("accepts the supported pagination and pending filter", () => {
    expect(
      CorrectionQuerySchema.safeParse({ limit: "30", offset: "0", status: "pending" }).success,
    ).toBe(true);
  });
});
