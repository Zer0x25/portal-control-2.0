import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

import { useNoveltyFormController } from "../../features/logbook/hooks/useNoveltyFormController";
import { useSupplierFormController } from "../../features/logbook/hooks/useSupplierFormController";
import { useRejectionReasonController } from "../../features/supervisor-dashboard/hooks/useRejectionReasonController";
import type { SupplierEntry } from "../../types/index";

/**
 * Spec 036 T10 (AC1, AC2, AC3, AC4, AC8): los formularios de **novedad**,
 * **acceso vehicular** y **motivo de rechazo** migrados a `useAppForm`.
 *
 * Lo que se fija aqui es lo que la migracion puede romper en silencio:
 *
 * 1. **El payload** sigue siendo identico al de antes (T13): la novedad
 *    entrega anotacion y hora por separado, el acceso vehicular entrega sus
 *    seis campos y el rechazo entrega **solo** el motivo.
 * 2. **Los errores** son de campo y tienen mensaje (AC2, AC3): los campos
 *    obligatorios, el formato de la hora y el de la patente.
 * 3. **El doble envio** esta bloqueado (AC4).
 */

const asJson = (payload: Record<string, unknown>): Record<string, unknown> =>
  JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;

const registroBase: SupplierEntry = {
  id: "s-1",
  time: "08:30",
  licensePlate: "AB-12-CD",
  driverName: "Juan Pérez",
  paxCount: 2,
  company: "Transportes SPA",
  reason: "Carga de mercadería",
  timestamp: 0,
};

describe("useNoveltyFormController (spec 036 T10)", () => {
  it("entrega la anotacion y la hora con la forma exacta", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useNoveltyFormController({
        isOpen: true,
        initialText: "",
        initialTime: "09:15",
        onSave,
      }),
    );

    await act(async () => {
      result.current.handleAnnotationChange("  Se activo la alarma de incendio  ");
      result.current.submit();
    });

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith("Se activo la alarma de incendio", "09:15");
  });

  it("exige la anotacion como error del campo `annotation`", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useNoveltyFormController({
        isOpen: true,
        initialText: "",
        initialTime: "09:15",
        onSave,
      }),
    );

    await act(async () => {
      result.current.submit();
    });

    await waitFor(() => expect(result.current.getError("annotation")).toBeDefined());
    expect(onSave).not.toHaveBeenCalled();
  });

  it("exige la hora con formato HH:mm como error del campo `time`", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useNoveltyFormController({
        isOpen: true,
        initialText: "",
        initialTime: "9:15",
        onSave,
      }),
    );

    await act(async () => {
      result.current.handleAnnotationChange("Prueba");
      result.current.submit();
    });

    await waitFor(() => expect(result.current.getError("time")).toBeDefined());
    expect(result.current.getError("time")).toContain("HH:mm");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("bloquea el doble envio", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useNoveltyFormController({
        isOpen: true,
        initialText: "Algo paso",
        initialTime: "09:15",
        onSave,
      }),
    );

    await act(async () => {
      result.current.submit();
      result.current.submit();
    });

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  });
});

describe("useSupplierFormController (spec 036 T10)", () => {
  it("entrega los seis campos con la forma exacta", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useSupplierFormController({
        isOpen: true,
        initialData: null,
        onSave,
      }),
    );

    await act(async () => {
      result.current.handleLicensePlateChange("ab12cd");
      result.current.handleDriverNameChange(" Juan Pérez ");
      result.current.handleCompanyChange("Transportes SPA");
      result.current.handleReasonChange("Carga de mercadería");
      result.current.handlePaxCountChange("3");
      result.current.handleTimeChange("08:30");
      result.current.submit();
    });

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const payload = asJson(onSave.mock.calls[0][0] as Record<string, unknown>);
    expect(Object.keys(payload).sort()).toEqual(
      ["company", "driverName", "licensePlate", "paxCount", "reason", "time"].sort(),
    );
    expect(payload.licensePlate).toBe("AB-12-CD");
    expect(payload.driverName).toBe("Juan Pérez");
    expect(payload.paxCount).toBe(3);
    expect(payload.time).toBe("08:30");
  });

  it("exige los campos obligatorios como error de campo", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useSupplierFormController({
        isOpen: true,
        initialData: null,
        onSave,
      }),
    );

    await act(async () => {
      result.current.submit();
    });

    await waitFor(() => expect(result.current.getError("licensePlate")).toBeDefined());
    expect(result.current.getError("driverName")).toBeDefined();
    expect(result.current.getError("company")).toBeDefined();
    expect(result.current.getError("reason")).toBeDefined();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("la hora del ingreso viene precargada y exige el formato HH:mm", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useSupplierFormController({
        isOpen: true,
        initialData: null,
        onSave,
      }),
    );

    // La hora actual se precarga al abrir (el registro nuevo se inicia con la
    // hora de entrada).
    expect(result.current.values.time).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);

    await act(async () => {
      result.current.handleTimeChange("8:30");
      result.current.submit();
    });

    await waitFor(() => expect(result.current.getError("time")).toBeDefined());
    expect(result.current.getError("time")).toContain("HH:mm");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("la patente se formatea con la mascara de la pantalla", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useSupplierFormController({
        isOpen: true,
        initialData: null,
        onSave,
      }),
    );

    await act(async () => {
      result.current.handleLicensePlateChange("ab12cd34");
    });

    expect(result.current.values.licensePlate).toBe("AB-12-CD");
  });

  it("carga los datos del registro en edicion", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useSupplierFormController({
        isOpen: true,
        initialData: registroBase,
        onSave,
      }),
    );

    expect(result.current.values.licensePlate).toBe("AB-12-CD");
    expect(result.current.values.driverName).toBe("Juan Pérez");
    expect(result.current.values.paxCount).toBe(2);
    expect(result.current.values.time).toBe("08:30");
  });

  it("bloquea el doble envio", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useSupplierFormController({
        isOpen: true,
        initialData: registroBase,
        onSave,
      }),
    );

    await act(async () => {
      result.current.submit();
      result.current.submit();
    });

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  });
});

describe("useRejectionReasonController (spec 036 T10)", () => {
  it("entrega solo el motivo", async () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() =>
      useRejectionReasonController({
        isOpen: true,
        onConfirm,
      }),
    );

    await act(async () => {
      result.current.handleReasonChange("  Falta el respaldo del turno  ");
      result.current.submit();
    });

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onConfirm).toHaveBeenCalledWith("Falta el respaldo del turno");
  });

  it("exige el motivo como error del campo `rejectionReason`", async () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() =>
      useRejectionReasonController({
        isOpen: true,
        onConfirm,
      }),
    );

    await act(async () => {
      result.current.submit();
    });

    await waitFor(() => expect(result.current.getError("rejectionReason")).toBeDefined());
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("bloquea el doble envio", async () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() =>
      useRejectionReasonController({
        isOpen: true,
        onConfirm,
      }),
    );

    await act(async () => {
      result.current.handleReasonChange("Motivo");
      result.current.submit();
      result.current.submit();
    });

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });
});
