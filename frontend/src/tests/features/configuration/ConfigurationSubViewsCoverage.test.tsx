import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MasterDataExportView } from "../../../features/configuration/views/MasterDataExport.view";
import { EmailCenterView } from "../../../features/configuration/views/EmailCenter.view";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      layout: _layout,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { layout?: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../../components/ui/DatePickerDialog", () => ({
  default: () => <div data-testid="date-picker-dialog">DATE-PICKER</div>,
}));

vi.mock("../../../components/ui/SmtpConfigModal", () => ({
  default: () => <div data-testid="smtp-config-modal">SMTP-CONFIG-MODAL</div>,
}));

describe("Configuration SubViews Coverage (Tanda 5)", () => {
  it("renders MasterDataExportView wrapped with canonical Container", () => {
    const handleExport = vi.fn();
    render(
      <MasterDataExportView
        startDate="2026-03-01"
        endDate="2026-03-31"
        isStartDatePickerOpen={false}
        isEndDatePickerOpen={false}
        exporting={false}
        todayStr="2026-03-15"
        setEndDate={vi.fn()}
        setIsStartDatePickerOpen={vi.fn()}
        setIsEndDatePickerOpen={vi.fn()}
        handleStartDateChange={vi.fn()}
        handleExport={handleExport}
      />,
    );

    expect(screen.getByTestId("page-container")).toBeInTheDocument();
    expect(screen.getByText("Módulo de Exportación")).toBeInTheDocument();
    expect(screen.getByText("Server: Online")).toBeInTheDocument();

    const csvButton = screen.getByRole("button", { name: /Planilla Operativa \(CSV\)/i });
    fireEvent.click(csvButton);
    expect(handleExport).toHaveBeenCalledWith("csv");
  });

  it("renders EmailCenterView wrapped with canonical Container", () => {
    const checkStatus = vi.fn();
    render(
      <EmailCenterView
        emailRecipientsList={["admin@portal.test"]}
        isEmailListLoading={false}
        status={{ loading: false, success: true, message: "OK" }}
        manualEmail={{ to: "test@example.com", subject: "Prueba", message: "Mensaje" }}
        isSending={false}
        isConfigModalOpen={false}
        rules={
          {
            autoCloseShift: { enabled: true, recipient: "admin@portal.test" },
            latenessOver15: { enabled: true, recipient: "admin@portal.test" },
            latenessOver60: { enabled: false, recipient: "admin@portal.test" },
          } as never
        }
        isLoadingRules={false}
        setManualEmail={vi.fn()}
        setIsConfigModalOpen={vi.fn()}
        checkStatus={checkStatus}
        handleRuleChange={vi.fn()}
        handleManualSend={vi.fn()}
        handleSaveRules={vi.fn()}
        handleCloseConfigModal={vi.fn()}
      />,
    );

    expect(screen.getByTestId("page-container")).toBeInTheDocument();
    expect(screen.getByText("Configurar SMTP")).toBeInTheDocument();
    expect(screen.getByText("Verificar")).toBeInTheDocument();
    expect(screen.getByText("SERVICIO NOMINAL")).toBeInTheDocument();

    const verifyButton = screen.getByRole("button", { name: /Verificar/i });
    fireEvent.click(verifyButton);
    expect(checkStatus).toHaveBeenCalled();
  });
});
