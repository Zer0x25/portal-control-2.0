import { describe, expect, it, vi } from "vitest";
import bcryptjs from "bcryptjs";
import { EmployeeService } from "../../src/services/EmployeeService";
import prisma from "../../src/services/db";

describe("Anti-regression: EmployeeService PIN hashing and block-reset", () => {
  it("hashes 4-digit PIN upon employee creation", async () => {
    const service = new EmployeeService();
    const createMock = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    const mockDb = { employee: { create: createMock } } as unknown as typeof prisma;

    const result = await service.createEmployee(
      {
        id: "EMP-2001",
        name: "Carlos Test",
        rut: "11.111.111-1",
        email: "carlos@test.cl",
        position: "Developer",
        area: "IT",
        workdayType: "Completa",
        pin: "4321",
      },
      mockDb,
    );

    expect(createMock).toHaveBeenCalledTimes(1);
    const savedPin = (result as { pin?: string | null }).pin;
    expect(savedPin).not.toBe("4321");
    expect(typeof savedPin).toBe("string");
    expect(bcryptjs.compareSync("4321", savedPin!)).toBe(true);
  });

  it("leaves null/non-4-digit PIN unhashed upon creation", async () => {
    const service = new EmployeeService();
    const createMock = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    const mockDb = { employee: { create: createMock } } as unknown as typeof prisma;

    const result = await service.createEmployee(
      {
        id: "EMP-2002",
        name: "Sin Pin",
        rut: "22.222.222-2",
        position: "Operario",
        area: "Planta",
        workdayType: "Completa",
        pin: null,
      },
      mockDb,
    );

    expect((result as { pin?: string | null }).pin).toBeNull();
  });

  it("hashes PIN on update and resets isPinBlocked to false and pinFailedAttempts to 0", async () => {
    const service = new EmployeeService();
    const updateSpy = vi.spyOn(prisma.employee, "update").mockImplementation(async ({ data }) => ({
      id: "EMP-2001",
      name: "Carlos",
      rut: "11.111.111-1",
      email: null,
      position: "Dev",
      area: "IT",
      workdayType: "Completa",
      status: "Activo",
      pin: data.pin as string,
      isPinBlocked: data.isPinBlocked as boolean,
      pinFailedAttempts: data.pinFailedAttempts as number,
      phone: null,
      address: null,
      gender: null,
      birthDate: null,
      entryDate: new Date(),
      leaveDaysAvailable: 15,
      isDeleted: false,
      lastModified: BigInt(0),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await service.updateEmployee("EMP-2001", {
      pin: "9999",
      isPinBlocked: true, // Should be overridden by PIN reset logic
      pinFailedAttempts: 5, // Should be overridden by PIN reset logic
    });

    expect(updateSpy).toHaveBeenCalledTimes(1);
    const updateCall = updateSpy.mock.calls[0][0];
    const updatedData = updateCall.data;

    expect(updatedData.isPinBlocked).toBe(false);
    expect(updatedData.pinFailedAttempts).toBe(0);
    expect(typeof updatedData.pin).toBe("string");
    expect(bcryptjs.compareSync("9999", updatedData.pin as string)).toBe(true);

    updateSpy.mockRestore();
  });

  it("retains isPinBlocked and pinFailedAttempts when no new PIN is passed on update", async () => {
    const service = new EmployeeService();
    const updateSpy = vi.spyOn(prisma.employee, "update").mockImplementation(async ({ data }) => ({
      id: "EMP-2001",
      name: "Carlos",
      rut: "11.111.111-1",
      email: null,
      position: "Dev",
      area: "IT",
      workdayType: "Completa",
      status: "Activo",
      pin: data.pin as string,
      isPinBlocked: data.isPinBlocked as boolean,
      pinFailedAttempts: data.pinFailedAttempts as number,
      phone: null,
      address: null,
      gender: null,
      birthDate: null,
      entryDate: new Date(),
      leaveDaysAvailable: 15,
      isDeleted: false,
      lastModified: BigInt(0),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await service.updateEmployee("EMP-2001", {
      isPinBlocked: true,
      pinFailedAttempts: 3,
    });

    expect(updateSpy).toHaveBeenCalledTimes(1);
    const updateCall = updateSpy.mock.calls[0][0];
    const updatedData = updateCall.data;

    expect(updatedData.isPinBlocked).toBe(true);
    expect(updatedData.pinFailedAttempts).toBe(3);

    updateSpy.mockRestore();
  });
});
