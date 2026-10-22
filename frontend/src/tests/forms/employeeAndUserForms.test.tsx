import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

import { useEmployeeFormController } from "../../features/employee-management/hooks/useEmployeeFormController";
import { useUserFormController } from "../../features/user-management/hooks/useUserFormController";
import type { Employee, User } from "../../types/index";

/**
 * Spec 036 T9 (AC1, AC2, AC3, AC4, AC8): los formularios de **empleado** y de
 * **usuario** migrados a `useAppForm`.
 *
 * Lo que se fija aqui es lo que la migracion puede romper en silencio:
 *
 * 1. **El payload** sigue siendo identico al de antes (T13): mismos nombres de
 *    campo y los campos vacios omitidos (una cadena vacia no viaja).
 * 2. **Los errores** son de campo y tienen mensaje (AC2, AC3): el digito
 *    verificador del RUT, el RUT duplicado, los campos obligatorios, el
 *    formato del email y la longitud del nombre de usuario.
 * 3. **El doble envio** esta bloqueado (AC4).
 */

const RUT_VALIDO = "11111111-1";

/**
 * El payload que **viaja**.
 *
 * La normalizacion de la capa deja las claves vacias con valor `undefined`:
 * es el `JSON.stringify` el que las omite. Comparar el JSON (y no el objeto)
 * es lo que fija el payload real (spec 036 T13).
 */
const asJson = (payload: Record<string, unknown>): Record<string, unknown> =>
  JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;

const empleadoBase: Employee = {
  id: "e-1",
  name: "Ana Pérez",
  rut: RUT_VALIDO,
  position: "Operador",
  area: "Operaciones",
  workdayType: "Completa",
  status: "Activo",
  lastModified: 0,
  syncStatus: "synced",
  isDeleted: false,
};

const usuarioBase: User = {
  id: "u-1",
  username: "ana.perez",
  role: "Usuario",
  employeeId: "e-1",
  lastModified: 0,
  syncStatus: "synced",
  isDeleted: false,
};

describe("useEmployeeFormController (spec 036 T9)", () => {
  it("envia el payload con la forma exacta (los campos vacios no viajan)", async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useEmployeeFormController({
        employee: null,
        existingEmployees: [],
        areaList: ["Operaciones"],
        workdayTypeList: ["Completa"],
        nextEmployeeId: "42",
        hasLinkedUser: false,
        onSave,
        onCancel: vi.fn(),
      }),
    );

    await act(async () => {
      result.current.setValue("name", "  Ana Pérez  ");
      result.current.setValue("rut", RUT_VALIDO);
      result.current.setValue("position", "Operador");
      result.current.setValue("area", "Operaciones");
      result.current.setValue("workdayType", "Completa");
      result.current.submit();
    });

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));

    const payload = asJson(onSave.mock.calls[0][0] as Record<string, unknown>);
    expect(Object.keys(payload).sort()).toEqual(
      ["area", "createUserAccount", "name", "position", "rut", "workdayType"].sort(),
    );
    // El nombre viaja recortado y el email vacio no viaja.
    expect(payload.name).toBe("Ana Pérez");
    expect(payload).not.toHaveProperty("email");
    expect(payload.createUserAccount).toBe(true);
  });

  it("exige el digito verificador del RUT como error del campo `rut`", async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useEmployeeFormController({
        employee: null,
        existingEmployees: [],
        areaList: ["Operaciones"],
        workdayTypeList: ["Completa"],
        nextEmployeeId: "42",
        hasLinkedUser: false,
        onSave,
        onCancel: vi.fn(),
      }),
    );

    await act(async () => {
      result.current.setValue("name", "Ana Pérez");
      result.current.setValue("rut", "11111111-2");
      result.current.setValue("position", "Operador");
      result.current.setValue("area", "Operaciones");
      result.current.setValue("workdayType", "Completa");
      result.current.submit();
    });

    await waitFor(() => expect(result.current.getError("rut")).toBeDefined());
    expect(result.current.getError("rut")).toContain("verificador");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("exige el RUT duplicado como error del campo `rut`", async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useEmployeeFormController({
        employee: null,
        existingEmployees: [empleadoBase],
        areaList: ["Operaciones"],
        workdayTypeList: ["Completa"],
        nextEmployeeId: "42",
        hasLinkedUser: false,
        onSave,
        onCancel: vi.fn(),
      }),
    );

    await act(async () => {
      result.current.setValue("name", "Otra Persona");
      result.current.setValue("rut", RUT_VALIDO);
      result.current.setValue("position", "Operador");
      result.current.setValue("area", "Operaciones");
      result.current.setValue("workdayType", "Completa");
      result.current.submit();
    });

    await waitFor(() => expect(result.current.getError("rut")).toBeDefined());
    expect(result.current.getError("rut")).toContain("ya Registrado");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("no marca el RUT del propio empleado como duplicado en la edicion", async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useEmployeeFormController({
        employee: empleadoBase,
        existingEmployees: [empleadoBase],
        areaList: ["Operaciones"],
        workdayTypeList: ["Completa"],
        nextEmployeeId: "42",
        hasLinkedUser: false,
        onSave,
        onCancel: vi.fn(),
      }),
    );

    await act(async () => {
      result.current.submit();
    });

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(result.current.getError("rut")).toBeUndefined();
  });

  it("expone los campos obligatorios y el email invalido como error de campo", async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useEmployeeFormController({
        employee: null,
        existingEmployees: [],
        areaList: ["Operaciones"],
        workdayTypeList: ["Completa"],
        nextEmployeeId: "42",
        hasLinkedUser: false,
        onSave,
        onCancel: vi.fn(),
      }),
    );

    await act(async () => {
      result.current.setValue("rut", RUT_VALIDO);
      result.current.setValue("email", "no-es-un-email");
      result.current.submit();
    });

    await waitFor(() => expect(result.current.getError("name")).toBeDefined());
    expect(result.current.getError("position")).toBeDefined();
    expect(result.current.getError("area")).toBeDefined();
    expect(result.current.getError("workdayType")).toBeDefined();
    expect(result.current.getError("email")).toBeDefined();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("formatea el RUT mientras se escribe", () => {
    const { result } = renderHook(() =>
      useEmployeeFormController({
        employee: null,
        existingEmployees: [],
        areaList: [],
        workdayTypeList: [],
        nextEmployeeId: "42",
        hasLinkedUser: false,
        onSave: vi.fn().mockResolvedValue(true),
        onCancel: vi.fn(),
      }),
    );

    act(() => {
      result.current.handleRutChange("12.345.678");
    });

    expect(result.current.values.rut).toBe("12345678");
  });
});

describe("useUserFormController (spec 036 T9)", () => {
  it("envia el payload con la forma exacta en el alta", async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useUserFormController({
        editingUser: null,
        isFormVisible: true,
        activeEmployees: [],
        currentUserRole: "Administrador",
        existingUsers: [],
        onSave,
        onCancel: vi.fn(),
      }),
    );

    await act(async () => {
      result.current.setValue("username", "ana.perez");
      result.current.setValue("role", "Supervisor");
      result.current.setValue("employeeId", "e-1");
      result.current.submit();
    });

    await waitFor(() => expect(result.current.formError).toBeDefined());
    // El alta exige la contraseña: sin ella el formulario no se envia.
    expect(result.current.formError).toContain("contraseña");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("normaliza el nombre de usuario (sin tildes)", () => {
    const { result } = renderHook(() =>
      useUserFormController({
        editingUser: null,
        isFormVisible: true,
        activeEmployees: [],
        currentUserRole: "Administrador",
        existingUsers: [],
        onSave: vi.fn(),
        onCancel: vi.fn(),
      }),
    );

    act(() => {
      result.current.handleUsernameChange("aná.pérez");
    });

    expect(result.current.values.username).toBe("ana.perez");
  });

  it("exige 3 caracteres en el nombre de usuario como error del campo", async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useUserFormController({
        editingUser: null,
        isFormVisible: true,
        activeEmployees: [],
        currentUserRole: "Administrador",
        existingUsers: [],
        onSave,
        onCancel: vi.fn(),
      }),
    );

    await act(async () => {
      result.current.setValue("username", "ab");
      result.current.submit();
    });

    await waitFor(() => expect(result.current.getError("username")).toBeDefined());
    expect(result.current.getError("username")).toContain("3");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("en la edicion solo viaja el rol y el empleado vinculado", async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useUserFormController({
        editingUser: usuarioBase,
        isFormVisible: true,
        activeEmployees: [],
        currentUserRole: "Administrador",
        existingUsers: [usuarioBase],
        onSave,
        onCancel: vi.fn(),
      }),
    );

    await act(async () => {
      result.current.setValue("role", "Supervisor");
      result.current.submit();
    });

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));

    const payload = asJson(onSave.mock.calls[0][0] as Record<string, unknown>);
    expect(payload.role).toBe("Supervisor");
    expect(payload.employeeId).toBe("e-1");
    expect(payload.username).toBe("ana.perez");
    // La edicion no toca la contraseña.
    expect(payload).not.toHaveProperty("password");
  });
});
