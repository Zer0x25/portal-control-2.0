import { describe, it, expect } from "vitest";
import { createFiltersIdentifier } from "./kpiUtils";
import { Employee } from "../types";

describe("createFiltersIdentifier", () => {
  it("returns no-employees when list is empty", () => {
    expect(createFiltersIdentifier([])).toBe("no-employees");
  });

  it("creates a deterministic sorted identifier for employees", () => {
    const employees = [{ id: "emp-2" } as Employee, { id: "emp-1" } as Employee];
    const key = createFiltersIdentifier(employees);
    expect(key).toBe(JSON.stringify({ employeeIds: ["emp-1", "emp-2"] }));
  });
});
