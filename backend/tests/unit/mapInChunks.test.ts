import { describe, expect, it } from "vitest";
import { KPI_LOOKUP_CHUNK_SIZE, mapInChunks } from "../../src/services/kpi/mapInChunks";

describe("mapInChunks", () => {
  it("preserves order and caps concurrent work at the KPI batch size", async () => {
    const values = Array.from({ length: KPI_LOOKUP_CHUNK_SIZE * 2 + 7 }, (_, index) => index);
    let inFlight = 0;
    let maxInFlight = 0;

    const results = await mapInChunks(values, async (value) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise<void>((resolve) => setImmediate(resolve));
      inFlight -= 1;
      return value * 2;
    });

    expect(maxInFlight).toBe(KPI_LOOKUP_CHUNK_SIZE);
    expect(results).toEqual(values.map((value) => value * 2));
  });

  it("rejects a non-positive batch size", async () => {
    await expect(mapInChunks([1], (value) => value, 0)).rejects.toThrow(
      "chunkSize must be a positive integer",
    );
  });
});
