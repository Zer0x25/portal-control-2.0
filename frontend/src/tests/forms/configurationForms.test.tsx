import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

import { useSeedingOptionsController } from "../../features/configuration/hooks/useSeedingOptionsController";
import { useEmailCenterController } from "../../features/configuration/hooks/useEmailCenterController";
import { emailService } from "../../services/emailService";
import { useEmailRecipientsListQuery } from "../../hooks/queries/useConfigQuery";

/**
 * Spec 036 T10b (AC1, AC2, AC3, AC4, AC8): los formularios de **simulacion de
 * datos** y de **correo de prueba** migrados a `useAppForm`.
 *
 * Lo que se fija aqui es lo que la migracion puede romper en silencio:
 *
 * 1. **El payload** sigue siendo identico al de antes (T13): los siete
 *    numeros de la simulacion y el trio `{to, subject, message}` del correo.
 * 2. **Los errores** son de campo y tienen mensaje (AC2, AC3): los rangos de
 *    la simulacion y los campos obligatorios del correo.
 * 3. **El doble envio** esta bloqueado (AC4).
 */

vi.mock("../../services/emailService", () => ({
  emailService: {
    verifyStatus: vi.fn(),
    getRules: vi.fn(),
    sendTestEmail: vi.fn(),
    saveRules: vi.fn(),
  },
}));

vi.mock("../../hooks/queries/useConfigQuery", () => ({
  useEmailRecipientsListQuery: vi.fn(),
}));

const asJson = (payload: Record<string, unknown>): Record<string, unknown> =>
  JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;

describe("useSeedingOptionsController (spec 036 T10b)", () => {
  it("entrega los siete numeros con la forma exacta", async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    const { result } = renderHook(() => useSeedingOptionsController({ onClose, onConfirm }));

    await act(async () => {
      result.current.handleNumberChange("employees", "42");
      result.current.handleNumberChange("days", "30");
      result.current.submit();
    });

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    const payload = asJson(onConfirm.mock.calls[0][0] as Record<string, unknown>);
    expect(Object.keys(payload).sort()).toEqual(
      [
        "basePatternsCount",
        "correctionRequestRatio",
        "days",
        "employees",
        "leaveRatio",
        "quickNotesCount",
        "shiftReportsPerDay",
      ].sort(),
    );
    expect(payload.employees).toBe(42);
    expect(payload.days).toBe(30);
    expect(onClose).toHaveBeenCalled();
  });

  it("exige al menos un empleado y un dia como error de campo", async () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() =>
      useSeedingOptionsController({ onClose: vi.fn(), onConfirm }),
    );

    await act(async () => {
      result.current.handleNumberChange("employees", "0");
      result.current.handleNumberChange("days", "0");
      result.current.submit();
    });

    await waitFor(() => expect(result.current.getError("employees")).toBeDefined());
    expect(result.current.getError("days")).toBeDefined();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("exige los rangos de la pantalla como error de campo", async () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() =>
      useSeedingOptionsController({ onClose: vi.fn(), onConfirm }),
    );

    await act(async () => {
      result.current.handleNumberChange("leaveRatio", "120");
      result.current.handleNumberChange("shiftReportsPerDay", "9");
      result.current.submit();
    });

    await waitFor(() => expect(result.current.getError("leaveRatio")).toBeDefined());
    expect(result.current.getError("shiftReportsPerDay")).toBeDefined();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("los presets reinician el formulario", async () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() =>
      useSeedingOptionsController({ onClose: vi.fn(), onConfirm }),
    );

    await act(async () => {
      result.current.handleNumberChange("employees", "999");
      result.current.applyQuickSeedPreset();
    });

    expect(result.current.values.employees).toBe(15);
    expect(result.current.values.days).toBe(3);

    await act(async () => {
      result.current.applyIncrementalPreset();
    });

    expect(result.current.incrementalLevel).toBe(1);
    expect(result.current.values.employees).toBe(15);

    await act(async () => {
      result.current.applyIncrementalPreset();
    });

    expect(result.current.incrementalLevel).toBe(2);
    expect(result.current.values.employees).toBe(30);
  });

  it("bloquea el doble envio", async () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() =>
      useSeedingOptionsController({ onClose: vi.fn(), onConfirm }),
    );

    await act(async () => {
      result.current.submit();
      result.current.submit();
    });

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });
});

describe("useEmailCenterController (spec 036 T10b)", () => {
  beforeEach(() => {
    vi.mocked(useEmailRecipientsListQuery).mockReturnValue({
      data: ["admin@portal.test"],
      isLoading: false,
    } as never);
    vi.mocked(emailService.verifyStatus).mockResolvedValue({
      success: true,
      message: "Operativo",
    });
    vi.mocked(emailService.getRules).mockResolvedValue({
      autoCloseShift: { enabled: false, recipient: "" },
      latenessOver15: { enabled: false, recipient: "" },
      latenessOver60: { enabled: false, recipient: "" },
    });
    vi.mocked(emailService.sendTestEmail).mockResolvedValue({
      success: true,
      message: "Correo enviado",
    });
  });

  it("envia el correo de prueba con el trio to/subject/message", async () => {
    const { result } = renderHook(() => useEmailCenterController());

    await act(async () => {
      result.current.handleManualEmailChange("to", "admin@portal.test");
      result.current.handleManualEmailChange("subject", "Prueba");
      result.current.handleManualEmailChange("message", "Mensaje");
      result.current.handleManualSend();
    });

    await waitFor(() => expect(emailService.sendTestEmail).toHaveBeenCalledTimes(1));
    expect(emailService.sendTestEmail).toHaveBeenCalledWith(
      "admin@portal.test",
      "Prueba",
      "Mensaje",
    );
  });

  it("exige el destinatario, el asunto y el mensaje como error de campo", async () => {
    const { result } = renderHook(() => useEmailCenterController());

    await act(async () => {
      result.current.handleManualEmailChange("to", "no-es-un-correo");
      result.current.handleManualSend();
    });

    await waitFor(() => expect(result.current.getManualEmailError("to")).toBeDefined());
    expect(result.current.getManualEmailError("subject")).toBeDefined();
    expect(result.current.getManualEmailError("message")).toBeDefined();
    expect(emailService.sendTestEmail).not.toHaveBeenCalled();
  });

  it("bloquea el doble envio", async () => {
    const { result } = renderHook(() => useEmailCenterController());

    await act(async () => {
      result.current.handleManualEmailChange("to", "admin@portal.test");
      result.current.handleManualEmailChange("subject", "Prueba");
      result.current.handleManualEmailChange("message", "Mensaje");
      result.current.handleManualSend();
      result.current.handleManualSend();
    });

    await waitFor(() => expect(emailService.sendTestEmail).toHaveBeenCalledTimes(1));
  });
});
