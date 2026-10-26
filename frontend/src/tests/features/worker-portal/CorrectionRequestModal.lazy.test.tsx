import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CorrectionRequestModal } from "../../../features/worker-portal";

const { useCorrectionRequestModalControllerMock } = vi.hoisted(() => ({
  useCorrectionRequestModalControllerMock: vi.fn<() => Record<string, unknown>>(() => ({})),
}));

vi.mock("../../../features/worker-portal/hooks/useCorrectionRequestModalController", () => ({
  useCorrectionRequestModalController: useCorrectionRequestModalControllerMock,
}));

describe("CorrectionRequestModal diferido", () => {
  beforeEach(() => {
    useCorrectionRequestModalControllerMock.mockReturnValue({
      attachment: null,
      attachmentLabel: "Subir archivo (PDF, PNG, JPG)",
      handleFileChange: vi.fn(),
      handleRequestedValueChange: vi.fn(),
      handleReasonChange: vi.fn(),
      values: { requestedValue: "2026-10-23T09:00", reason: "" },
      getError: vi.fn(() => undefined),
      isSubmitting: false,
      formProps: {
        id: "correction-request-form",
        noValidate: true,
        onSubmit: vi.fn(),
        "data-app-form": "correctionRequestForm",
      },
      maxRequestedValue: "2026-10-24T09:00",
      originalValue: "2026-10-23T08:00:00.000Z",
    });
  });

  it("carga y muestra el formulario del registro al montarse, sin enviarlo", async () => {
    const onClose = vi.fn();
    const record = {
      id: "record-1",
      employeeId: "employee-1",
      employeeName: "Ana",
      employeePosition: "Operadora",
      employeeArea: "Planta",
      employeeWorkdayType: "Full",
      date: "2026-10-23",
      status: "Laborando" as const,
      entrada: "2026-10-23T08:00:00.000Z",
      lastModified: 0,
      syncStatus: "synced" as const,
      isDeleted: false,
    };

    render(<CorrectionRequestModal isOpen onClose={onClose} record={record} field="entrada" />);

    expect(
      await screen.findByRole("heading", { name: "Solicitud de Corrección" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Inicio de Jornada")).toBeInTheDocument();
    expect(screen.getByLabelText("Nuevo Valor Solicitado")).toHaveValue("2026-10-23T09:00");
    expect(useCorrectionRequestModalControllerMock).toHaveBeenCalledWith({
      isOpen: true,
      onClose,
      record,
      field: "entrada",
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
