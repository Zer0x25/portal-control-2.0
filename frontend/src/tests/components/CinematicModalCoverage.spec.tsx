import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import KpiDetailsModal from "../../features/supervisor-dashboard/components/KpiDetailsModal";
import SingleMeterInputModal from "../../features/meters/components/SingleMeterInputModal.container";
import AuditLogDetailDrawer from "../../features/governance/components/AuditLogDetailDrawer";
import ForceChangePasswordModalView from "../../features/auth/components/ForceChangePasswordModal.view";
import type { AuditLog, DailyTimeRecord, MeterConfig } from "../../types";

/**
 * Spec 031 T2/T3 (AC2): los modales de feature cumplen el estándar de
 * disponibilidad a11y de CinematicModal — role="dialog" nombrado,
 * aria-modal="true", Escape cuando procede (los modales bloqueantes no
 * se cierran con Escape) y focus trap con retorno.
 */

vi.mock("../../hooks/useMeterReadings", () => ({
  useMeterReadings: () => ({ readings: [], addReading: vi.fn(async () => true) }),
}));

vi.mock("../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: vi.fn() }),
}));

function assertDialogAccessible(name: string) {
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveAttribute("aria-modal", "true");
  const labelledBy = dialog.getAttribute("aria-labelledby");
  const labelText = labelledBy
    ? (document.getElementById(labelledBy)?.textContent ?? "")
    : (dialog.getAttribute("aria-label") ?? "");
  expect(labelText).toContain(name);
}

function dialogHasFocus() {
  expect(document.activeElement?.getAttribute("role")).toBe("dialog");
}

describe("Cobertura del estándar de modal (spec 031 AC2)", () => {
  it("KpiDetailsModal: dialog accesible, Escape y focus trap", () => {
    const onClose = vi.fn();
    const record = {
      id: "r1",
      employeeName: "Ana Soto",
      entrada: "2026-10-20T08:35:00.000Z",
    } as unknown as DailyTimeRecord;
    render(
      <KpiDetailsModal
        isOpen
        onClose={onClose}
        title="Atrasos detectados"
        dataType="record"
        data={[record]}
      />,
    );

    assertDialogAccessible("Atrasos detectados");
    dialogHasFocus();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    // Tab desde el último botón envuelve al primero (close icon-only).
    const finish = screen.getByText("Finalizar Revisión");
    finish.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Cerrar");
  });

  it("SingleMeterInputModal: dialog accesible, Escape y focus trap", () => {
    const onClose = vi.fn();
    const meter = {
      id: "m1",
      name: "Websensor 1",
      type: "PERCENT",
      unit: "%",
    } as unknown as MeterConfig;
    render(<SingleMeterInputModal isOpen onClose={onClose} meterConfig={meter} />);

    assertDialogAccessible("Nueva Lectura");
    dialogHasFocus();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    const submit = screen.getByText("Guardar Lectura");
    submit.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Cerrar");
  });

  it("AuditLogDetailDrawer: dialog accesible, Escape y focus trap", () => {
    const onClose = vi.fn();
    const log = {
      id: "log-0001-abcdef",
      actorUsername: "admin",
      timestamp: "2026-10-20T10:00:00.000Z",
      category: "AUTH",
      action: "LOGIN",
      ipAddress: "127.0.0.1",
      severity: "CRITICAL",
      details: { valor: { oldValue: 1, newValue: 2 } },
    } as unknown as AuditLog;
    render(<AuditLogDetailDrawer log={log} onClose={onClose} />);

    assertDialogAccessible("Detalle de evento");
    dialogHasFocus();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    // Único botón enfocable: el Tab envuelve sobre sí mismo.
    const close = screen.getByLabelText("Cerrar detalle");
    close.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(close);
  });

  it("ForceChangePasswordModalView: modal bloqueante accesible con focus trap (sin Escape)", () => {
    render(
      <ForceChangePasswordModalView
        isOpen
        newPassword=""
        confirmPassword=""
        isLoading={false}
        onSetNewPassword={() => undefined}
        onSetConfirmPassword={() => undefined}
        onSave={(e) => e.preventDefault()}
      />,
    );

    assertDialogAccessible("Cambio de Contraseña Requerido");
    dialogHasFocus();

    // Modal bloqueante: sin botón de cierre y Escape no descarta (la vista no
    // ofrece onClose). El Tab envuelve del último al primer campo.
    expect(screen.queryByLabelText("Cerrar")).toBeNull();
    const submit = screen.getByText(/^Establecer Nueva Contraseña$/);
    submit.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    const submitNode = submit;
    expect(document.activeElement).not.toBe(submitNode);
  });

  it("PdfExportModeModal (extraído de ReportsTab): dialog accesible, Escape y focus trap", async () => {
    const PdfExportModeModal = (
      await import("../../features/supervisor-dashboard/components/PdfExportModeModal")
    ).default;
    const onClose = vi.fn();
    render(
      <PdfExportModeModal
        isOpen
        onClose={onClose}
        onExportSummary={vi.fn(async () => undefined)}
        onExportCompiled={vi.fn(async () => undefined)}
      />,
    );

    assertDialogAccessible("Arquitectura Documental");
    dialogHasFocus();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    const cancel = screen.getByText(/\[ CANCELAR OPERACIÓN \]/);
    cancel.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Cerrar");
  });
});
