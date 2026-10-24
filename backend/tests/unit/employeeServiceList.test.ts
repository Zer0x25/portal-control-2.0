import { describe, expect, it, vi } from "vitest";
import { EmployeeService } from "../../src/services/EmployeeService";
import prisma from "../../src/services/db";

describe("EmployeeService employee list queries", () => {
  it("skips the separate count for a full employee list", async () => {
    const service = new EmployeeService();
    const employees = [{}] as never[];
    const findManySpy = vi.spyOn(prisma.employee, "findMany").mockResolvedValue(employees);
    const countSpy = vi.spyOn(prisma.employee, "count").mockResolvedValue(0);

    try {
      const result = await service.listEmployees({});

      expect(findManySpy).toHaveBeenCalledOnce();
      expect(countSpy).not.toHaveBeenCalled();
      expect(result).toEqual({ rawEmployees: employees, total: 1 });
    } finally {
      findManySpy.mockRestore();
      countSpy.mockRestore();
    }
  });

  it("keeps the separate count and pagination window for paged results", async () => {
    const service = new EmployeeService();
    const findManySpy = vi.spyOn(prisma.employee, "findMany").mockResolvedValue([]);
    const countSpy = vi.spyOn(prisma.employee, "count").mockResolvedValue(9);

    try {
      const result = await service.listEmployees({ page: "2", pageSize: "5" });

      expect(findManySpy).toHaveBeenCalledWith(expect.objectContaining({ take: 5, skip: 5 }));
      expect(countSpy).toHaveBeenCalledOnce();
      expect(result.total).toBe(9);
    } finally {
      findManySpy.mockRestore();
      countSpy.mockRestore();
    }
  });
});
