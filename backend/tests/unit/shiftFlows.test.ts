import { describe, expect, it, vi } from "vitest";
import { createShiftFlows } from "../../src/modules/shifts";
const user = { role: "Usuario", employeeId: "self", username: "actor" };
function fixture() {
  const service = {
    patterns: vi.fn(async () => []),
    createPattern: vi.fn(async () => ({ id: "p" })),
    updatePattern: vi.fn(async () => ({ id: "p" })),
    deletePattern: vi.fn(async () => {}),
    bulkPatterns: vi.fn(async () => 2),
    assignments: vi.fn(async () => ({ data: [] })),
    assign: vi.fn(async () => ({ id: "a" })),
    updateAssignment: vi.fn(async () => ({ id: "a" })),
    deleteAssignment: vi.fn(async () => {}),
    bulkAssignments: vi.fn(async () => 2),
    daily: vi.fn(async () => ({ isWorkDay: true })),
    scheduled: vi.fn(async () => []),
    month: vi.fn(async () => []),
    matrix: vi.fn(async () => ({})),
    conflicts: vi.fn(async () => []),
    monthlyPlan: vi.fn(async () => []),
    saveMonthlyPlan: vi.fn(async () => {}),
    suggest: vi.fn(async () => "Suggested"),
  };
  const deps = { service, parseDate: vi.fn((value: string) => new Date(value)) };
  return { ...deps, flows: createShiftFlows(deps) };
}
describe("Shift application TDD", () => {
  it("limits Usuario assignments and matrix to own employee while retaining legacy pagination", async () => {
    const f = fixture();
    await f.flows.assignments(
      { employeeId: "forged", page: "2x", pageSize: "10", showArchived: "true" },
      user,
    );
    expect(f.service.assignments).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: "self",
        page: 2,
        pageSize: 10,
        showArchived: true,
        role: "Usuario",
      }),
    );
    await f.flows.matrix(
      { startDate: "2026-10-01", endDate: "2026-10-31", employeeIds: ["forged"] },
      user,
    );
    expect(f.service.matrix).toHaveBeenCalledWith("2026-10-01", "2026-10-31", ["self"]);
  });
  it.each(["Usuario", "Kiosk_Employee"])("enforces assignments scope for %s", async (role) => {
    const f = fixture();
    await expect(f.flows.assignments({}, { role })).rejects.toMatchObject({ statusCode: 403 });
    expect(f.service.assignments).not.toHaveBeenCalled();
    await f.flows.assignments({ employeeId: "foreign", since: "1" }, { role, employeeId: "self" });
    expect(f.service.assignments).toHaveBeenCalledWith(
      expect.objectContaining({ role, employeeId: "self", since: "1" }),
    );
  });
  it("rejects an unlinked self-only matrix before fetching scheduling context", async () => {
    const f = fixture();
    for (const role of ["Usuario", "Kiosk_Employee"]) {
      await expect(
        f.flows.matrix(
          { startDate: "2026-10-01", endDate: "2026-10-31", employeeIds: ["forged"] },
          { ...user, role, employeeId: null },
        ),
      ).rejects.toMatchObject({ statusCode: 403 });
    }
    expect(f.service.matrix).not.toHaveBeenCalled();
  });
  it("rejects foreign daily/month scope before scheduling and injects business-date parser", async () => {
    const f = fixture();
    await expect(f.flows.daily("foreign", { date: "2026-10-06" }, user)).rejects.toThrow(
      "Acceso denegado",
    );
    await expect(f.flows.month("foreign", { year: "2026", month: "10" }, user)).rejects.toThrow(
      "Acceso denegado",
    );
    expect(f.service.daily).not.toHaveBeenCalled();
    expect(f.service.month).not.toHaveBeenCalled();
    await f.flows.daily("self", { date: "2026-10-06" }, user);
    expect(f.parseDate).toHaveBeenCalledWith("2026-10-06");
  });
  it("maps pattern/assignment errors and preserves idempotent missing pattern delete", async () => {
    const f = fixture();
    f.service.createPattern.mockRejectedValueOnce(new Error("sin horario definido"));
    await expect(f.flows.createPattern({ name: "Bad" })).rejects.toThrow("sin horario definido");
    f.service.assign.mockRejectedValueOnce(new Error("Conflicto existente"));
    await expect(f.flows.assign({ employeeId: "e" }, "actor")).rejects.toMatchObject({
      statusCode: 400,
    });
    f.service.deletePattern.mockRejectedValueOnce({ code: "P2025", message: "missing" });
    await expect(f.flows.deletePattern("missing")).resolves.toBeUndefined();
  });
  it("preserves monthly-plan conversion/rest payload and response, with missing-parameter errors", async () => {
    const f = fixture();
    const body = {
      employeeId: "e",
      month: "11",
      year: "2026",
      dailySchedules: [{ day: 1, type: "rest" }],
    };
    expect(await f.flows.saveMonthlyPlan(body)).toEqual({
      success: true,
      message: "Monthly plan updated successfully",
    });
    expect(f.service.saveMonthlyPlan).toHaveBeenCalledWith({
      ...body,
      month: 11,
      year: 2026,
      patternName: undefined,
    });
    await expect(f.flows.monthlyPlan("e", "bad", "11")).rejects.toThrow("Invalid year or month");
    await expect(f.flows.suggest({ employeeId: "e" })).rejects.toThrow("Missing parameters");
  });
});
