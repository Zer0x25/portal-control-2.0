import { describe, it, expect } from "vitest";
import { idFactory } from "./idFactory";

describe("idFactory", () => {
  it("generates valid ULID", () => {
    const id = idFactory.ulid();
    expect(typeof id).toBe("string");
    expect(id.length).toBe(26);
  });

  it("generates NanoID of default and custom length", () => {
    const idDefault = idFactory.nanoid();
    expect(idDefault.length).toBe(21);

    const idCustom = idFactory.nanoid(10);
    expect(idCustom.length).toBe(10);
  });

  it("generates timestampedId", () => {
    const id = idFactory.timestampedId();
    expect(typeof id).toBe("string");
    expect(id).toContain("-");
  });
});
